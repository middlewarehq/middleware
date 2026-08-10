# CLUSTOX: Jenkins deployment detection. Implements the same two-method
# contract as GitHub Actions, so nothing downstream of the sync changes.
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from uuid import uuid4

import pytz

from mhq.service.workflows.sync.etl_provider_handler import WorkflowProviderETLHandler
from mhq.store.models.code import (
    OrgRepo,
    RepoWorkflow,
    RepoWorkflowProviders,
    RepoWorkflowRuns,
    RepoWorkflowRunsStatus,
)
from mhq.utils.log import LOG
from mhq.utils.time import time_now

REFS_HEADS_PREFIX = "refs/heads/"
REFS_REMOTES_PREFIX = "refs/remotes/"

# Remote names stripped from a bare "<remote>/<branch>" value. Deliberately a
# whitelist rather than "drop the first segment": branch names legitimately
# contain slashes, and release/2.0 or feature/origin-story must survive intact.
# Anything after an explicit refs/remotes/ prefix is a remote by definition and
# does not need this list.
KNOWN_REMOTE_NAMES = frozenset({"origin", "upstream"})


class JenkinsETLHandler(WorkflowProviderETLHandler):
    def __init__(self, org_id: str, jenkins_api_service, workflow_repo_service):
        self.org_id = org_id
        self._api = jenkins_api_service
        self._workflow_repo_service = workflow_repo_service
        self._provider = RepoWorkflowProviders.JENKINS.value

    def check_pat_validity(self) -> bool:
        if not self._api.check_pat():
            raise Exception("Jenkins credentials are invalid or Jenkins is unreachable")
        return True

    def get_workflow_runs(
        self,
        org_repo: OrgRepo,
        repo_workflow: RepoWorkflow,
        bookmark: datetime,
    ) -> Tuple[List[RepoWorkflowRuns], datetime]:
        try:
            builds = self._api.get_builds(repo_workflow.provider_workflow_id, bookmark)
        except Exception as e:
            # Bookmark is returned unchanged by raising: the caller does not
            # advance it, so this window is re-fetched next cycle.
            raise Exception(
                f"[Jenkins Sync Repo Workflow Worker] Error fetching job "
                f"{repo_workflow.provider_workflow_id} for repo "
                f"{str(org_repo.repo_id)}: {str(e)}"
            )

        if not builds:
            LOG.info(
                f"[Jenkins Sync Repo Workflow Worker] No builds found for job "
                f"{repo_workflow.provider_workflow_id}. Org: {self.org_id}"
            )
            return [], bookmark

        runs = []
        for build in builds:
            try:
                runs.append(
                    self._adapt_jenkins_build_to_workflow_run(
                        str(repo_workflow.id), build
                    )
                )
            except Exception as e:
                # One malformed build must not lose the rest of the batch.
                LOG.warn(
                    f"[Jenkins Sync Repo Workflow Worker] Skipping build "
                    f"{build.get('number')}: {str(e)}"
                )

        return runs, self._get_new_bookmark_time_stamp(builds)

    def _get_new_bookmark_time_stamp(self, builds: List[Dict]) -> datetime:
        """
        Rewind to the oldest still-running build so it is re-fetched once it
        finishes. Mirrors the GitHub Actions handler.
        """
        pending = [
            self._get_datetime_from_epoch_ms(build["timestamp"])
            for build in builds
            if build.get("building") or build.get("result") is None
        ]
        return min(pending) if pending else time_now()

    def _adapt_jenkins_build_to_workflow_run(
        self, repo_workflow_id: str, build: Dict
    ) -> RepoWorkflowRuns:
        existing = self._workflow_repo_service.get_repo_workflow_run_by_provider_workflow_run_id(
            repo_workflow_id, str(build["number"])
        )
        run_id = existing.id if existing else uuid4()

        duration = build.get("duration")
        return RepoWorkflowRuns(
            id=run_id,
            repo_workflow_id=repo_workflow_id,
            provider_workflow_run_id=str(build["number"]),
            event_actor=self._get_actor(build),
            head_branch=self._get_branch(build),
            status=self._get_repo_workflow_status(build),
            created_at=time_now(),
            updated_at=time_now(),
            conducted_at=self._get_datetime_from_epoch_ms(build["timestamp"]),
            duration=int(duration / 1000) if duration else None,
            meta=build,
            html_url=build.get("url"),
        )

    @staticmethod
    def _get_repo_workflow_status(build: Dict) -> RepoWorkflowRunsStatus:
        result = build.get("result")
        if build.get("building") or result is None:
            return RepoWorkflowRunsStatus.PENDING
        if result == "SUCCESS":
            return RepoWorkflowRunsStatus.SUCCESS
        if result == "ABORTED":
            return RepoWorkflowRunsStatus.CANCELLED
        # FAILURE and UNSTABLE. UNSTABLE means the build finished but something
        # -- usually tests -- failed; counting it as a deployment would report a
        # red build as a successful ship.
        return RepoWorkflowRunsStatus.FAILURE

    @staticmethod
    def _get_datetime_from_epoch_ms(ms: int) -> datetime:
        return datetime.fromtimestamp(ms / 1000, tz=pytz.UTC)

    @staticmethod
    def _get_branch(build: Dict) -> Optional[str]:
        # Contributed by the git plugin. A freestyle job with no SCM has none.
        for action in build.get("actions", []):
            revision = (action or {}).get("lastBuiltRevision")
            if revision and revision.get("branch"):
                return JenkinsETLHandler._normalise_branch(
                    revision["branch"][0].get("name")
                )
        return None

    @staticmethod
    def _normalise_branch(branch: Optional[str]) -> Optional[str]:
        """
        The git plugin reports 'origin/main', sometimes 'refs/remotes/origin/main'.
        Every DORA query filters head_branch against prod_branches, which
        defaults to the Postgres regex '^<default_branch>$' -- and
        'origin/main' ~ '^main$' is false, so an un-normalised value drops the
        run out of Deployment Frequency, Lead Time, CFR and MTTR with no error.
        """
        if not branch:
            return None
        branch = branch.strip()
        if not branch:
            return None

        if branch.startswith(REFS_HEADS_PREFIX):
            return branch.split(REFS_HEADS_PREFIX, 1)[1] or None

        if branch.startswith(REFS_REMOTES_PREFIX):
            # The segment straight after refs/remotes/ is a remote name by
            # definition, whatever it is called.
            rest = branch.split(REFS_REMOTES_PREFIX, 1)[1]
            _, separator, after_remote = rest.partition("/")
            return (after_remote if separator and after_remote else rest) or None

        remote, separator, rest = branch.partition("/")
        if separator and rest and remote in KNOWN_REMOTE_NAMES:
            return rest
        return branch

    @staticmethod
    def _get_actor(build: Dict) -> Optional[str]:
        for action in build.get("actions", []):
            causes = (action or {}).get("causes")
            if causes:
                return causes[0].get("userId") or causes[0].get("userName")
        return None


def get_jenkins_etl_handler(org_id: str) -> JenkinsETLHandler:
    from mhq.exapi.jenkins import JenkinsApiService
    from mhq.store.models import UserIdentityProvider
    from mhq.store.repos.core import CoreRepoService
    from mhq.store.repos.workflows import WorkflowRepoService
    from mhq.utils.jenkins import get_jenkins_config

    api_token = CoreRepoService().get_access_token(org_id, UserIdentityProvider.JENKINS)
    base_url, username = get_jenkins_config(org_id)

    if not (api_token and base_url and username):
        LOG.error(
            f"Jenkins is not fully configured for org {org_id}: "
            f"base_url={'set' if base_url else 'missing'}, "
            f"username={'set' if username else 'missing'}, "
            f"token={'set' if api_token else 'missing'}"
        )

    return JenkinsETLHandler(
        org_id,
        JenkinsApiService(base_url or "", username or "", api_token or ""),
        WorkflowRepoService(),
    )
