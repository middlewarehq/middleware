from datetime import datetime
from unittest.mock import MagicMock

from mhq.exapi.models.jira import JiraIssue
from mhq.service.project.sync.etl_jira_handler import JiraETLHandler
from mhq.store.models.projects import OrgProject, Ticket, TicketState

# CLUSTOX: Jira integration, Phase 2 (issue sync). See
# docs/JIRA_INTEGRATION_PROPOSAL.md. Uses the real JiraIssue/
# JiraChangelogEntry parser (already covered by tests/exapi/test_jira.py)
# so this file stays focused on JiraETLHandler's own job: building the
# JQL, and reconciling ids against existing rows without a per-item query.

ORG_ID = "org-1"


def _org_project(project_id="proj-1", key="PAY") -> OrgProject:
    return OrgProject(id=project_id, org_id=ORG_ID, key=key, name="Payments")


def _issue(issue_id="1", key="PAY-1", status_history=None) -> JiraIssue:
    return JiraIssue(
        {
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
            "changelog": {"histories": status_history or []},
        }
    )


def _status_change(history_id="100", from_status="To Do", to_status="In Progress"):
    return {
        "id": history_id,
        "created": "2024-01-01T11:00:00.000+0000",
        "items": [
            {
                "field": "status",
                "fromString": from_status,
                "toString": to_status,
            }
        ],
    }


def _handler(api=None, project_repo_service=None) -> JiraETLHandler:
    return JiraETLHandler(
        ORG_ID, api or MagicMock(), project_repo_service or MagicMock()
    )


class TestCheckPatValidity:
    def test_delegates_to_the_api_client(self):
        api = MagicMock()
        api.check_pat.return_value = True

        assert _handler(api).check_pat_validity() is True
        api.check_pat.assert_called_once()


class TestGetProjectIssuesData:
    def test_builds_jql_scoped_to_the_project_key_and_bookmark(self):
        api = MagicMock()
        api.get_all_issues.return_value = []
        org_project = _org_project(key="PAY")
        bookmark = datetime(2024, 1, 1, 9, 30)

        _handler(api).get_project_issues_data(org_project, bookmark)

        jql = api.get_all_issues.call_args[0][0]
        assert 'project = "PAY"' in jql
        assert '"2024-01-01 09:30"' in jql

    def test_returns_empty_lists_without_any_batch_lookup_when_nothing_changed(self):
        api = MagicMock()
        api.get_all_issues.return_value = []
        repo = MagicMock()

        tickets, states = _handler(api, repo).get_project_issues_data(
            _org_project(), datetime(2024, 1, 1)
        )

        assert tickets == []
        assert states == []
        repo.get_tickets_by_idempotency_keys.assert_not_called()

    def test_reuses_the_existing_tickets_id_when_the_idempotency_key_already_exists(
        self,
    ):
        api = MagicMock()
        api.get_all_issues.return_value = [_issue("1")]
        existing = Ticket(id="existing-ticket-id", idempotency_key=f"jira:{ORG_ID}:1")
        repo = MagicMock()
        repo.get_tickets_by_idempotency_keys.return_value = [existing]
        repo.get_ticket_states_by_idempotency_keys.return_value = []

        tickets, _ = _handler(api, repo).get_project_issues_data(
            _org_project(), datetime(2024, 1, 1)
        )

        assert len(tickets) == 1
        assert str(tickets[0].id) == "existing-ticket-id"
        assert tickets[0].idempotency_key == f"jira:{ORG_ID}:1"

    def test_mints_a_new_id_for_a_ticket_never_seen_before(self):
        api = MagicMock()
        api.get_all_issues.return_value = [_issue("1")]
        repo = MagicMock()
        repo.get_tickets_by_idempotency_keys.return_value = []
        repo.get_ticket_states_by_idempotency_keys.return_value = []

        tickets, _ = _handler(api, repo).get_project_issues_data(
            _org_project(), datetime(2024, 1, 1)
        )

        assert len(tickets) == 1
        assert tickets[0].id is not None

    def test_does_one_batch_lookup_for_all_tickets_in_the_page_not_one_per_ticket(
        self,
    ):
        api = MagicMock()
        api.get_all_issues.return_value = [_issue("1"), _issue("2"), _issue("3")]
        repo = MagicMock()
        repo.get_tickets_by_idempotency_keys.return_value = []
        repo.get_ticket_states_by_idempotency_keys.return_value = []

        _handler(api, repo).get_project_issues_data(
            _org_project(), datetime(2024, 1, 1)
        )

        repo.get_tickets_by_idempotency_keys.assert_called_once()
        looked_up_keys = repo.get_tickets_by_idempotency_keys.call_args[0][0]
        assert set(looked_up_keys) == {
            f"jira:{ORG_ID}:1",
            f"jira:{ORG_ID}:2",
            f"jira:{ORG_ID}:3",
        }

    def test_builds_a_ticket_state_per_status_transition_linked_to_its_ticket(self):
        api = MagicMock()
        api.get_all_issues.return_value = [
            _issue("1", status_history=[_status_change()])
        ]
        repo = MagicMock()
        repo.get_tickets_by_idempotency_keys.return_value = []
        repo.get_ticket_states_by_idempotency_keys.return_value = []

        tickets, states = _handler(api, repo).get_project_issues_data(
            _org_project(), datetime(2024, 1, 1)
        )

        assert len(states) == 1
        assert states[0].ticket_id == tickets[0].id
        assert states[0].from_status == "To Do"
        assert states[0].to_status == "In Progress"
        assert states[0].idempotency_key == f"jira:{ORG_ID}:1:100"

    def test_reuses_the_existing_ticket_states_id_when_its_idempotency_key_already_exists(
        self,
    ):
        api = MagicMock()
        api.get_all_issues.return_value = [
            _issue("1", status_history=[_status_change(history_id="100")])
        ]
        existing_state = TicketState(
            id="existing-state-id", idempotency_key=f"jira:{ORG_ID}:1:100"
        )
        repo = MagicMock()
        repo.get_tickets_by_idempotency_keys.return_value = []
        repo.get_ticket_states_by_idempotency_keys.return_value = [existing_state]

        _, states = _handler(api, repo).get_project_issues_data(
            _org_project(), datetime(2024, 1, 1)
        )

        assert len(states) == 1
        assert str(states[0].id) == "existing-state-id"

    def test_does_one_batch_lookup_for_all_ticket_states_regardless_of_issue_count(
        self,
    ):
        api = MagicMock()
        api.get_all_issues.return_value = [
            _issue("1", status_history=[_status_change("100"), _status_change("101")]),
            _issue("2", status_history=[_status_change("200")]),
        ]
        repo = MagicMock()
        repo.get_tickets_by_idempotency_keys.return_value = []
        repo.get_ticket_states_by_idempotency_keys.return_value = []

        _handler(api, repo).get_project_issues_data(
            _org_project(), datetime(2024, 1, 1)
        )

        repo.get_ticket_states_by_idempotency_keys.assert_called_once()
        looked_up_keys = repo.get_ticket_states_by_idempotency_keys.call_args[0][0]
        assert set(looked_up_keys) == {
            f"jira:{ORG_ID}:1:100",
            f"jira:{ORG_ID}:1:101",
            f"jira:{ORG_ID}:2:200",
        }
