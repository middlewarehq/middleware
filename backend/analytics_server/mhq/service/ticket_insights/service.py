from typing import Dict, List

from mhq.service.ticket_insights.cycle_time import compute_cycle_time_by_project
from mhq.store.models.code import PullRequest
from mhq.store.models.core import Team
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.projects import ProjectRepoService
from mhq.store.repos.ticket_matching import TicketMatchingRepoService
from mhq.utils.time import Interval


class TicketInsightsService:
    """
    Phase 4 (§6C/§6E) read-side aggregations for the DORA Metrics page's
    Jira widget -- deliberately separate from the 4 existing DORA cards'
    own services (lead time, deployment frequency, change failure rate,
    MTTR), which this doesn't touch. Composes the code and project store
    services rather than living inside either: a "how many merged PRs
    have no ticket" count is inherently a join across both.
    """

    def __init__(
        self,
        project_repo_service: ProjectRepoService,
        code_repo_service: CodeRepoService,
        ticket_matching_repo_service: TicketMatchingRepoService,
    ):
        self._project_repo_service = project_repo_service
        self._code_repo_service = code_repo_service
        self._ticket_matching_repo_service = ticket_matching_repo_service

    def get_team_ticket_insights(self, team: Team, interval: Interval) -> Dict:
        org_projects = self._project_repo_service.get_team_projects(str(team.id))
        project_ids = [str(project.id) for project in org_projects]
        projects_by_id = {str(project.id): project for project in org_projects}

        tickets, ticket_states = (
            self._project_repo_service.get_tickets_with_states_for_projects(
                project_ids, interval.from_time, interval.to_time
            )
        )
        cycle_time_by_project = compute_cycle_time_by_project(
            tickets, ticket_states, projects_by_id
        )

        repo_ids = self._team_repo_ids(team)
        prs_without_ticket_count = (
            self._ticket_matching_repo_service.get_unlinked_merged_pr_count(
                repo_ids, interval.from_time, interval.to_time
            )
        )

        return {
            "cycle_time_by_project": cycle_time_by_project,
            "prs_without_ticket_count": prs_without_ticket_count,
        }

    def get_team_unlinked_prs(self, team: Team, interval: Interval) -> List[PullRequest]:
        """
        The actual merged PRs behind the Data Hygiene count above --
        title, branch, merge time -- so a real gap in the ticket-key
        convention (a typo, a PR that references a ticket in its
        description instead of its title/branch, or one that genuinely
        never had a ticket) can be found and fixed by a person, not just
        counted. Deliberately its own call, not folded into
        get_team_ticket_insights: the count is cheap and used on every
        DORA Metrics page load, this list is only fetched when someone
        actually opens the drill-down.
        """
        repo_ids = self._team_repo_ids(team)
        return self._ticket_matching_repo_service.get_unlinked_merged_prs(
            repo_ids, interval.from_time, interval.to_time
        )

    def _team_repo_ids(self, team: Team) -> List[str]:
        org_repos = self._code_repo_service.get_team_repos(str(team.id))
        return [str(repo.id) for repo in org_repos]


def get_ticket_insights_service() -> TicketInsightsService:
    return TicketInsightsService(
        ProjectRepoService(), CodeRepoService(), TicketMatchingRepoService()
    )
