from collections import defaultdict
from uuid import uuid4
from mhq.utils.time import Interval
from mhq.exceptions.webhook import PayloadLimitExceededError, InvalidPayloadError
from mhq.store.models.code.workflows.enums import RepoWorkflowRunsStatus
from mhq.service.webhooks.factory_abstract import WebhookEventHandler
from mhq.store.models.webhooks.webhooks import WebhookEvent, WebhookEventRequestType
from mhq.service.webhooks.models.webhook import WebhookWorkflowRun
from typing import Any, List, Dict, Set, Tuple
from mhq.store.models.code.workflows.workflows import (
    RepoWorkflow,
    RepoWorkflowRuns,
    RepoWorkflowType,
    RepoWorkflowProviders,
)
from mhq.service.webhooks.webhook_event_service import (
    get_webhook_service,
    WebhookEventService,
)
from mhq.service.deployments.deployment_service import (
    get_deployments_service,
    DeploymentsService,
)
from mhq.service.code.repository_service import (
    get_repository_service,
    RepositoryService,
)
from sqlalchemy.exc import IntegrityError


class WebhookWorkflowHandler(WebhookEventHandler):
    def __init__(
        self,
        webhook_event_service: WebhookEventService,
        repository_service: RepositoryService,
        deployments_service: DeploymentsService,
    ):
        self._webhook_event_service: WebhookEventService = webhook_event_service
        self._repository_service: RepositoryService = repository_service
        self._deployments_service: DeploymentsService = deployments_service

    def validate_payload(self, payload: Dict[str, List[Any]]):
        workflow_runs = payload["workflow_runs"]

        if not workflow_runs:
            InvalidPayloadError()
        if len(workflow_runs) > 500:
            PayloadLimitExceededError()

        self._adapt_payload(payload)

    def save_webhook_event(self, org_id: str, payload: Dict[str, List[Any]]) -> str:
        webhook_event = WebhookEvent(
            org_id=org_id,
            request_type=WebhookEventRequestType.WORKFLOW,
            request_data=payload,
        )
        return self._webhook_event_service.create_webhook_event(webhook_event)

    def process_webhook_event(self, webhook_event: WebhookEvent):
        workflow_runs = self._adapt_payload(webhook_event.request_data)

        repo_urls_set: Set[str] = set()

        for workflow in workflow_runs:
            for repo_url in workflow.repo_urls:
                repo_urls_set.add(repo_url)

        repo_url_to_repo_id_map: Dict[str, str] = (
            self._repository_service.get_repo_url_to_repo_id_map(
                org_id=str(webhook_event.org_id), repo_urls=list(repo_urls_set)
            )
        )

        for repo_url in list(repo_urls_set):
            if repo_url not in repo_url_to_repo_id_map:
                raise Exception(f"Repo url '{repo_url}' doesn't exist in the system.")

        repo_id_workflow_name_to_workflow_runs_map: Dict[
            Tuple[str, str], List[WebhookWorkflowRun]
        ] = defaultdict(list)
        for workflow in workflow_runs:
            for repo_url in workflow.repo_urls:
                repo_id = repo_url_to_repo_id_map[repo_url]
                key = (repo_id, workflow.workflow_name)
                repo_id_workflow_name_to_workflow_runs_map[key].append(workflow)

        try:
            repo_workflows, repo_workflow_runs = (
                self._get_repo_workflows_and_repo_workflow_runs(
                    repo_id_workflow_name_to_workflow_runs_map
                )
            )
            self._deployments_service.save_repo_workflow_and_workflow_runs(
                repo_workflows, repo_workflow_runs
            )
        except IntegrityError:
            repo_workflows, repo_workflow_runs = (
                self._get_repo_workflows_and_repo_workflow_runs(
                    repo_id_workflow_name_to_workflow_runs_map
                )
            )
            self._deployments_service.save_repo_workflow_and_workflow_runs(
                repo_workflows, repo_workflow_runs
            )

    def prune_synced_data(self):
        pass

    def _get_repo_workflows_and_repo_workflow_runs(
        self,
        repo_id_workflow_name_to_workflow_runs_map: Dict[
            Tuple[str, str], List[WebhookWorkflowRun]
        ],
    ) -> Tuple[List[RepoWorkflow], List[RepoWorkflowRuns]]:

        repo_workflows: List[RepoWorkflow] = []
        repo_workflow_runs: List[RepoWorkflowRuns] = []

        for key, workflow_runs in repo_id_workflow_name_to_workflow_runs_map.items():
            repo_id, workflow_name = key
            workflow_run_id_to_workflow_map: Dict[str, RepoWorkflowRuns] = {}

            repo_workflow = (
                self._deployments_service.get_repo_workflow_by_provider_workflow_id(
                    repo_id=repo_id,
                    provider=RepoWorkflowProviders.WEBHOOK,
                    provider_workflow_id=workflow_name,
                )
            )

            if repo_workflow:
                workflow_run_id_to_workflow_map = (
                    self._deployments_service.get_workflow_run_id_to_workflow_map(
                        repo_workflow_id=str(repo_workflow.id)
                    )
                )
            else:
                repo_workflow = RepoWorkflow(
                    id=uuid4(),
                    name=workflow_name,
                    org_repo_id=repo_id,
                    type=RepoWorkflowType.DEPLOYMENT,
                    provider=RepoWorkflowProviders.WEBHOOK,
                    provider_workflow_id=workflow_name,
                    is_active=False,
                )
                repo_workflows.append(repo_workflow)

            for workflow in workflow_runs:
                provider_unique_id = workflow.workflow_run_unique_id

                if provider_unique_id in workflow_run_id_to_workflow_map:
                    existing_repo_workflow_run = workflow_run_id_to_workflow_map[
                        provider_unique_id
                    ]
                    updated_workflow_run = self._check_and_update_duration(
                        existing_workflow_run=existing_repo_workflow_run,
                        current_workflow_run=workflow,
                        repo_workflow_id=str(repo_workflow.id),
                    )
                    if updated_workflow_run:
                        # Remove existing workflow run (if any) from repo_workflow_runs
                        repo_workflow_runs = [
                            wr
                            for wr in repo_workflow_runs
                            if wr.provider_workflow_run_id != provider_unique_id
                        ]
                        # Update the map and append the updated run
                        workflow_run_id_to_workflow_map[provider_unique_id] = (
                            updated_workflow_run
                        )
                        repo_workflow_runs.append(updated_workflow_run)
                else:
                    repo_workflow_run = self._adapt_webhook_workflow_run(
                        workflow, str(repo_workflow.id)
                    )
                    workflow_run_id_to_workflow_map[provider_unique_id] = (
                        repo_workflow_run
                    )
                    repo_workflow_runs.append(repo_workflow_run)

        return repo_workflows, repo_workflow_runs

    def _adapt_payload(self, payload: Dict[str, List[Any]]) -> List[WebhookWorkflowRun]:
        workflow_runs: List[WebhookWorkflowRun] = []

        for wf in payload["workflow_runs"]:
            workflow_runs.append(
                WebhookWorkflowRun(
                    workflow_name=wf["workflow_name"],
                    repo_urls=wf["repo_urls"],
                    event_actor=wf["event_actor"],
                    head_branch=wf["head_branch"],
                    workflow_run_unique_id=wf["workflow_run_unique_id"],
                    status=RepoWorkflowRunsStatus(wf["status"]),
                    workflow_run_conducted_at=wf["workflow_run_conducted_at"],
                    duration=int(wf.get("duration")) if wf.get("duration") else None,
                    html_url=wf.get("html_url", None),
                )
            )

        return workflow_runs

    def _adapt_webhook_workflow_run(
        self, workflow: WebhookWorkflowRun, repo_workflow_id: str
    ):
        return RepoWorkflowRuns(
            repo_workflow_id=repo_workflow_id,
            provider_workflow_run_id=workflow.workflow_run_unique_id,
            event_actor=workflow.event_actor,
            head_branch=workflow.head_branch,
            status=workflow.status,
            conducted_at=workflow.workflow_run_conducted_at,
            duration=workflow.duration,
            html_url=workflow.html_url,
        )

    def _check_and_update_duration(
        self,
        existing_workflow_run: RepoWorkflowRuns,
        current_workflow_run: WebhookWorkflowRun,
        repo_workflow_id: str,
    ) -> RepoWorkflowRuns | None:
        if (
            existing_workflow_run.status == RepoWorkflowRunsStatus.PENDING
            and current_workflow_run.status != RepoWorkflowRunsStatus.PENDING
            and not current_workflow_run.duration
        ):
            interval = Interval(
                from_time=existing_workflow_run.conducted_at,
                to_time=current_workflow_run.workflow_run_conducted_at,
            )
            current_workflow_run.duration = int(
                interval.duration.total_seconds() * 1000
            )
            return self._adapt_webhook_workflow_run(
                current_workflow_run, repo_workflow_id
            )
        elif (
            current_workflow_run.status == RepoWorkflowRunsStatus.PENDING
            and existing_workflow_run.status != RepoWorkflowRunsStatus.PENDING
            and not existing_workflow_run.duration
        ):
            interval = Interval(
                from_time=current_workflow_run.workflow_run_conducted_at,
                to_time=existing_workflow_run.conducted_at,
            )
            existing_workflow_run.duration = int(
                interval.duration.total_seconds() * 1000
            )
            return existing_workflow_run

        return None


def get_webhook_workflow_handler() -> WebhookWorkflowHandler:
    return WebhookWorkflowHandler(
        get_webhook_service(),
        get_repository_service(),
        get_deployments_service(),
    )
