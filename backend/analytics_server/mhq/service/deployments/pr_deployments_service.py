from typing import List
from .models.adapter import DeploymentsAdaptor
from mhq.store.models.code.filter import PRFilter
from mhq.store.models.code.pull_requests import PullRequest
from mhq.service.deployments.models.models import Deployment

from mhq.store.repos.code import CodeRepoService
from mhq.utils.time import Interval

from .deployments_factory_service import DeploymentsFactoryService


class PRDeploymentsService(DeploymentsFactoryService):
    def __init__(
        self,
        code_repo_service: CodeRepoService,
        deployments_adapter: DeploymentsAdaptor,
    ):
        self.code_repo_service = code_repo_service
        self.deployments_adapter = deployments_adapter

    def get_repos_successful_deployments_in_interval(
        self, repo_ids: List[str], interval: Interval, pr_filter: PRFilter
    ) -> List[Deployment]:
        pull_requests: List[
            PullRequest
        ] = self.code_repo_service.get_prs_merged_in_interval(
            repo_ids, interval, pr_filter=pr_filter
        )

        return self.deployments_adapter.adapt_many(pull_requests)

    def get_repos_all_deployments_in_interval(
        self, repo_ids: List[str], interval: Interval, prs_filter: PRFilter
    ) -> List[Deployment]:
        return self.get_repos_successful_deployments_in_interval(
            repo_ids, interval, prs_filter
        )

    def get_pull_requests_related_to_deployment(
        self, deployment: Deployment
    ) -> List[PullRequest]:
        return [self.code_repo_service.get_pull_request_by_id(deployment.entity_id)]

    def get_deployment_by_entity_id(self, entity_id: str) -> Deployment:
        pull_request: PullRequest = self.code_repo_service.get_pull_request_by_id(
            entity_id
        )
        if not pull_request:
            raise ValueError(f"Pull Request with id {entity_id} not found")
        return self.deployments_adapter.adapt(pull_request)
