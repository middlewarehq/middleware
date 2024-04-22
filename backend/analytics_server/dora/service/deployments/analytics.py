from collections import defaultdict
from datetime import datetime
from typing import List, Dict, Tuple

from dora.utils.dict import (
    get_average_of_dict_values,
    get_key_to_count_map_from_key_to_list_map,
)

from .deployment_service import DeploymentsService, get_deployments_service
from dora.store.models.code.filter import PRFilter
from dora.store.models.code.pull_requests import PullRequest
from dora.store.models.code.repository import TeamRepos
from dora.store.models.code.workflows.filter import WorkflowFilter
from dora.service.deployments.models.models import (
    Deployment,
    DeploymentFrequencyMetrics,
)

from dora.store.repos.code import CodeRepoService
from dora.utils.time import Interval, generate_expanded_buckets


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
        team_id: str,
        interval: Interval,
        pr_filter: PRFilter,
        workflow_filter: WorkflowFilter,
    ) -> Dict[str, List[Dict[Deployment, List[PullRequest]]]]:
        """
        Retrieves successful deployments within the specified interval for a given team,
        along with related pull requests. Returns A dictionary mapping repository IDs to lists of deployments along with related pull requests. Each deployment is associated with a list of pull requests that contributed to it.
        """

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

    def get_team_deployment_frequency_metrics(
        self,
        team_id: str,
        interval: Interval,
        pr_filter: PRFilter,
        workflow_filter: WorkflowFilter,
    ) -> DeploymentFrequencyMetrics:

        team_successful_deployments = (
            self.deployments_service.get_team_successful_deployments_in_interval(
                team_id, interval, pr_filter, workflow_filter
            )
        )

        return self._get_deployment_frequency_metrics(
            team_successful_deployments, interval
        )

    def get_weekly_deployment_frequency_trends(
        self,
        team_id: str,
        interval: Interval,
        pr_filter: PRFilter,
        workflow_filter: WorkflowFilter,
    ) -> Dict[datetime, int]:

        team_successful_deployments = (
            self.deployments_service.get_team_successful_deployments_in_interval(
                team_id, interval, pr_filter, workflow_filter
            )
        )

        team_weekly_deployments = generate_expanded_buckets(
            team_successful_deployments, interval, "conducted_at", "weekly"
        )

        return get_key_to_count_map_from_key_to_list_map(team_weekly_deployments)

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

    def _get_deployment_frequency_from_date_to_deployment_map(
        self, date_to_deployment_map: Dict[datetime, List[Deployment]]
    ) -> int:
        """
        This method takes a dict of datetime representing (day/week/month) to Deployments and returns avg deployment frequency
        """

        date_to_deployment_count_map: Dict[
            datetime, int
        ] = get_key_to_count_map_from_key_to_list_map(date_to_deployment_map)

        return get_average_of_dict_values(date_to_deployment_count_map)

    def _get_deployment_frequency_metrics(
        self, successful_deployments: List[Deployment], interval: Interval
    ) -> DeploymentFrequencyMetrics:

        successful_deployments = list(
            filter(
                lambda x: x.conducted_at >= interval.from_time
                and x.conducted_at <= interval.to_time,
                successful_deployments,
            )
        )

        team_daily_deployments = generate_expanded_buckets(
            successful_deployments, interval, "conducted_at", "daily"
        )
        team_weekly_deployments = generate_expanded_buckets(
            successful_deployments, interval, "conducted_at", "weekly"
        )
        team_monthly_deployments = generate_expanded_buckets(
            successful_deployments, interval, "conducted_at", "monthly"
        )

        daily_deployment_frequency = (
            self._get_deployment_frequency_from_date_to_deployment_map(
                team_daily_deployments
            )
        )

        weekly_deployment_frequency = (
            self._get_deployment_frequency_from_date_to_deployment_map(
                team_weekly_deployments
            )
        )

        monthly_deployment_frequency = (
            self._get_deployment_frequency_from_date_to_deployment_map(
                team_monthly_deployments
            )
        )

        return DeploymentFrequencyMetrics(
            len(successful_deployments),
            daily_deployment_frequency,
            weekly_deployment_frequency,
            monthly_deployment_frequency,
        )

    def _get_weekly_deployment_frequency_trends(
        self, successful_deployments: List[Deployment], interval: Interval
    ) -> Dict[datetime, int]:

        successful_deployments = list(
            filter(
                lambda x: x.conducted_at >= interval.from_time
                and x.conducted_at <= interval.to_time,
                successful_deployments,
            )
        )

        team_weekly_deployments = generate_expanded_buckets(
            successful_deployments, interval, "conducted_at", "weekly"
        )

        return get_key_to_count_map_from_key_to_list_map(team_weekly_deployments)


def get_deployment_analytics_service() -> DeploymentAnalyticsService:
    return DeploymentAnalyticsService(get_deployments_service(), CodeRepoService())
