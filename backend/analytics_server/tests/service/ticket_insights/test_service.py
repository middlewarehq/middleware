from datetime import timedelta
from unittest.mock import MagicMock

from mhq.service.ticket_insights.service import TicketInsightsService
from mhq.store.models.core import Team
from mhq.utils.time import Interval, time_now

# CLUSTOX: Jira integration, Phase 4 (§6C/§6E). See
# docs/JIRA_INTEGRATION_PROPOSAL.md.


def _service(project_repo=None, code_repo=None, ticket_matching_repo=None):
    return TicketInsightsService(
        project_repo or MagicMock(),
        code_repo or MagicMock(),
        ticket_matching_repo or MagicMock(),
    )


def _interval():
    now = time_now()
    return Interval(now, now)


class TestGetTeamTicketInsights:
    def test_scopes_the_ticket_lookup_to_the_teams_tracked_projects(self):
        project_repo = MagicMock()
        project_repo.get_team_projects.return_value = [
            MagicMock(id="proj-1"),
            MagicMock(id="proj-2"),
        ]
        project_repo.get_tickets_with_states_for_projects.return_value = ([], [])
        code_repo = MagicMock()
        code_repo.get_team_repos.return_value = []
        ticket_matching_repo = MagicMock()
        ticket_matching_repo.get_unlinked_merged_pr_count.return_value = 0

        team = Team(id="team-1")
        _service(project_repo, code_repo, ticket_matching_repo).get_team_ticket_insights(
            team, _interval()
        )

        looked_up_project_ids = (
            project_repo.get_tickets_with_states_for_projects.call_args[0][0]
        )
        assert set(looked_up_project_ids) == {"proj-1", "proj-2"}

    def test_scopes_the_unlinked_pr_count_to_the_teams_tracked_repos(self):
        project_repo = MagicMock()
        project_repo.get_team_projects.return_value = []
        project_repo.get_tickets_with_states_for_projects.return_value = ([], [])
        code_repo = MagicMock()
        code_repo.get_team_repos.return_value = [MagicMock(id="repo-1")]
        ticket_matching_repo = MagicMock()
        ticket_matching_repo.get_unlinked_merged_pr_count.return_value = 3

        team = Team(id="team-1")
        result = _service(
            project_repo, code_repo, ticket_matching_repo
        ).get_team_ticket_insights(team, _interval())

        looked_up_repo_ids = (
            ticket_matching_repo.get_unlinked_merged_pr_count.call_args[0][0]
        )
        assert looked_up_repo_ids == ["repo-1"]
        assert result["prs_without_ticket_count"] == 3

    def test_returns_ticket_count_and_cycle_time_together(self):
        project_repo = MagicMock()
        project_repo.get_team_projects.return_value = [MagicMock(id="proj-1")]
        ticket = MagicMock(id="t1", status="Done")
        ticket.updated_at = time_now()
        ticket.created_at = ticket.updated_at - timedelta(days=3)
        project_repo.get_tickets_with_states_for_projects.return_value = (
            [ticket],
            [],
        )
        code_repo = MagicMock()
        code_repo.get_team_repos.return_value = []
        ticket_matching_repo = MagicMock()
        ticket_matching_repo.get_unlinked_merged_pr_count.return_value = 0

        team = Team(id="team-1")
        result = _service(
            project_repo, code_repo, ticket_matching_repo
        ).get_team_ticket_insights(team, _interval())

        assert result["ticket_count"] == 1
        assert "Done" in result["cycle_time_by_status"]
        assert result["avg_total_cycle_time"].avg_seconds == timedelta(days=3).total_seconds()
