from datetime import datetime
from typing import List, Optional

from mhq.store.models.code import (
    PullRequest,
    PullRequestState,
)
from mhq.utils.lock import get_redis_lock_service, RedisLockService
from mhq.service.bookmark import BookmarkService, BookmarkType, get_bookmark_service
from mhq.store.models.code import OrgRepo


class MergeToDeployBrokerUtils:
    def __init__(
        self,
        redis_lock_service: RedisLockService,
        bookmark_service: BookmarkService,
    ):
        self.redis_lock_service = redis_lock_service
        self.bookmark_service = bookmark_service

    def pushback_merge_to_deploy_bookmark(self, repo: OrgRepo, prs: List[PullRequest]):
        repo_id = str(repo.id)
        with self.redis_lock_service.acquire_lock(
            "{org_repo}:" + f"{repo_id}:merge_to_deploy_broker"
        ):
            self._pushback_merge_to_deploy_bookmark(repo, prs)

    def _pushback_merge_to_deploy_bookmark(self, repo: OrgRepo, prs: List[PullRequest]):
        merged_prs = [pr for pr in prs if pr.state == PullRequestState.MERGED]
        if not merged_prs:
            return

        min_merged_time: datetime = min([pr.state_changed_at for pr in merged_prs])
        repo_id = str(repo.id)
        provider = repo.provider
        merge_to_deploy_broker_bookmark: Optional[datetime] = (
            self.bookmark_service.get_bookmark(
                repo_id, BookmarkType.MERGE_TO_DEPLOY_BOOKMARK, provider
            )
        )
        if not merge_to_deploy_broker_bookmark:
            merge_to_deploy_broker_bookmark = min_merged_time

        merge_to_deploy_broker_bookmark = min(
            merge_to_deploy_broker_bookmark,
            min_merged_time,
        )

        self.bookmark_service.update_bookmark(
            repo_id,
            BookmarkType.MERGE_TO_DEPLOY_BOOKMARK,
            provider,
            merge_to_deploy_broker_bookmark,
        )


def get_merge_to_deploy_broker_utils_service():
    return MergeToDeployBrokerUtils(get_redis_lock_service(), get_bookmark_service())
