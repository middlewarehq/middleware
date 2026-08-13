from datetime import timedelta
from unittest.mock import MagicMock

from mhq.service.code.ticket_lead_time import TicketLeadTimeService
from mhq.store.models.core import Team
from mhq.utils.time import Interval, time_now

# CLUSTOX: Jira integration -- the extended Lead Time breakdown's
# "ticket created -> first commit" leading phase (docs/
# JIRA_INTEGRATION_PROPOSAL.md §6A). Deliberately additive alongside
# LeadTimeService -- every test here mocks that service rather than
# exercising its real deployment-config branching, which is already
# covered by test_lead_time_service.py.


def _metric(pr_id, lead_time_seconds):
    metric = MagicMock()
    metric.pr_id = pr_id
    metric.lead_time = lead_time_seconds
    return metric


def _service(lead_time_service=None, code_repo=None, ticket_matching_repo=None):
    return TicketLeadTimeService(
        lead_time_service or MagicMock(),
        code_repo or MagicMock(),
        ticket_matching_repo or MagicMock(),
    )


def _interval():
    now = time_now()
    return Interval(now, now)


class TestGetTeamTicketLeadTimeMetrics:
    def test_returns_zeroed_metrics_when_the_team_has_no_merged_prs(self):
        lead_time_service = MagicMock()
        lead_time_service.get_team_pr_lead_time_metrics.return_value = []

        result = _service(lead_time_service).get_team_ticket_lead_time_metrics(
            Team(id="team-1"), _interval()
        )

        assert result.matched_pr_count == 0
        assert result.avg_extended_lead_time_seconds == 0

    def test_returns_zeroed_metrics_when_no_pr_has_a_matched_ticket(self):
        lead_time_service = MagicMock()
        lead_time_service.get_team_pr_lead_time_metrics.return_value = [
            _metric("pr-1", 1000)
        ]
        ticket_matching_repo = MagicMock()
        ticket_matching_repo.get_ticket_created_at_by_pr_ids.return_value = {}

        result = _service(
            lead_time_service, ticket_matching_repo=ticket_matching_repo
        ).get_team_ticket_lead_time_metrics(Team(id="team-1"), _interval())

        assert result.matched_pr_count == 0

    def test_excludes_a_matched_pr_with_no_recorded_first_commit(self):
        lead_time_service = MagicMock()
        lead_time_service.get_team_pr_lead_time_metrics.return_value = [
            _metric("pr-1", 1000)
        ]
        ticket_matching_repo = MagicMock()
        ticket_matching_repo.get_ticket_created_at_by_pr_ids.return_value = {
            "pr-1": time_now()
        }
        code_repo = MagicMock()
        code_repo.get_first_commit_at_by_pr_ids.return_value = {}  # no commit row synced

        result = _service(
            lead_time_service, code_repo, ticket_matching_repo
        ).get_team_ticket_lead_time_metrics(Team(id="team-1"), _interval())

        assert result.matched_pr_count == 0

    def test_excludes_a_ticket_created_after_its_first_commit(self):
        # A ticket filed retroactively (or a false-positive key match) --
        # not a real "idea to commit" span, so this must not surface as
        # a negative duration.
        first_commit_at = time_now()
        ticket_created_at = first_commit_at + timedelta(days=1)

        lead_time_service = MagicMock()
        lead_time_service.get_team_pr_lead_time_metrics.return_value = [
            _metric("pr-1", 1000)
        ]
        ticket_matching_repo = MagicMock()
        ticket_matching_repo.get_ticket_created_at_by_pr_ids.return_value = {
            "pr-1": ticket_created_at
        }
        code_repo = MagicMock()
        code_repo.get_first_commit_at_by_pr_ids.return_value = {
            "pr-1": first_commit_at
        }

        result = _service(
            lead_time_service, code_repo, ticket_matching_repo
        ).get_team_ticket_lead_time_metrics(Team(id="team-1"), _interval())

        assert result.matched_pr_count == 0

    def test_averages_only_over_the_matched_and_resolvable_subset(self):
        now = time_now()

        lead_time_service = MagicMock()
        lead_time_service.get_team_pr_lead_time_metrics.return_value = [
            _metric("pr-matched-1", lead_time_seconds=1000),
            _metric("pr-matched-2", lead_time_seconds=2000),
            _metric("pr-unmatched", lead_time_seconds=999999),
        ]
        ticket_matching_repo = MagicMock()
        ticket_matching_repo.get_ticket_created_at_by_pr_ids.return_value = {
            "pr-matched-1": now - timedelta(days=2),
            "pr-matched-2": now - timedelta(days=4),
            # "pr-unmatched" deliberately absent -- no ticket match.
        }
        code_repo = MagicMock()
        code_repo.get_first_commit_at_by_pr_ids.return_value = {
            "pr-matched-1": now - timedelta(days=1),  # 1 day ticket->commit
            "pr-matched-2": now - timedelta(days=1),  # 3 days ticket->commit
        }

        result = _service(
            lead_time_service, code_repo, ticket_matching_repo
        ).get_team_ticket_lead_time_metrics(Team(id="team-1"), _interval())

        assert result.matched_pr_count == 2
        # (1 day + 3 days) / 2 = 2 days, in seconds.
        assert result.avg_ticket_to_first_commit_seconds == timedelta(
            days=2
        ).total_seconds()
        # (1000 + 2000) / 2 -- the unmatched PR's 999999s must not leak in.
        assert result.avg_commit_only_lead_time_seconds == 1500
        assert result.avg_extended_lead_time_seconds == (
            timedelta(days=2).total_seconds() + 1500
        )

    def test_looks_up_first_commit_only_for_the_matched_subset_not_every_pr(self):
        # A batch lookup scoped to matched PRs only -- not every merged
        # PR in the window -- keeps this from doing unnecessary work for
        # the (often larger) unmatched population.
        lead_time_service = MagicMock()
        lead_time_service.get_team_pr_lead_time_metrics.return_value = [
            _metric("pr-matched", 1000),
            _metric("pr-unmatched", 1000),
        ]
        ticket_matching_repo = MagicMock()
        ticket_matching_repo.get_ticket_created_at_by_pr_ids.return_value = {
            "pr-matched": time_now()
        }
        code_repo = MagicMock()
        code_repo.get_first_commit_at_by_pr_ids.return_value = {}

        _service(
            lead_time_service, code_repo, ticket_matching_repo
        ).get_team_ticket_lead_time_metrics(Team(id="team-1"), _interval())

        code_repo.get_first_commit_at_by_pr_ids.assert_called_once_with(["pr-matched"])
