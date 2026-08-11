from unittest.mock import MagicMock

from mhq.service.ticket_matching.service import TicketMatchingService
from mhq.store.models.code import PullRequest

# CLUSTOX: Jira integration, Phase 3 (ticket-PR matching). See
# docs/JIRA_INTEGRATION_PROPOSAL.md.

ORG_ID = "org-1"


def _pr(pr_id="pr-1", title="", head_branch=""):
    return PullRequest(id=pr_id, title=title, head_branch=head_branch)


def _service(repo=None) -> TicketMatchingService:
    return TicketMatchingService(repo or MagicMock())


class TestMatchOrgPrsToTickets:
    def test_skips_fetching_prs_entirely_when_no_tickets_are_synced_yet(self):
        repo = MagicMock()
        repo.get_org_tickets_key_map.return_value = {}

        _service(repo).match_org_prs_to_tickets(ORG_ID)

        repo.get_unmatched_prs_for_org.assert_not_called()
        repo.save_mappings.assert_not_called()

    def test_does_nothing_when_there_are_no_unmatched_prs(self):
        repo = MagicMock()
        repo.get_org_tickets_key_map.return_value = {"PZDA-543": "ticket-1"}
        repo.get_unmatched_prs_for_org.return_value = []

        _service(repo).match_org_prs_to_tickets(ORG_ID)

        repo.save_mappings.assert_not_called()

    def test_maps_a_pr_to_the_ticket_its_title_references(self):
        repo = MagicMock()
        repo.get_org_tickets_key_map.return_value = {"PZDA-543": "ticket-1"}
        repo.get_unmatched_prs_for_org.return_value = [
            _pr("pr-1", title="fix(PZDA-543): consent policy version")
        ]

        _service(repo).match_org_prs_to_tickets(ORG_ID)

        mappings = repo.save_mappings.call_args[0][0]
        assert len(mappings) == 1
        assert str(mappings[0].pr_id) == "pr-1"
        assert mappings[0].ticket_id == "ticket-1"

    def test_maps_a_pr_to_every_ticket_a_multi_ticket_title_references(self):
        repo = MagicMock()
        repo.get_org_tickets_key_map.return_value = {
            "PZDA-544": "ticket-544",
            "PZDA-546": "ticket-546",
        }
        repo.get_unmatched_prs_for_org.return_value = [
            _pr("pr-1", title="feat(PZDA-544/546): reminder interval")
        ]

        _service(repo).match_org_prs_to_tickets(ORG_ID)

        mappings = repo.save_mappings.call_args[0][0]
        assert {m.ticket_id for m in mappings} == {"ticket-544", "ticket-546"}

    def test_does_not_match_a_key_shaped_string_that_is_not_a_real_ticket(self):
        # The regex would extract "ISO-27001" as a candidate; since it's
        # not in the org's real ticket key map, it must not become a
        # mapping row.
        repo = MagicMock()
        repo.get_org_tickets_key_map.return_value = {"PZDA-543": "ticket-1"}
        repo.get_unmatched_prs_for_org.return_value = [
            _pr("pr-1", title="chore: note the ISO-27001 audit date")
        ]

        _service(repo).match_org_prs_to_tickets(ORG_ID)

        repo.save_mappings.assert_not_called()

    def test_skips_saving_entirely_when_no_pr_matches_anything(self):
        repo = MagicMock()
        repo.get_org_tickets_key_map.return_value = {"PZDA-543": "ticket-1"}
        repo.get_unmatched_prs_for_org.return_value = [
            _pr("pr-1", title="chore: bump dependencies")
        ]

        _service(repo).match_org_prs_to_tickets(ORG_ID)

        repo.save_mappings.assert_not_called()

    def test_does_one_batch_lookup_and_one_batch_save_regardless_of_pr_count(self):
        repo = MagicMock()
        repo.get_org_tickets_key_map.return_value = {"PZDA-543": "ticket-1"}
        repo.get_unmatched_prs_for_org.return_value = [
            _pr(f"pr-{i}", title="fix(PZDA-543): x") for i in range(50)
        ]

        _service(repo).match_org_prs_to_tickets(ORG_ID)

        repo.get_org_tickets_key_map.assert_called_once()
        repo.get_unmatched_prs_for_org.assert_called_once()
        repo.save_mappings.assert_called_once()
        assert len(repo.save_mappings.call_args[0][0]) == 50
