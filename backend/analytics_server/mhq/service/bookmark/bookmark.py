from os import getenv
from datetime import datetime, timedelta
from typing import Optional

from mhq.service.bookmark.bookmark_types import BookmarkType
from mhq.store.repos.code import CodeRepoService
from mhq.store.models.code import (
    CodeBookmarkType,
    Bookmark,
    RepoWorkflowRunsBookmark,
    BookmarkMergeToDeployBroker,
)
from mhq.utils.time import time_now
from mhq.store.repos.workflows import WorkflowRepoService
from mhq.utils.string import uuid4_str
from mhq.store.models.incidents import (
    IncidentsBookmark,
    IncidentBookmarkType,
    IncidentProvider,
)
from mhq.store.repos.incidents import IncidentsRepoService


class BookmarkService:

    DEFAULT_SYNC_DAYS = (
        int(getenv("DEFAULT_SYNC_DAYS")) if getenv("DEFAULT_SYNC_DAYS") else 31
    )

    def __init__(
        self,
        code_repo_service: CodeRepoService,
        workflow_repo_service: WorkflowRepoService,
        incident_repo_service: IncidentsRepoService,
    ):
        self._code_repo_service = code_repo_service
        self._workflow_repo_service = workflow_repo_service
        self._incident_repo_service = incident_repo_service

    def get_bookmark(
        self,
        entity_id: str,
        bookmark_type: BookmarkType,
        provider: str,
        default_sync_days: int = DEFAULT_SYNC_DAYS,
    ) -> Optional[datetime]:

        if bookmark_type == BookmarkType.ORG_REPO_BOOKMARK:
            return datetime.fromisoformat(
                self._get_org_repo_bookmark(entity_id, default_sync_days).bookmark
            )

        if bookmark_type == BookmarkType.REPO_WORKFLOW_BOOKMARK:
            return datetime.fromisoformat(
                self._get_workflow_bookmark(entity_id, default_sync_days).bookmark
            )

        if bookmark_type == BookmarkType.INCIDENT_SERVICE_BOOKMARK:
            return self._get_incident_service_bookmark(
                entity_id, provider, default_sync_days
            ).bookmark

        if bookmark_type == BookmarkType.MERGE_TO_DEPLOY_BOOKMARK:
            mtd_broker_bookmark = self._get_merge_to_deploy_broker_bookmark(
                entity_id
            ).bookmark
            return (
                datetime.fromisoformat(mtd_broker_bookmark)
                if mtd_broker_bookmark
                else mtd_broker_bookmark
            )

        raise ValueError(f"Unsupported BookmarkType: {bookmark_type}.")

    def update_bookmark(
        self,
        entity_id: str,
        bookmark_type: BookmarkType,
        provider: str,
        bookmark_timestamp: datetime,
    ):

        if bookmark_type == BookmarkType.ORG_REPO_BOOKMARK:
            return self._update_org_repo_bookmark(entity_id, bookmark_timestamp)

        if bookmark_type == BookmarkType.REPO_WORKFLOW_BOOKMARK:
            return self._update_workflow_bookmark(entity_id, bookmark_timestamp)

        if bookmark_type == BookmarkType.INCIDENT_SERVICE_BOOKMARK:
            return self._update_incident_service_bookmark(
                entity_id, provider, bookmark_timestamp
            )

        if bookmark_type == BookmarkType.MERGE_TO_DEPLOY_BOOKMARK:
            return self._update_merge_to_deploy_broker_bookmark(
                entity_id, bookmark_timestamp
            )

        raise ValueError(f"Unsupported BookmarkType: {bookmark_type}.")

    def reset_org_bookmarks(self, org_id: str, bookmark_timestamp: datetime):
        self._reset_repo_bookmarks(org_id, bookmark_timestamp)
        self._reset_incident_bookmarks(org_id, bookmark_timestamp)
        self._reset_workflow_bookmarks(org_id, bookmark_timestamp)
        self._reset_merge_to_deploy_broker_bookmarks(org_id, bookmark_timestamp)

    def _get_org_repo_bookmark(
        self, repo_id: str, default_sync_days: int = DEFAULT_SYNC_DAYS
    ) -> Bookmark:
        bookmark = self._code_repo_service.get_org_repo_bookmark(
            repo_id, CodeBookmarkType.PR
        )
        if not bookmark:
            default_pr_bookmark = time_now() - timedelta(days=default_sync_days)
            bookmark = Bookmark(
                repo_id=repo_id,
                type=CodeBookmarkType.PR.value,
                bookmark=default_pr_bookmark.isoformat(),
            )
        return bookmark

    def _update_org_repo_bookmark(self, repo_id: str, bookmark_time_stamp: datetime):

        bookmark = self._get_org_repo_bookmark(repo_id)
        bookmark.bookmark = bookmark_time_stamp.isoformat()
        bookmark.updated_at = time_now()

        self._code_repo_service.update_org_repo_bookmark(bookmark)

    def _get_workflow_bookmark(
        self, repo_workflow_id: str, default_sync_days: int = DEFAULT_SYNC_DAYS
    ) -> RepoWorkflowRunsBookmark:
        repo_workflow_bookmark = (
            self._workflow_repo_service.get_repo_workflow_runs_bookmark(
                repo_workflow_id
            )
        )
        if not repo_workflow_bookmark:
            default_workflow_bookmark = time_now() - timedelta(days=default_sync_days)

            repo_workflow_bookmark = RepoWorkflowRunsBookmark(
                id=uuid4_str(),
                repo_workflow_id=repo_workflow_id,
                bookmark=default_workflow_bookmark.isoformat(),
                created_at=time_now(),
                updated_at=time_now(),
            )
        return repo_workflow_bookmark

    def _update_workflow_bookmark(
        self, repo_workflow_id: str, bookmark_time_stamp: datetime
    ):
        repo_workflow_bookmark = self._get_workflow_bookmark(repo_workflow_id)
        repo_workflow_bookmark.bookmark = bookmark_time_stamp.isoformat()
        repo_workflow_bookmark.updated_at = time_now()
        self._workflow_repo_service.update_repo_workflow_runs_bookmark(
            repo_workflow_bookmark
        )

    def _get_incident_service_bookmark(
        self, service_id: str, provider: str, default_sync_days: int = DEFAULT_SYNC_DAYS
    ) -> IncidentsBookmark:

        incident_provider = IncidentProvider(provider)

        bookmark = self._incident_repo_service.get_incidents_bookmark(
            service_id, IncidentBookmarkType.SERVICE, incident_provider
        )
        if not bookmark:
            default_incident_bookmark = time_now() - timedelta(days=default_sync_days)
            bookmark = IncidentsBookmark(
                id=uuid4_str(),
                entity_id=service_id,
                entity_type=IncidentBookmarkType.SERVICE,
                provider=incident_provider,
                bookmark=default_incident_bookmark,
            )
        return bookmark

    def _update_incident_service_bookmark(
        self, service_id: str, provider: str, bookmark_time_stamp: datetime
    ):
        bookmark = self._get_incident_service_bookmark(service_id, provider)
        bookmark.bookmark = bookmark_time_stamp
        bookmark.updated_at = time_now()
        self._incident_repo_service.save_incidents_bookmark(bookmark)

    def _get_merge_to_deploy_broker_bookmark(
        self, repo_id: str
    ) -> BookmarkMergeToDeployBroker:
        broker_bookmark: BookmarkMergeToDeployBroker = (
            self._code_repo_service.get_merge_to_deploy_broker_bookmark(repo_id)
        )
        if not broker_bookmark:
            broker_bookmark = BookmarkMergeToDeployBroker(repo_id=repo_id)

        return broker_bookmark

    def _update_merge_to_deploy_broker_bookmark(
        self, repo_id: str, bookmark_time_stamp: datetime
    ):

        broker_bookmark = self._get_merge_to_deploy_broker_bookmark(repo_id)
        broker_bookmark.bookmark = bookmark_time_stamp.isoformat()
        broker_bookmark.updated_at = time_now()

        self._code_repo_service.update_merge_to_deploy_broker_bookmark(broker_bookmark)

    def _reset_repo_bookmarks(self, org_id: str, bookmark_timestamp: datetime):

        org_repo_bookmarks = self._code_repo_service.get_all_org_repo_bookmarks(org_id)

        for bookmark in org_repo_bookmarks:
            bookmark.bookmark = bookmark_timestamp.isoformat()
            bookmark.updated_at = time_now()

        self._code_repo_service.update_org_repo_bookmarks(org_repo_bookmarks)

    def _reset_workflow_bookmarks(self, org_id: str, bookmark_timestamp: datetime):

        workflow_bookmarks = (
            self._workflow_repo_service.get_all_repo_workflow_runs_bookmark(org_id)
        )

        for bookmark in workflow_bookmarks:
            bookmark.bookmark = bookmark_timestamp.isoformat()
            bookmark.updated_at = time_now()

        self._workflow_repo_service.update_repo_workflow_runs_bookmarks(
            workflow_bookmarks
        )

    def _reset_incident_bookmarks(self, org_id: str, bookmark_timestamp: datetime):

        incident_bookmarks = (
            self._incident_repo_service.get_all_org_incidents_bookmarks(org_id)
        )

        for bookmark in incident_bookmarks:
            bookmark.bookmark = bookmark_timestamp
            bookmark.updated_at = time_now()

        self._incident_repo_service.save_incidents_bookmarks(incident_bookmarks)

    def _reset_merge_to_deploy_broker_bookmarks(
        self, org_id: str, bookmark_timestamp: datetime
    ):

        merge_to_deploy_broker_bookmarks = (
            self._code_repo_service.get_all_org_merge_to_deploy_broker_bookmarks(org_id)
        )

        for bookmark in merge_to_deploy_broker_bookmarks:
            bookmark.bookmark = bookmark_timestamp.isoformat()
            bookmark.updated_at = time_now()

        self._code_repo_service.update_merge_to_deploy_broker_bookmarks(
            merge_to_deploy_broker_bookmarks
        )


def get_bookmark_service():

    return BookmarkService(
        CodeRepoService(), WorkflowRepoService(), IncidentsRepoService()
    )
