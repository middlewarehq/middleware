from os import getenv
from datetime import datetime
from typing import List, Tuple

from mhq.service.settings.configuration_settings import (
    SettingsService,
    get_settings_service,
)
from mhq.store.models.settings.configuration_settings import (
    SettingType,
)
from mhq.store.models.settings.enums import EntityType
from mhq.service.code import get_code_integration_service
from mhq.service.workflows.integration import get_workflows_integrations_service
from mhq.service.workflows.sync.etl_provider_handler import WorkflowProviderETLHandler
from mhq.service.workflows.sync.etl_workflows_factory import WorkflowETLFactory
from mhq.store.models.code import (
    OrgRepo,
    RepoWorkflow,
    RepoWorkflowRunsBookmark,
    RepoWorkflowRuns,
    RepoWorkflowProviders,
)
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.workflows import WorkflowRepoService
from mhq.utils.log import LOG
from mhq.service.settings.models import DefaultSyncDaysSetting
from mhq.service.bookmark import BookmarkService, BookmarkType, get_bookmark_service


class WorkflowETLHandler:

    DEFAULT_SYNC_DAYS = (
        int(getenv("DEFAULT_SYNC_DAYS")) if getenv("DEFAULT_SYNC_DAYS") else 31
    )

    def __init__(
        self,
        code_repo_service: CodeRepoService,
        workflow_repo_service: WorkflowRepoService,
        etl_factory: WorkflowETLFactory,
        settings_service: SettingsService,
        bookmark_service: BookmarkService,
    ):
        self.code_repo_service = code_repo_service
        self.workflow_repo_service = workflow_repo_service
        self.etl_factory = etl_factory
        self.settings_service = settings_service
        self.bookmark_service = bookmark_service

    def sync_org_workflows(self, org_id: str):
        active_repo_workflows: List[Tuple[OrgRepo, RepoWorkflow]] = (
            self._get_active_repo_workflows(org_id)
        )

        for org_repo, repo_workflow in active_repo_workflows:
            try:
                self._sync_repo_workflow(org_repo, repo_workflow)
            except Exception as e:
                LOG.error(
                    f"Error syncing workflow for repo {repo_workflow.org_repo_id}: {str(e)}"
                )
                continue

    def _get_active_repo_workflows(
        self, org_id: str
    ) -> List[Tuple[OrgRepo, RepoWorkflow]]:
        code_providers: List[str] = get_code_integration_service().get_org_providers(
            org_id
        )
        workflow_providers: List[str] = (
            get_workflows_integrations_service().get_org_providers(org_id)
        )
        if not code_providers or not workflow_providers:
            LOG.info(f"No workflow integrations found for org {org_id}")
            return []

        org_repos: List[OrgRepo] = self.code_repo_service.get_active_org_repos(org_id)
        repo_ids = [str(repo.id) for repo in org_repos]
        repo_id_org_repo_map = {str(repo.id): repo for repo in org_repos}
        active_repo_workflows: List[RepoWorkflow] = (
            self.workflow_repo_service.get_active_repo_workflows_by_repo_ids_and_providers(
                repo_ids,
                [RepoWorkflowProviders(provider) for provider in workflow_providers],
            )
        )
        org_repo_workflows: List[Tuple[OrgRepo, RepoWorkflow]] = []
        for repo_workflow in active_repo_workflows:
            org_repo_workflows.append(
                (repo_id_org_repo_map[str(repo_workflow.org_repo_id)], repo_workflow)
            )
        return org_repo_workflows

    def _sync_repo_workflow(self, org_repo: OrgRepo, repo_workflow: RepoWorkflow):
        workflow_provider: RepoWorkflowProviders = repo_workflow.provider
        etl_service: WorkflowProviderETLHandler = self.etl_factory(
            workflow_provider.name
        )
        if not etl_service.check_pat_validity():
            LOG.error("Invalid PAT for code provider")
            return
        try:
            default_sync_days_setting: DefaultSyncDaysSetting = (
                self.settings_service.get_or_set_default_settings(
                    setting_type=SettingType.DEFAULT_SYNC_DAYS_SETTING,
                    entity_type=EntityType.ORG,
                    entity_id=str(org_repo.org_id),
                ).specific_settings
            )
            default_sync_days = default_sync_days_setting.default_sync_days

            bookmark: datetime = self.bookmark_service.get_bookmark(
                str(repo_workflow.id),
                BookmarkType.REPO_WORKFLOW_BOOKMARK,
                repo_workflow.provider,
                default_sync_days,
            )
            repo_workflow_runs: List[RepoWorkflowRuns]
            repo_workflow_runs, bookmark = etl_service.get_workflow_runs(
                org_repo, repo_workflow, bookmark
            )
            self.workflow_repo_service.save_repo_workflow_runs(repo_workflow_runs)
            self.bookmark_service.update_bookmark(
                str(repo_workflow.id),
                BookmarkType.REPO_WORKFLOW_BOOKMARK,
                repo_workflow.provider,
                bookmark,
            )
        except Exception as e:
            LOG.error(
                f"Error syncing workflow for repo {repo_workflow.org_repo_id}: {str(e)}"
            )
            return


def sync_org_workflows(org_id: str):
    workflow_providers: List[str] = (
        get_workflows_integrations_service().get_org_providers(org_id)
    )
    if not workflow_providers:
        LOG.info(f"No workflow integrations found for org {org_id}")
        return
    code_repo_service = CodeRepoService()
    workflow_repo_service = WorkflowRepoService()
    etl_factory = WorkflowETLFactory(org_id)
    workflow_etl_handler = WorkflowETLHandler(
        code_repo_service,
        workflow_repo_service,
        etl_factory,
        get_settings_service(),
        get_bookmark_service(),
    )
    workflow_etl_handler.sync_org_workflows(org_id)
