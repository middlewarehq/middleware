from collections import defaultdict
from typing import List, Dict, Tuple

from .deployment_service import DeploymentsService, get_deployments_service
from dora.store.models.code.filter import PRFilter
from dora.store.models.code.pull_requests import PullRequest
from dora.store.models.code.repository import TeamRepos
from dora.store.models.code.workflows.filter import WorkflowFilter
from dora.service.deployments.models.models import Deployment

from dora.store.repos.code import CodeRepoService
from dora.utils.time import Interval


class DeploymentAnalyticsService:
    def __init__(
        self,
        deployments_service: DeploymentsService,
        code_repo_service: CodeRepoService,
    ):
        self.deployments_service = deployments_service
        self.code_repo_service = code_repo_service

    def get_team_successful_deployments_in_interval_with_related_prs(
        self,
        team_id,
        interval: Interval,
        pr_filter: PRFilter,
        workflow_filter: WorkflowFilter,
    ) -> Dict[str, Dict[Deployment, List[PullRequest]]]:
        deployments: List[
            Deployment
        ] = self.deployments_service.get_team_successful_deployments_in_interval(
            team_id, interval, pr_filter, workflow_filter
        )

        team_repos: List[TeamRepos] = self._get_team_repos_by_team_id(team_id)
        repo_ids: List[str] = [str(team_repo.org_repo_id) for team_repo in team_repos]

        pull_requests: List[
            PullRequest
        ] = self.code_repo_service.get_prs_merged_in_interval(
            repo_ids, interval, pr_filter
        )

        repo_id_branch_to_pr_list_map: Dict[
            Tuple[str, str], List[PullRequest]
        ] = self._map_prs_to_repo_id_and_base_branch(pull_requests)
        repo_id_branch_to_deployments_map: Dict[
            Tuple[str, str], List[Deployment]
        ] = self._map_deployments_to_repo_id_and_head_branch(deployments)

        repo_id_to_deployments_with_pr_map: Dict[
            str, Dict[Deployment, List[PullRequest]]
        ] = defaultdict(dict)

        for (
            repo_id,
            base_branch,
        ), deployments in repo_id_branch_to_deployments_map.items():
            relevant_prs: List[PullRequest] = repo_id_branch_to_pr_list_map.get(
                (repo_id, base_branch), []
            )
            deployments_pr_map: Dict[
                Deployment, List[PullRequest]
            ] = self._map_prs_to_deployments(relevant_prs, deployments)

            repo_id_to_deployments_with_pr_map[repo_id].update(deployments_pr_map)

        return repo_id_to_deployments_with_pr_map

    def _map_prs_to_repo_id_and_base_branch(
        self, pull_requests: List[PullRequest]
    ) -> Dict[Tuple[str, str], List[PullRequest]]:
        repo_id_branch_pr_map: Dict[Tuple[str, str], List[PullRequest]] = defaultdict(
            list
        )
        for pr in pull_requests:
            repo_id = str(pr.repo_id)
            base_branch = pr.base_branch
            repo_id_branch_pr_map[(repo_id, base_branch)].append(pr)
        return repo_id_branch_pr_map

    def _map_deployments_to_repo_id_and_head_branch(
        self, deployments: List[Deployment]
    ) -> Dict[Tuple[str, str], List[Deployment]]:
        repo_id_branch_deployments_map: Dict[
            Tuple[str, str], List[Deployment]
        ] = defaultdict(list)
        for deployment in deployments:
            repo_id = str(deployment.repo_id)
            head_branch = deployment.head_branch
            repo_id_branch_deployments_map[(repo_id, head_branch)].append(deployment)
        return repo_id_branch_deployments_map

    def _map_prs_to_deployments(
        self, pull_requests: List[PullRequest], deployments: List[Deployment]
    ) -> Dict[Deployment, List[PullRequest]]:
        """
        Maps the pull requests to the deployments they were included in.
        This method takes a sorted list of pull requests and a sorted list of deployments and returns a dictionary
        """
        pr_count = 0
        deployment_count = 0
        deployment_pr_map = defaultdict(
            list, {deployment: [] for deployment in deployments}
        )

        while pr_count < len(pull_requests) and deployment_count < len(deployments):
            pr = pull_requests[pr_count]
            deployment = deployments[deployment_count]

            # Check if the PR was merged before or at the same time as the deployment
            if pr.state_changed_at <= deployment.conducted_at:
                deployment_pr_map[deployment].append(pr)
                pr_count += 1
            else:
                deployment_count += 1

        return deployment_pr_map

    def _get_team_repos_by_team_id(self, team_id: str) -> List[TeamRepos]:
        return self.code_repo_service.get_active_team_repos_by_team_id(team_id)


def get_deployment_analytics_service() -> DeploymentAnalyticsService:
    return DeploymentAnalyticsService(get_deployments_service(), CodeRepoService())
