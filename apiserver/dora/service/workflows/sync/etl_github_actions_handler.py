from datetime import datetime
from typing import Dict, Optional, List, Tuple
from uuid import uuid4

import pytz

from dora.exapi.github import GithubApiService
from dora.service.workflows.sync.etl_provider_handler import WorkflowProviderETLHandler
from dora.store.models import UserIdentityProvider
from dora.store.models.code import (
    RepoWorkflowProviders,
    RepoWorkflowRunsStatus,
    RepoWorkflowRuns,
    OrgRepo,
    RepoWorkflowRunsBookmark,
    RepoWorkflow,
)
from dora.store.repos.core import CoreRepoService
from dora.store.repos.workflows import WorkflowRepoService
from dora.utils.log import LOG
from dora.utils.time import ISO_8601_DATE_FORMAT, time_now

DEFAULT_WORKFLOW_SYNC_DAYS = 31
WORKFLOW_PROCESSING_CHUNK_SIZE = 100


class GithubActionsETLHandler(WorkflowProviderETLHandler):
    def __init__(
        self,
        org_id: str,
        github_api_service: GithubApiService,
        workflow_repo_service: WorkflowRepoService,
    ):
        self.org_id = org_id
        self._api: GithubApiService = github_api_service
        self._workflow_repo_service = workflow_repo_service
        self._provider = RepoWorkflowProviders.GITHUB_ACTIONS.value

    def check_pat_validity(self) -> bool:
        """
        This method checks if the PAT is valid.
        :returns: PAT details
        :raises: Exception if PAT is invalid
        """
        is_valid = self._api.check_pat()
        if not is_valid:
            raise Exception("Github Personal Access Token is invalid")
        return is_valid

    def get_workflow_runs(
        self,
        org_repo: OrgRepo,
        repo_workflow: RepoWorkflow,
        bookmark: RepoWorkflowRunsBookmark,
    ) -> Tuple[List[RepoWorkflowRuns], RepoWorkflowRunsBookmark]:
        """
        This method returns all workflow runs of a repo's workflow. After the bookmark date.
        :param org_repo: OrgRepo object to get workflow runs for
        :param repo_workflow: RepoWorkflow object to get workflow runs for
        :param bookmark: Bookmark object to get all workflow runs after this date
        :return: Workflow runs, Bookmark object
        """
        bookmark_time_stamp = datetime.fromisoformat(bookmark.bookmark)
        try:
            github_workflow_runs = self._api.get_workflow_runs(
                org_repo.org_name,
                org_repo.name,
                repo_workflow.provider_workflow_id,
                bookmark_time_stamp,
            )
        except Exception as e:
            raise Exception(
                f"[GitHub Sync Repo Workflow Worker] Error fetching workflow {str(repo_workflow.id)} "
                f"for repo {str(org_repo.repo_id)}: {str(e)}"
            )

        if not github_workflow_runs:
            LOG.info(
                f"[GitHub Sync Repo Workflow Worker] No Workflow Runs found for "
                f"Workflow: {str(repo_workflow.provider_workflow_id)}. Repo: {org_repo.org_name}/{org_repo.name}. "
                f"Org: {self.org_id}"
            )
            return [], bookmark

        bookmark.bookmark = self._get_new_bookmark_time_stamp(
            github_workflow_runs
        ).isoformat()

        repo_workflow_runs = [
            self._adapt_github_workflows_to_workflow_runs(
                str(repo_workflow.id), workflow_run
            )
            for workflow_run in github_workflow_runs
        ]

        return repo_workflow_runs, bookmark

    def _get_new_bookmark_time_stamp(
        self, github_workflow_runs: List[Dict]
    ) -> datetime:
        """
        This method returns the new bookmark timestamp for the workflow runs.
        It returns the minimum timestamp of the pending jobs if there are any pending jobs.
        This is done because there might be a workflow run that is still pending, and we
        want to fetch it in the next sync.
        """
        pending_job_timestamps = [
            self._get_datetime_from_gh_datetime(workflow_run["created_at"])
            for workflow_run in github_workflow_runs
            if workflow_run["status"] != "completed"
        ]
        return min(pending_job_timestamps) if pending_job_timestamps else time_now()

    def _adapt_github_workflows_to_workflow_runs(
        self, repo_workflow_id: str, github_workflow_run: Dict
    ) -> RepoWorkflowRuns:
        repo_workflow_run_in_db = self._workflow_repo_service.get_repo_workflow_run_by_provider_workflow_run_id(
            repo_workflow_id, str(github_workflow_run["id"])
        )
        if repo_workflow_run_in_db:
            workflow_run_id = repo_workflow_run_in_db.id
        else:
            workflow_run_id = uuid4()
        return RepoWorkflowRuns(
            id=workflow_run_id,
            repo_workflow_id=repo_workflow_id,
            provider_workflow_run_id=str(github_workflow_run["id"]),
            event_actor=github_workflow_run["actor"]["login"],
            head_branch=github_workflow_run["head_branch"],
            status=self._get_repo_workflow_status(github_workflow_run),
            created_at=time_now(),
            updated_at=time_now(),
            conducted_at=self._get_datetime_from_gh_datetime(
                github_workflow_run["run_started_at"]
            ),
            duration=self._get_repo_workflow_run_duration(github_workflow_run),
            meta=github_workflow_run,
            html_url=github_workflow_run["html_url"],
        )

    @staticmethod
    def _get_repo_workflow_status(github_workflow: Dict) -> RepoWorkflowRunsStatus:
        if github_workflow["status"] != "completed":
            return RepoWorkflowRunsStatus.PENDING
        if github_workflow["conclusion"] == "success":
            return RepoWorkflowRunsStatus.SUCCESS
        return RepoWorkflowRunsStatus.FAILURE

    def _get_repo_workflow_run_duration(
        self, github_workflow_run: Dict
    ) -> Optional[int]:

        if not (
            github_workflow_run.get("updated_at")
            and github_workflow_run.get("run_started_at")
        ):
            return None

        workflow_run_updated_at = self._get_datetime_from_gh_datetime(
            github_workflow_run.get("updated_at")
        )
        workflow_run_conducted_at = self._get_datetime_from_gh_datetime(
            github_workflow_run.get("run_started_at")
        )
        return int(
            (workflow_run_updated_at - workflow_run_conducted_at).total_seconds()
        )

    @staticmethod
    def _get_datetime_from_gh_datetime(datetime_str: str) -> datetime:
        return datetime.strptime(datetime_str, ISO_8601_DATE_FORMAT).astimezone(
            tz=pytz.UTC
        )


def get_github_actions_etl_handler(org_id):
    def _get_access_token():
        core_repo_service = CoreRepoService()
        access_token = core_repo_service.get_access_token(
            org_id, UserIdentityProvider.GITHUB
        )
        if not access_token:
            raise Exception(
                f"Access token not found for org {org_id} and provider {UserIdentityProvider.GITHUB.value}"
            )
        return access_token

    return GithubActionsETLHandler(
        org_id, GithubApiService(_get_access_token()), WorkflowRepoService()
    )
