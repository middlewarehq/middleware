from abc import ABC
from typing import Union, List, Tuple
from dora.store.models.code.enums import PullRequestState
from dora.store.models.code.pull_requests import PullRequest

from dora.store.models.code.workflows.workflows import RepoWorkflow, RepoWorkflowRuns
from dora.service.deployments.models.models import (
    Deployment,
    DeploymentStatus,
    DeploymentType,
)


class DeploymentsAdaptor(ABC):
    def adapt(self, entity: Union[Tuple[RepoWorkflow, RepoWorkflowRuns], PullRequest]):
        pass

    def adapt_many(
        self, entities: List[Union[Tuple[RepoWorkflow, RepoWorkflowRuns], PullRequest]]
    ):
        pass


class DeploymentsAdaptorFactory:
    def __init__(self, deployment_type: DeploymentType):
        self.deployment_type = deployment_type

    def get_adaptor(self) -> DeploymentsAdaptor:
        if self.deployment_type == DeploymentType.WORKFLOW:
            return WorkflowRunsToDeploymentsAdaptor()
        elif self.deployment_type == DeploymentType.PR_MERGE:
            return PullRequestToDeploymentsAdaptor()
        else:
            raise ValueError(
                f"Unsupported deployment type: {self.deployment_type.value}"
            )


class WorkflowRunsToDeploymentsAdaptor(DeploymentsAdaptor):
    def adapt(self, entity: Tuple[RepoWorkflow, RepoWorkflowRuns]):
        repo_workflow, repo_workflow_run = entity
        return Deployment(
            deployment_type=DeploymentType.WORKFLOW,
            repo_id=str(repo_workflow.org_repo_id),
            entity_id=str(repo_workflow_run.id),
            provider=repo_workflow.provider.value,
            actor=repo_workflow_run.event_actor,
            head_branch=repo_workflow_run.head_branch,
            conducted_at=repo_workflow_run.conducted_at,
            duration=repo_workflow_run.duration,
            status=DeploymentStatus(repo_workflow_run.status.value),
            html_url=repo_workflow_run.html_url,
            meta=dict(
                id=str(repo_workflow.id),
                repo_workflow_id=str(repo_workflow_run.repo_workflow_id),
                provider_workflow_run_id=repo_workflow_run.provider_workflow_run_id,
                event_actor=repo_workflow_run.event_actor,
                head_branch=repo_workflow_run.head_branch,
                status=repo_workflow_run.status.value,
                conducted_at=repo_workflow_run.conducted_at.isoformat(),
                duration=repo_workflow_run.duration,
                html_url=repo_workflow_run.html_url,
            ),
        )

    def adapt_many(self, entities: List[Tuple[RepoWorkflow, RepoWorkflowRuns]]):
        return [self.adapt(entity) for entity in entities]


class PullRequestToDeploymentsAdaptor(DeploymentsAdaptor):
    def adapt(self, entity: PullRequest):
        if not self._is_pull_request_merged(entity):
            raise ValueError("Pull request is not merged")
        return Deployment(
            deployment_type=DeploymentType.PR_MERGE,
            repo_id=str(entity.repo_id),
            entity_id=str(entity.id),
            provider=entity.provider,
            actor=entity.username,
            head_branch=entity.base_branch,
            conducted_at=entity.state_changed_at,
            duration=0,
            status=DeploymentStatus.SUCCESS,
            html_url=entity.url,
            meta=dict(
                id=str(entity.id),
                repo_id=str(entity.repo_id),
                number=entity.number,
                provider=entity.provider,
                username=entity.username,
                base_branch=entity.base_branch,
                state_changed_at=entity.state_changed_at.isoformat(),
                url=entity.url,
            ),
        )

    def adapt_many(self, entities: List[PullRequest]):
        return [
            self.adapt(entity)
            for entity in entities
            if self._is_pull_request_merged(entity)
        ]

    def _is_pull_request_merged(self, entity: PullRequest):
        return entity.state == PullRequestState.MERGED
