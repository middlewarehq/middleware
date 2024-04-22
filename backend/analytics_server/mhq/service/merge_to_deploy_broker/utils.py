from datetime import datetime
from typing import List

from mhq.store.models.code import (
    PullRequest,
    PullRequestState,
    BookmarkMergeToDeployBroker,
)
from mhq.store.repos.code import CodeRepoService
from mhq.utils.lock import get_redis_lock_service, RedisLockService


class MergeToDeployBrokerUtils:
    def __init__(
        self, code_repo_service: CodeRepoService, redis_lock_service: RedisLockService
    ):
        self.code_repo_service = code_repo_service
        self.redis_lock_service = redis_lock_service

    def pushback_merge_to_deploy_bookmark(self, repo_id: str, prs: List[PullRequest]):
        with self.redis_lock_service.acquire_lock(
            "{org_repo}:" + f"{repo_id}:merge_to_deploy_broker"
        ):
            self._pushback_merge_to_deploy_bookmark(repo_id, prs)

    def _pushback_merge_to_deploy_bookmark(self, repo_id: str, prs: List[PullRequest]):
        merged_prs = [pr for pr in prs if pr.state == PullRequestState.MERGED]
        if not merged_prs:
            return

        min_merged_time: datetime = min([pr.state_changed_at for pr in merged_prs])

        merge_to_deploy_broker_bookmark: BookmarkMergeToDeployBroker = (
            self.code_repo_service.get_merge_to_deploy_broker_bookmark(repo_id)
        )
        if not merge_to_deploy_broker_bookmark:
            merge_to_deploy_broker_bookmark = BookmarkMergeToDeployBroker(
                repo_id=repo_id, bookmark=min_merged_time.isoformat()
            )

        self.code_repo_service.update_merge_to_deploy_broker_bookmark(
            merge_to_deploy_broker_bookmark
        )


def get_merge_to_deploy_broker_utils_service():
    return MergeToDeployBrokerUtils(
        CodeRepoService(), redis_lock_service=get_redis_lock_service()
    )
