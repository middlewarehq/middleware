from datetime import timedelta
from typing import List, Tuple
from uuid import uuid4

from dora.service.code.integration import get_code_integration_service
from dora.service.workflows.integration import get_workflows_integrations_service
from dora.service.workflows.sync.etl_provider_handler import WorkflowProviderETLHandler
from dora.store.models.code import (
    OrgRepo,
    RepoWorkflow,
    RepoWorkflowRunsBookmark,
    RepoWorkflowRuns,
)
from dora.store.repos.code import CodeRepoService
from dora.store.repos.workflows import WorkflowRepoService
from dora.utils.log import LOG
from dora.utils.time import time_now


class WorkflowETLHandler:
    def __init__(
        self,
        code_repo_service: CodeRepoService,
        workflow_repo_service: WorkflowRepoService,
        etl_service: WorkflowProviderETLHandler,
    ):
        self.code_repo_service = code_repo_service
        self.workflow_repo_service = workflow_repo_service
        self.etl_service = etl_service

    def sync_org_workflows(self, org_id: str):
        active_repo_workflows: List[
            Tuple[OrgRepo, RepoWorkflow]
        ] = self._get_active_repo_workflows(org_id)

        for org_repo, repo_workflow in active_repo_workflows:
            try:
                self._sync_repo_workflow(org_repo, repo_workflow)
            except Exception as e:
                LOG.error(
                    f"Error syncing workflow for repo {repo_workflow.repo_id}: {str(e)}"
                )
                continue

    def _get_active_repo_workflows(
        self, org_id: str
    ) -> List[Tuple[OrgRepo, RepoWorkflow]]:
        code_providers: List[str] = get_code_integration_service().get_org_providers(
            org_id
        )
        workflow_providers: List[
            str
        ] = get_workflows_integrations_service().get_org_providers(org_id)
        if not code_providers or not workflow_providers:
            LOG.info(f"No workflow integrations found for org {org_id}")
            return []

        org_repos: List[OrgRepo] = self.code_repo_service.get_active_org_repos(org_id)
        repo_ids = [str(repo.id) for repo in org_repos]
        repo_id_org_repo_map = {str(repo.id): repo for repo in org_repos}
        active_repo_workflows: List[
            RepoWorkflow
        ] = self.workflow_repo_service.get_active_repo_workflows_by_repo_ids_and_providers(
            repo_ids, workflow_providers
        )
        org_repo_workflows: List[Tuple[OrgRepo, RepoWorkflow]] = []
        for repo_workflow in active_repo_workflows:
            org_repo_workflows.append(
                (repo_id_org_repo_map[str(repo_workflow.repo_id)], repo_workflow)
            )
        return org_repo_workflows

    def _sync_repo_workflow(self, org_repo: OrgRepo, repo_workflow: RepoWorkflow):
        try:
            bookmark: RepoWorkflowRunsBookmark = self.__get_repo_workflow_bookmark(
                repo_workflow
            )
            repo_workflow_runs: List[RepoWorkflowRuns]
            repo_workflow_runs, bookmark = self.etl_service.get_workflow_runs(
                org_repo, repo_workflow, bookmark
            )
            self.workflow_repo_service.save_repo_workflow_runs(repo_workflow_runs)
            self.workflow_repo_service.update_repo_workflow_runs_bookmark(bookmark)
        except Exception as e:
            LOG.error(
                f"Error syncing workflow for repo {repo_workflow.repo_id}: {str(e)}"
            )
            return

    def __get_repo_workflow_bookmark(
        self, repo_workflow: RepoWorkflow, default_sync_days: int = 31
    ) -> RepoWorkflowRunsBookmark:
        repo_workflow_bookmark = (
            self.workflow_repo_service.get_repo_workflow_runs_bookmark(repo_workflow.id)
        )
        if not repo_workflow_bookmark:
            bookmark_string = (
                time_now() - timedelta(days=default_sync_days)
            ).isoformat()

            repo_workflow_bookmark = RepoWorkflowRunsBookmark(
                id=uuid4(),
                repo_workflow_id=repo_workflow.id,
                bookmark=bookmark_string,
                created_at=time_now(),
                updated_at=time_now(),
            )
        return repo_workflow_bookmark


def sync_org_workflows(org_id: str):
    workflow_providers: List[
        str
    ] = get_workflows_integrations_service().get_org_providers(org_id)
    if not workflow_providers:
        LOG.info(f"No workflow integrations found for org {org_id}")
        return
    code_repo_service = get_code_integration_service()
    workflow_repo_service = WorkflowRepoService()
    etl_service = WorkflowProviderETLHandler()
    workflow_etl_handler = WorkflowETLHandler(
        code_repo_service, workflow_repo_service, etl_service
    )
    workflow_etl_handler.sync_org_workflows(org_id)
