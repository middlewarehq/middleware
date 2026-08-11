from mhq.store.models.code import PullRequest

# CLUSTOX: Jira integration -- ticket-PR matching needs the PR's body
# text provider-agnostically. See docs/JIRA_INTEGRATION_PROPOSAL.md and
# mhq/service/ticket_matching/service.py.


class TestPullRequestDescription:
    def test_reads_body_for_a_github_pr(self):
        pr = PullRequest(data={"body": "Closes PZDA-689"})
        assert pr.description == "Closes PZDA-689"

    def test_reads_description_for_a_gitlab_merge_request(self):
        pr = PullRequest(data={"description": "Closes PZDA-689"})
        assert pr.description == "Closes PZDA-689"

    def test_prefers_body_when_both_keys_are_somehow_present(self):
        pr = PullRequest(data={"body": "github body", "description": "gitlab desc"})
        assert pr.description == "github body"

    def test_returns_empty_string_when_data_is_none(self):
        assert PullRequest(data=None).description == ""

    def test_returns_empty_string_when_neither_key_is_present(self):
        assert PullRequest(data={"title": "x"}).description == ""
