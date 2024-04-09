from datetime import datetime
from typing import List

from dora.service.deployments import DeploymentPRMapperService
from dora.store.models.code import (
    PullRequest,
    OrgRepo,
    RepoWorkflow,
    BookmarkMergeToDeployBroker,
    RepoWorkflowRuns,
    RepoWorkflowRunsStatus,
)
from dora.store.repos.code import CodeRepoService
from dora.store.repos.workflows import WorkflowRepoService

DEPLOYMENTS_TO_PROCESS = 500


class MergeToDeployCacheHandler:
    def __init__(
        self,
        org_id: str,
        code_repo_service: CodeRepoService,
        workflow_repo_service: WorkflowRepoService,
        deployment_pr_mapper_service: DeploymentPRMapperService,
    ):
        self.org_id = org_id
        self.code_repo_service = code_repo_service
        self.workflow_repo_service = workflow_repo_service
        self.deployment_pr_mapper_service = deployment_pr_mapper_service

    def process_org_mtd(self):
        org_repos: List[OrgRepo] = self.code_repo_service.get_active_org_repos(
            self.org_id
        )
        for org_repo in org_repos:
            try:
                self._process_deployments_for_merge_to_deploy_caching(str(org_repo.id))
            except Exception as e:
                print(f"Error syncing workflow for repo {str(org_repo.id)}: {str(e)}")
                continue

    def _process_deployments_for_merge_to_deploy_caching(self, repo_id: str):
        org_repo: OrgRepo = self.code_repo_service.get_repo_by_id(repo_id)
        if not org_repo:
            Exception(f"Repo with {repo_id} not found")

        repo_workflows: List[
            RepoWorkflow
        ] = self.workflow_repo_service.get_repo_workflows_by_repo_id(repo_id)
        if not repo_workflows:
            return

        broker_bookmark: BookmarkMergeToDeployBroker = (
            self.code_repo_service.get_merge_to_deploy_broker_bookmark(repo_id)
        )
        if not broker_bookmark:
            broker_bookmark = BookmarkMergeToDeployBroker(repo_id=repo_id)

        bookmark_time: datetime = broker_bookmark.bookmark_date

        repo_workflow_runs: List[
            RepoWorkflowRuns
        ] = self.workflow_repo_service.get_repo_workflow_runs_conducted_after_time(
            repo_id, bookmark_time, DEPLOYMENTS_TO_PROCESS
        )

        if not repo_workflow_runs:
            return

        for repo_workflow_run in repo_workflow_runs:
            # TODO: Add a lock
            try:
                self.code_repo_service.get_merge_to_deploy_broker_bookmark(repo_id)
                self._cache_prs_merge_to_deploy_for_repo_workflow_run(
                    repo_id, repo_workflow_run
                )
                conducted_at: datetime = repo_workflow_run.conducted_at
                broker_bookmark.bookmark = conducted_at.isoformat()
                self.code_repo_service.update_merge_to_deploy_broker_bookmark(
                    broker_bookmark
                )
            except Exception as e:
                raise Exception(f"Error caching prs for repo {repo_id}: {str(e)}")

    def _cache_prs_merge_to_deploy_for_repo_workflow_run(
        self, repo_id: str, repo_workflow_run: RepoWorkflowRuns
    ):
        if repo_workflow_run.status != RepoWorkflowRunsStatus.SUCCESS:
            return

        conducted_at: datetime = repo_workflow_run.conducted_at
        relevant_prs: List[
            PullRequest
        ] = self.code_repo_service.get_prs_in_repo_merged_before_given_date_with_merge_to_deploy_as_null(
            repo_id, conducted_at
        )
        prs_to_update: List[
            PullRequest
        ] = self.deployment_pr_mapper_service.get_all_prs_deployed(
            relevant_prs, repo_workflow_run
        )

        for pr in prs_to_update:
            pr.merge_to_deploy = int(
                (conducted_at - pr.state_changed_at).total_seconds()
            )
        self.code_repo_service.update_prs(prs_to_update)


def process_merge_to_deploy_cache(org_id: str):
    merge_to_deploy_cache_handler = MergeToDeployCacheHandler(
        org_id, CodeRepoService(), WorkflowRepoService(), DeploymentPRMapperService()
    )
    merge_to_deploy_cache_handler.process_org_mtd()
