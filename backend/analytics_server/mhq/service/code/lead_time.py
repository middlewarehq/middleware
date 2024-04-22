from typing import Dict, List
from datetime import datetime
from mhq.service.code.models.lead_time import LeadTimeMetrics
from mhq.store.models.code.repository import TeamRepos

from mhq.store.models.code import PRFilter, PullRequest
from mhq.store.repos.code import CodeRepoService
from mhq.store.models.core import Team

from mhq.service.deployments.deployment_service import (
    DeploymentsService,
    get_deployments_service,
)

from mhq.utils.time import (
    Interval,
    fill_missing_week_buckets,
    generate_expanded_buckets,
)


class LeadTimeService:
    def __init__(
        self,
        code_repo_service: CodeRepoService,
        deployments_service: DeploymentsService,
    ):
        self._code_repo_service = code_repo_service
        self._deployments_service = deployments_service

    def get_team_lead_time_metrics(
        self,
        team: Team,
        interval: Interval,
        pr_filter: Dict[str, PRFilter] = None,
    ) -> LeadTimeMetrics:

        team_repos = self._code_repo_service.get_active_team_repos_by_team_id(team.id)

        return self._get_weighted_avg_lead_time_metrics(
            self._get_team_repos_lead_time_metrics(team_repos, interval, pr_filter)
        )

    def get_team_lead_time_metrics_trends(
        self,
        team: Team,
        interval: Interval,
        pr_filter: Dict[str, PRFilter] = None,
    ) -> Dict[datetime, LeadTimeMetrics]:

        team_repos = self._code_repo_service.get_active_team_repos_by_team_id(team.id)

        lead_time_metrics: List[LeadTimeMetrics] = list(
            set(self._get_team_repos_lead_time_metrics(team_repos, interval, pr_filter))
        )

        weekly_lead_time_metrics_map: Dict[
            datetime, List[LeadTimeMetrics]
        ] = generate_expanded_buckets(
            lead_time_metrics, interval, "merged_at", "weekly"
        )

        weekly_lead_time_metrics_avg_map: Dict[
            datetime, LeadTimeMetrics
        ] = self.get_avg_lead_time_metrics_from_map(weekly_lead_time_metrics_map)

        weekly_lead_time_metrics_avg_map = fill_missing_week_buckets(
            weekly_lead_time_metrics_avg_map, interval, LeadTimeMetrics
        )

        return weekly_lead_time_metrics_avg_map

    def get_avg_lead_time_metrics_from_map(
        self, map_lead_time_metrics: Dict[datetime, List[LeadTimeMetrics]]
    ) -> Dict[datetime, LeadTimeMetrics]:
        map_avg_lead_time_metrics = {}
        for key, lead_time_metrics in map_lead_time_metrics.items():
            map_avg_lead_time_metrics[key] = self._get_weighted_avg_lead_time_metrics(
                lead_time_metrics
            )
        return map_avg_lead_time_metrics

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

    def _get_team_repos_lead_time_metrics(
        self,
        team_repos: TeamRepos,
        interval: Interval,
        pr_filter: Dict[str, PRFilter] = None,
    ) -> List[LeadTimeMetrics]:

        (
            team_repos_using_workflow_deployments,
            team_repos_using_pr_deployments,
        ) = self._deployments_service.get_filtered_team_repos_by_deployment_config(
            team_repos
        )

        lead_time_metrics_using_workflow = (
            self._get_lead_time_metrics_for_repos_using_workflow_deployments(
                team_repos_using_workflow_deployments, interval, pr_filter
            )
        )

        lead_time_metrics_using_pr = (
            self._get_lead_time_metrics_for_repos_using_pr_deployments(
                team_repos_using_pr_deployments, interval, pr_filter
            )
        )

        return lead_time_metrics_using_workflow + lead_time_metrics_using_pr

    def _get_lead_time_metrics_for_repos_using_workflow_deployments(
        self,
        team_repos: List[TeamRepos],
        interval: Interval,
        pr_filter: PRFilter = None,
    ) -> List[LeadTimeMetrics]:

        prs = self._get_lead_time_prs_for_repos_using_workflow_deployments(
            team_repos, interval, pr_filter
        )

        pr_lead_time_metrics = [self._get_lead_time_metrics_for_pr(pr) for pr in prs]

        return pr_lead_time_metrics

    def _get_lead_time_metrics_for_repos_using_pr_deployments(
        self,
        team_repos: List[TeamRepos],
        interval: Interval,
        pr_filter: PRFilter = None,
    ) -> Dict[TeamRepos, List[LeadTimeMetrics]]:

        prs = self._get_lead_time_prs_for_repos_using_pr_deployments(
            team_repos, interval, pr_filter
        )

        pr_lead_time_metrics = [self._get_lead_time_metrics_for_pr(pr) for pr in prs]

        for prm in pr_lead_time_metrics:
            prm.merge_to_deploy = 0

        return pr_lead_time_metrics

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

    def _get_lead_time_metrics_for_pr(self, pr: PullRequest) -> LeadTimeMetrics:
        return LeadTimeMetrics(
            first_commit_to_open=pr.first_commit_to_open
            if pr.first_commit_to_open is not None and pr.first_commit_to_open > 0
            else 0,
            first_response_time=pr.first_response_time if pr.first_response_time else 0,
            rework_time=pr.rework_time if pr.rework_time else 0,
            merge_time=pr.merge_time if pr.merge_time else 0,
            merge_to_deploy=pr.merge_to_deploy if pr.merge_to_deploy else 0,
            pr_count=1,
            merged_at=pr.state_changed_at,
            pr_id=pr.id,
        )

    def _get_weighted_avg_lead_time_metrics(
        self, lead_time_metrics: List[LeadTimeMetrics]
    ) -> LeadTimeMetrics:
        return LeadTimeMetrics(
            first_commit_to_open=self._get_avg_time(
                lead_time_metrics, "first_commit_to_open"
            ),
            first_response_time=self._get_avg_time(
                lead_time_metrics, "first_response_time"
            ),
            rework_time=self._get_avg_time(lead_time_metrics, "rework_time"),
            merge_time=self._get_avg_time(lead_time_metrics, "merge_time"),
            merge_to_deploy=self._get_avg_time(lead_time_metrics, "merge_to_deploy"),
            pr_count=sum(
                [lead_time_metric.pr_count for lead_time_metric in lead_time_metrics]
            ),
        )

    def _get_avg_time(
        self, lead_time_metrics: List[LeadTimeMetrics], field: str
    ) -> float:
        total_pr_count = sum(
            [lead_time_metric.pr_count for lead_time_metric in lead_time_metrics]
        )
        if total_pr_count == 0:
            return 0

        weighted_sum = sum(
            [
                getattr(lead_time_metric, field) * lead_time_metric.pr_count
                for lead_time_metric in lead_time_metrics
            ]
        )
        avg = weighted_sum / total_pr_count
        return avg


def get_lead_time_service() -> LeadTimeService:
    return LeadTimeService(CodeRepoService(), get_deployments_service())
