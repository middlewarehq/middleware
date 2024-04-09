from typing import List, Tuple

from .factory import get_deployments_factory
from .deployments_factory_service import DeploymentsFactoryService
from dora.store.models.code.filter import PRFilter
from dora.store.models.code.repository import TeamRepos
from dora.store.models.code.workflows.filter import WorkflowFilter
from dora.service.deployments.models.models import Deployment, DeploymentType

from dora.store.repos.code import CodeRepoService
from dora.store.repos.workflows import WorkflowRepoService


class DeploymentsService:
    def __init__(
        self,
        code_repo_service: CodeRepoService,
        workflow_repo_service: WorkflowRepoService,
        workflow_based_deployments_service: DeploymentsFactoryService,
        pr_based_deployments_service: DeploymentsFactoryService,
    ):
        self.code_repo_service = code_repo_service
        self.workflow_repo_service = workflow_repo_service
        self.workflow_based_deployments_service = workflow_based_deployments_service
        self.pr_based_deployments_service = pr_based_deployments_service

    def get_team_successful_deployments_in_interval(
        self,
        team_id: str,
        interval,
        pr_filter: PRFilter = None,
        workflow_filter: WorkflowFilter = None,
    ) -> List[Deployment]:
        team_repos = self._get_team_repos_by_team_id(team_id)
        (
            team_repos_using_workflow_deployments,
            team_repos_using_pr_deployments,
        ) = self.get_filtered_team_repos_by_deployment_config(team_repos)

        deployments_using_workflow = self.workflow_based_deployments_service.get_repos_successful_deployments_in_interval(
            self._get_repo_ids_from_team_repos(team_repos_using_workflow_deployments),
            interval,
            workflow_filter,
        )
        deployments_using_pr = self.pr_based_deployments_service.get_repos_successful_deployments_in_interval(
            self._get_repo_ids_from_team_repos(team_repos_using_pr_deployments),
            interval,
            pr_filter,
        )

        deployments: List[Deployment] = (
            deployments_using_workflow + deployments_using_pr
        )
        sorted_deployments = self._sort_deployments_by_date(deployments)

        return sorted_deployments

    def _get_team_repos_by_team_id(self, team_id: str) -> List[TeamRepos]:
        return self.code_repo_service.get_active_team_repos_by_team_id(team_id)

    def _get_repo_ids_from_team_repos(self, team_repos: List[TeamRepos]) -> List[str]:
        return [str(team_repo.org_repo_id) for team_repo in team_repos]

    def get_filtered_team_repos_by_deployment_config(
        self, team_repos: List[TeamRepos]
    ) -> Tuple[List[TeamRepos], List[TeamRepos]]:
        return self._filter_team_repos_using_workflow_deployments(
            team_repos
        ), self._filter_team_repos_using_pr_deployments(team_repos)

    def _filter_team_repos_using_workflow_deployments(
        self, team_repos: List[TeamRepos]
    ):
        return [
            team_repo
            for team_repo in team_repos
            if team_repo.deployment_type.value == DeploymentType.WORKFLOW.value
        ]

    def _filter_team_repos_using_pr_deployments(self, team_repos: List[TeamRepos]):
        return [
            team_repo
            for team_repo in team_repos
            if team_repo.deployment_type.value == DeploymentType.PR_MERGE.value
        ]

    def _sort_deployments_by_date(
        self, deployments: List[Deployment]
    ) -> List[Deployment]:
        return sorted(deployments, key=lambda deployment: deployment.conducted_at)


def get_deployments_service() -> DeploymentsService:
    return DeploymentsService(
        CodeRepoService(),
        WorkflowRepoService(),
        get_deployments_factory(DeploymentType.WORKFLOW),
        get_deployments_factory(DeploymentType.PR_MERGE),
    )
