from unittest.mock import MagicMock, patch

import pytest

from mhq.exapi.jira import (
    JiraApiError,
    JiraApiService,
    JiraRateLimitExceeded,
)

# CLUSTOX: Jira integration, Phase 2 (issue sync). See
# docs/JIRA_INTEGRATION_PROPOSAL.md.


def _service() -> JiraApiService:
    return JiraApiService(
        email="jordan@mycompany.com",
        api_token="tok",
        site_url="mycompany.atlassian.net",
    )


def _response(status_code=200, json_data=None, text="", headers=None):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data or {}
    response.text = text
    response.headers = headers or {}
    return response


def _issue(issue_id="1", key="PAY-1", histories=None):
    return {
        "id": issue_id,
        "key": key,
        "fields": {
            "summary": "Fix refund rounding",
            "status": {
                "name": "In Progress",
                "statusCategory": {"name": "In Progress"},
            },
            "issuetype": {"name": "Bug"},
            "created": "2024-01-01T10:00:00.000+0000",
            "updated": "2024-01-02T10:00:00.000+0000",
        },
        "changelog": {"histories": histories or []},
    }


class TestCheckPat:
    @patch("mhq.exapi.jira.requests.get")
    def test_returns_true_on_200(self, mock_get):
        mock_get.return_value = _response(200)
        assert _service().check_pat() is True

    @patch("mhq.exapi.jira.requests.get")
    def test_returns_false_on_anything_else(self, mock_get):
        mock_get.return_value = _response(401)
        assert _service().check_pat() is False


class TestSearchIssues:
    @patch("mhq.exapi.jira.requests.post")
    def test_posts_jql_and_expand_changelog_to_the_new_search_endpoint(self, mock_post):
        mock_post.return_value = _response(200, {"issues": []})

        _service().search_issues("project = PAY")

        url, kwargs = mock_post.call_args
        assert url[0] == "https://mycompany.atlassian.net/rest/api/3/search/jql"
        assert kwargs["json"]["jql"] == "project = PAY"
        assert kwargs["json"]["expand"] == "changelog"
        assert "nextPageToken" not in kwargs["json"]

    @patch("mhq.exapi.jira.requests.post")
    def test_includes_next_page_token_when_given(self, mock_post):
        mock_post.return_value = _response(200, {"issues": []})

        _service().search_issues("project = PAY", next_page_token="abc")

        _, kwargs = mock_post.call_args
        assert kwargs["json"]["nextPageToken"] == "abc"

    @patch("mhq.exapi.jira.requests.post")
    def test_raises_rate_limit_error_on_429_with_retry_after(self, mock_post):
        mock_post.return_value = _response(429, headers={"Retry-After": "30"})

        with pytest.raises(JiraRateLimitExceeded) as exc_info:
            _service().search_issues("project = PAY")
        assert exc_info.value.retry_after == "30"

    @pytest.mark.parametrize("status", [401, 403])
    @patch("mhq.exapi.jira.requests.post")
    def test_raises_api_error_on_auth_failure(self, mock_post, status):
        mock_post.return_value = _response(status)

        with pytest.raises(JiraApiError) as exc_info:
            _service().search_issues("project = PAY")
        assert exc_info.value.status_code == status

    @patch("mhq.exapi.jira.requests.post")
    def test_raises_api_error_on_other_failures(self, mock_post):
        mock_post.return_value = _response(500, text="boom")

        with pytest.raises(JiraApiError):
            _service().search_issues("project = PAY")


class TestGetAllIssues:
    @patch("mhq.exapi.jira.requests.post")
    def test_stops_when_there_is_no_next_page_token(self, mock_post):
        mock_post.return_value = _response(200, {"issues": [_issue("1"), _issue("2")]})

        issues = _service().get_all_issues("project = PAY")

        assert [i.id for i in issues] == ["1", "2"]
        mock_post.assert_called_once()

    @patch("mhq.exapi.jira.requests.post")
    def test_pages_until_the_token_runs_out(self, mock_post):
        mock_post.side_effect = [
            _response(200, {"issues": [_issue("1")], "nextPageToken": "page2"}),
            _response(200, {"issues": [_issue("2")]}),
        ]

        issues = _service().get_all_issues("project = PAY")

        assert [i.id for i in issues] == ["1", "2"]
        assert mock_post.call_count == 2

    @patch("mhq.exapi.jira.requests.post")
    def test_stops_on_an_empty_page_even_if_a_token_is_somehow_present(self, mock_post):
        # Defensive: an empty `issues` page should halt pagination
        # regardless of what nextPageToken says, so a misbehaving/unclear
        # response can't spin this into an infinite loop.
        mock_post.return_value = _response(
            200, {"issues": [], "nextPageToken": "page2"}
        )

        issues = _service().get_all_issues("project = PAY")

        assert issues == []
        mock_post.assert_called_once()

    @patch("mhq.exapi.jira.requests.post")
    def test_parses_changelog_status_transitions(self, mock_post):
        histories = [
            {
                "id": "100",
                "created": "2024-01-01T12:00:00.000+0000",
                "items": [
                    {
                        "field": "status",
                        "fromString": "To Do",
                        "toString": "In Progress",
                    }
                ],
            },
            # Not a status change -- should be dropped, not turned into a
            # transition with a null to_status.
            {
                "id": "101",
                "created": "2024-01-01T13:00:00.000+0000",
                "items": [{"field": "assignee", "toString": "Jordan"}],
            },
        ]
        mock_post.return_value = _response(
            200, {"issues": [_issue("1", histories=histories)]}
        )

        issues = _service().get_all_issues("project = PAY")

        assert len(issues[0].changelog) == 1
        transition = issues[0].changelog[0]
        assert transition.from_status == "To Do"
        assert transition.to_status == "In Progress"
        assert transition.idempotency_key == "100"


# CLUSTOX: Jira integration -- the Sprint rollup chart. See
# docs/JIRA_INTEGRATION_PROPOSAL.md §6D.
class TestGetBoardsForProject:
    @patch("mhq.exapi.jira.requests.get")
    def test_maps_every_board_field(self, mock_get):
        mock_get.return_value = _response(
            200,
            {
                "isLast": True,
                "values": [{"id": 1076, "name": "PZDA board", "type": "scrum"}],
            },
        )

        [board] = _service().get_boards_for_project("PZDA")

        assert board.id == 1076
        assert board.name == "PZDA board"
        assert board.board_type == "scrum"

    @patch("mhq.exapi.jira.requests.get")
    def test_paginates_via_start_at_until_is_last(self, mock_get):
        mock_get.side_effect = [
            _response(200, {"isLast": False, "values": [{"id": 1, "type": "scrum"}]}),
            _response(200, {"isLast": True, "values": [{"id": 2, "type": "scrum"}]}),
        ]

        boards = _service().get_boards_for_project("PZDA")

        assert [b.id for b in boards] == [1, 2]
        assert mock_get.call_args_list[1].kwargs["params"]["startAt"] == 1

    @patch("mhq.exapi.jira.requests.get")
    def test_returns_empty_list_when_the_project_has_no_boards(self, mock_get):
        mock_get.return_value = _response(200, {"isLast": True, "values": []})
        assert _service().get_boards_for_project("PZDA") == []


class TestGetSprintsForBoard:
    @patch("mhq.exapi.jira.requests.get")
    def test_maps_every_sprint_field_including_dates(self, mock_get):
        mock_get.return_value = _response(
            200,
            {
                "isLast": True,
                "values": [
                    {
                        "id": 299,
                        "name": "PZDA Sprint 1",
                        "state": "closed",
                        "startDate": "2026-07-20T07:55:00.130Z",
                        "endDate": "2026-08-03T05:00:00.000Z",
                    }
                ],
            },
        )

        [sprint] = _service().get_sprints_for_board(1076)

        assert sprint.id == 299
        assert sprint.name == "PZDA Sprint 1"
        assert sprint.state == "closed"
        assert sprint.start_date is not None
        assert sprint.end_date is not None

    @patch("mhq.exapi.jira.requests.get")
    def test_a_sprint_with_no_end_date_yet_does_not_error(self, mock_get):
        # A currently-active sprint's endDate can be absent/still open.
        mock_get.return_value = _response(
            200,
            {
                "isLast": True,
                "values": [
                    {
                        "id": 332,
                        "name": "Active sprint",
                        "state": "active",
                        "startDate": "2026-08-04T08:19:44.893Z",
                    }
                ],
            },
        )

        [sprint] = _service().get_sprints_for_board(1076)

        assert sprint.end_date is None


class TestGetSprintIssueCounts:
    @patch("mhq.exapi.jira.requests.get")
    def test_reads_total_from_each_response_without_fetching_issue_bodies(
        self, mock_get
    ):
        mock_get.side_effect = [
            _response(200, {"total": 355}),
            _response(200, {"total": 272}),
        ]

        planned, completed = _service().get_sprint_issue_counts(299)

        assert planned == 355
        assert completed == 272
        # maxResults=0 on both calls -- issue bodies are never requested.
        for call in mock_get.call_args_list:
            assert call.kwargs["params"]["maxResults"] == 0
        # The second call is the one scoped to done issues.
        assert (
            mock_get.call_args_list[1].kwargs["params"]["jql"]
            == "statusCategory = Done"
        )
        assert "jql" not in mock_get.call_args_list[0].kwargs["params"]
