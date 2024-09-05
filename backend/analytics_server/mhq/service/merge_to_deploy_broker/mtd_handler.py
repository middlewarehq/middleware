from datetime import datetime
from typing import List, Optional

from mhq.service.deployments import DeploymentPRMapperService
from mhq.service.bookmark import BookmarkService, BookmarkType, get_bookmark_service
from mhq.store.models.code import (
    PullRequest,
    OrgRepo,
    RepoWorkflow,
    RepoWorkflowRuns,
    RepoWorkflowRunsStatus,
)
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.workflows import WorkflowRepoService
from mhq.utils.lock import RedisLockService, get_redis_lock_service

DEPLOYMENTS_TO_PROCESS = 500


class MergeToDeployCacheHandler:
    def __init__(
        self,
        org_id: str,
        code_repo_service: CodeRepoService,
        workflow_repo_service: WorkflowRepoService,
        deployment_pr_mapper_service: DeploymentPRMapperService,
        redis_lock_service: RedisLockService,
        bookmark_service: BookmarkService,
    ):
        self.org_id = org_id
        self.code_repo_service = code_repo_service
        self.workflow_repo_service = workflow_repo_service
        self.deployment_pr_mapper_service = deployment_pr_mapper_service
        self.redis_lock_service = redis_lock_service
        self.bookmark_service = bookmark_service

    def process_org_mtd(self):
        org_repos: List[OrgRepo] = self.code_repo_service.get_active_org_repos(
            self.org_id
        )
        for org_repo in org_repos:
            try:
                with self.redis_lock_service.acquire_lock(
                    "{org_repo}:" + f"{str(org_repo.id)}:merge_to_deploy_broker"
                ):
                    self._process_deployments_for_merge_to_deploy_caching(
                        str(org_repo.id)
                    )
            except Exception as e:
                print(f"Error syncing workflow for repo {str(org_repo.id)}: {str(e)}")
                continue

    def _process_deployments_for_merge_to_deploy_caching(self, repo_id: str):
        org_repo: OrgRepo = self.code_repo_service.get_repo_by_id(repo_id)
        if not org_repo:
            Exception(f"Repo with {repo_id} not found")

        repo_workflows: List[RepoWorkflow] = (
            self.workflow_repo_service.get_repo_workflows_by_repo_id(repo_id)
        )
        if not repo_workflows:
            return

        bookmark: Optional[datetime] = self.bookmark_service.get_bookmark(
            repo_id, BookmarkType.MERGE_TO_DEPLOY_BOOKMARK, org_repo.provider
        )

        repo_workflow_runs: List[RepoWorkflowRuns] = (
            self.workflow_repo_service.get_repo_workflow_runs_conducted_after_time(
                repo_id, bookmark, DEPLOYMENTS_TO_PROCESS
            )
        )

        if not repo_workflow_runs:
            return

        for repo_workflow_run in repo_workflow_runs:
            try:
                self._cache_prs_merge_to_deploy_for_repo_workflow_run(
                    repo_id, repo_workflow_run
                )
                conducted_at: datetime = repo_workflow_run.conducted_at
                self.bookmark_service.update_bookmark(
                    repo_id,
                    BookmarkType.MERGE_TO_DEPLOY_BOOKMARK,
                    org_repo.provider,
                    conducted_at,
                )
            except Exception as e:
                raise Exception(f"Error caching prs for repo {repo_id}: {str(e)}")

    def _cache_prs_merge_to_deploy_for_repo_workflow_run(
        self, repo_id: str, repo_workflow_run: RepoWorkflowRuns
    ):
        if repo_workflow_run.status != RepoWorkflowRunsStatus.SUCCESS:
            return

        conducted_at: datetime = repo_workflow_run.conducted_at
        relevant_prs: List[PullRequest] = (
            self.code_repo_service.get_prs_in_repo_merged_before_given_date_with_merge_to_deploy_as_null(
                repo_id, conducted_at
            )
        )
        prs_to_update: List[PullRequest] = (
            self.deployment_pr_mapper_service.get_all_prs_deployed(
                relevant_prs, repo_workflow_run
            )
        )

        for pr in prs_to_update:
            pr.merge_to_deploy = int(
                (conducted_at - pr.state_changed_at).total_seconds()
            )
        self.code_repo_service.update_prs(prs_to_update)


def process_merge_to_deploy_cache(org_id: str):
    merge_to_deploy_cache_handler = MergeToDeployCacheHandler(
        org_id,
        CodeRepoService(),
        WorkflowRepoService(),
        DeploymentPRMapperService(),
        get_redis_lock_service(),
        get_bookmark_service(),
    )
    merge_to_deploy_cache_handler.process_org_mtd()
