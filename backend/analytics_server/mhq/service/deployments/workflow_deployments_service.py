from typing import List, Tuple
from .models.adapter import DeploymentsAdaptor
from mhq.store.models.code.pull_requests import PullRequest
from mhq.store.models.code.workflows.filter import WorkflowFilter
from mhq.store.models.code.workflows.workflows import RepoWorkflow, RepoWorkflowRuns
from mhq.service.deployments.models.models import Deployment
from mhq.store.repos.code import CodeRepoService

from mhq.store.repos.workflows import WorkflowRepoService
from mhq.utils.time import Interval

from .deployment_pr_mapper import DeploymentPRMapperService
from .deployments_factory_service import DeploymentsFactoryService


class WorkflowDeploymentsService(DeploymentsFactoryService):
    def __init__(
        self,
        workflow_repo_service: WorkflowRepoService,
        code_repo_service: CodeRepoService,
        deployments_adapter: DeploymentsAdaptor,
        deployment_pr_mapping_service: DeploymentPRMapperService,
    ):
        self.workflow_repo_service = workflow_repo_service
        self.code_repo_service = code_repo_service
        self.deployments_adapter = deployments_adapter
        self.deployment_pr_mapping_service = deployment_pr_mapping_service

    def get_repos_successful_deployments_in_interval(
        self, repo_ids: List[str], interval: Interval, workflow_filter: WorkflowFilter
    ) -> List[Deployment]:
        repo_workflow_runs: List[Tuple[RepoWorkflow, RepoWorkflowRuns]] = (
            self.workflow_repo_service.get_successful_repo_workflows_runs_by_repo_ids(
                repo_ids, interval, workflow_filter
            )
        )
        return self.deployments_adapter.adapt_many(repo_workflow_runs)

    def get_repos_all_deployments_in_interval(
        self,
        repo_ids: List[str],
        interval: Interval,
        workflow_filter: WorkflowFilter,
    ) -> List[Deployment]:
        repo_workflow_runs: List[Tuple[RepoWorkflow, RepoWorkflowRuns]] = (
            self.workflow_repo_service.get_repos_workflow_runs_by_repo_ids(
                repo_ids, interval, workflow_filter
            )
        )
        return self.deployments_adapter.adapt_many(repo_workflow_runs)

    def get_pull_requests_related_to_deployment(
        self, deployment: Deployment
    ) -> List[PullRequest]:
        previous_deployment = self._get_previous_deployment_for_given_deployment(
            deployment
        )
        interval = Interval(previous_deployment.conducted_at, deployment.conducted_at)
        pr_base_branch: str = deployment.head_branch
        pull_requests: List[PullRequest] = (
            self.code_repo_service.get_prs_merged_in_interval(
                [deployment.repo_id], interval, base_branches=[pr_base_branch]
            )
        )
        relevant_prs: List[PullRequest] = (
            self.deployment_pr_mapping_service.get_all_prs_deployed(
                pull_requests, deployment
            )
        )

        return relevant_prs

    def get_deployment_by_entity_id(self, entity_id: str) -> Deployment:
        repo_workflow_run: Tuple[RepoWorkflow, RepoWorkflowRuns] = (
            self.workflow_repo_service.get_repo_workflow_run_by_id(entity_id)
        )
        if not repo_workflow_run:
            raise ValueError(f"Workflow run with id {entity_id} not found")
        return self.deployments_adapter.adapt(repo_workflow_run)

    def _get_previous_deployment_for_given_deployment(
        self, deployment: Deployment
    ) -> Deployment:
        (
            workflow_run,
            current_workflow_run,
        ) = self.workflow_repo_service.get_repo_workflow_run_by_id(deployment.entity_id)
        workflow_run_previous_workflow_run: Tuple[RepoWorkflow, RepoWorkflowRuns] = (
            self.workflow_repo_service.get_previous_workflow_run(current_workflow_run)
        )
        return self.deployments_adapter.adapt(workflow_run_previous_workflow_run)
