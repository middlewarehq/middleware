from typing import List
from dora.store.models.code.repository import TeamRepos

from dora.store.models.code import PRFilter, PullRequest
from dora.store.repos.code import CodeRepoService
from dora.store.models.core import Team

from dora.service.deployments.deployment_service import (
    DeploymentsService,
    get_deployments_service,
)

from dora.utils.time import Interval


class LeadTimeService:
    def __init__(
        self,
        code_repo_service: CodeRepoService,
        deployments_service: DeploymentsService,
    ):
        self._code_repo_service = code_repo_service
        self._deployments_service = deployments_service

    def get_team_lead_time_prs(
        self,
        team: Team,
        interval: Interval,
        pr_filter: PRFilter = None,
    ) -> List[PullRequest]:

        team_repos = self._code_repo_service.get_active_team_repos_by_team_id(team.id)

        (
            team_repos_using_workflow_deployments,
            team_repos_using_pr_deployments,
        ) = self._deployments_service.get_filtered_team_repos_by_deployment_config(
            team_repos
        )

        lead_time_prs_using_workflow = (
            self._get_lead_time_prs_for_repos_using_workflow_deployments(
                team_repos_using_workflow_deployments, interval, pr_filter
            )
        )

        lead_time_prs_using_pr = self._get_lead_time_prs_for_repos_using_pr_deployments(
            team_repos_using_pr_deployments, interval, pr_filter
        )

        return list(set(lead_time_prs_using_workflow + lead_time_prs_using_pr))

    def _get_lead_time_prs_for_repos_using_workflow_deployments(
        self,
        team_repos: List[TeamRepos],
        interval: Interval,
        pr_filter: PRFilter = None,
    ) -> List[PullRequest]:

        team_repos_with_workflow_deployments_configured: List[
            TeamRepos
        ] = self._deployments_service.get_filtered_team_repos_with_workflow_configured_deployments(
            team_repos
        )

        repo_ids = [
            tr.org_repo_id for tr in team_repos_with_workflow_deployments_configured
        ]

        prs = self._code_repo_service.get_prs_merged_in_interval(
            repo_ids,
            interval,
            pr_filter,
            has_non_null_mtd=True,
        )

        return prs

    def _get_lead_time_prs_for_repos_using_pr_deployments(
        self,
        team_repos: List[TeamRepos],
        interval: Interval,
        pr_filter: PRFilter = None,
    ) -> List[PullRequest]:
        repo_ids = [tr.org_repo_id for tr in team_repos]

        prs = self._code_repo_service.get_prs_merged_in_interval(
            repo_ids, interval, pr_filter
        )

        return prs


def get_lead_time_service() -> LeadTimeService:
    return LeadTimeService(CodeRepoService(), get_deployments_service())
