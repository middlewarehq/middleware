from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
from uuid import uuid4

from mhq.exapi.bitbucket import BitbucketApiService, BitbucketRateLimitExceeded
from mhq.exapi.models.bitbucket import BitbucketPR, BitbucketRepo
from mhq.service.code.sync.etl_code_analytics import CodeETLAnalyticsService
from mhq.service.code.sync.etl_provider_handler import CodeProviderETLHandler
from mhq.store.models import UserIdentityProvider
from mhq.store.models.code import (
    CodeProvider,
    OrgRepo,
    PullRequest,
    PullRequestCommit,
    PullRequestEvent,
    PullRequestEventState,
    PullRequestEventType,
    PullRequestRevertPRMapping,
    PullRequestState,
)
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.core import CoreRepoService
from mhq.utils.log import LOG
from mhq.utils.string import uuid4_str
from mhq.utils.time import dt_from_iso_time_string, time_now

# CLUSTOX: our model has three PR states, Bitbucket four. DECLINED (rejected)
# and SUPERSEDED (replaced by another PR) are both terminal-without-merge, so
# both fold into CLOSED. An unmapped state skips that PR rather than guessing:
# a guessed state would flow into lead time as a plausible wrong number.
BITBUCKET_STATE_MAP = {
    "MERGED": PullRequestState.MERGED,
    "OPEN": PullRequestState.OPEN,
    "DECLINED": PullRequestState.CLOSED,
    "SUPERSEDED": PullRequestState.CLOSED,
}


class BitbucketETLHandler(CodeProviderETLHandler):
    def __init__(
        self,
        org_id: str,
        bitbucket_api_service: BitbucketApiService,
        code_repo_service: CodeRepoService,
        code_etl_analytics_service: CodeETLAnalyticsService,
        bitbucket_revert_pr_sync_handler,
    ):
        self.org_id: str = org_id
        self._api: BitbucketApiService = bitbucket_api_service
        self.code_repo_service: CodeRepoService = code_repo_service
        self.code_etl_analytics_service: CodeETLAnalyticsService = (
            code_etl_analytics_service
        )
        self.bitbucket_revert_pr_sync_handler = bitbucket_revert_pr_sync_handler
        self.provider: str = CodeProvider.BITBUCKET.value

    def check_pat_validity(self) -> bool:
        is_valid = self._api.check_pat()
        if not is_valid:
            # The API cannot tell a revoked token from an expired one.
            raise Exception("Bitbucket API token is invalid, revoked or expired")
        return is_valid

    def get_org_repos(self, org_repos: List[OrgRepo]) -> List[OrgRepo]:
        """CLUSTOX: one workspace listing per workspace rather than one call
        per repo -- repos are matched back by uuid. Against a ~1,000 req/hr
        ceiling, N repos in one workspace cost 1 request instead of N."""
        repos_by_workspace: Dict[str, List[OrgRepo]] = {}
        for org_repo in org_repos:
            repos_by_workspace.setdefault(org_repo.org_name, []).append(org_repo)

        processed: List[OrgRepo] = []
        for workspace, workspace_org_repos in repos_by_workspace.items():
            try:
                bitbucket_repos = [
                    BitbucketRepo(repo)
                    for repo in self._api.get_workspace_repos(workspace)
                ]
            except Exception as e:
                LOG.error(f"Error listing Bitbucket workspace {workspace}: {str(e)}")
                continue

            by_key = {repo.idempotency_key: repo for repo in bitbucket_repos}
            for org_repo in workspace_org_repos:
                bitbucket_repo = by_key.get(str(org_repo.idempotency_key))
                if not bitbucket_repo:
                    LOG.error(
                        f"Bitbucket repo not found in workspace {workspace}: "
                        f"{org_repo.slug}"
                    )
                    continue
                processed.append(self._process_bitbucket_repo(org_repo, bitbucket_repo))

        return processed

    def _process_bitbucket_repo(
        self, org_repo: OrgRepo, bitbucket_repo: BitbucketRepo
    ) -> OrgRepo:
        return OrgRepo(
            id=org_repo.id,
            org_id=self.org_id,
            name=bitbucket_repo.name,
            provider=self.provider,
            org_name=bitbucket_repo.org_name,
            default_branch=bitbucket_repo.default_branch,
            language=None,
            # CLUSTOX: Bitbucket has no contributors endpoint. Empty is safe:
            # the contributor filter reads PR authors from our own tables, not
            # this map.
            contributors={"contributions": []},
            idempotency_key=str(bitbucket_repo.idempotency_key),
            slug=bitbucket_repo.slug,
            updated_at=time_now(),
        )

    def get_revert_prs_mapping(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        return self.bitbucket_revert_pr_sync_handler(prs)

    def get_repo_pull_requests_data(
        self, org_repo: OrgRepo, bookmark: datetime
    ) -> Tuple[List[PullRequest], List[PullRequestCommit], List[PullRequestEvent]]:
        workspace = org_repo.org_name
        repo_slug = org_repo.slug

        prs_to_process = self._api.get_repo_pull_requests(
            workspace, repo_slug, bookmark
        )
        if not prs_to_process:
            return [], [], []

        pull_requests: List[PullRequest] = []
        pr_commits: List[PullRequestCommit] = []
        pr_events: List[PullRequestEvent] = []
        prs_added: Set[int] = set()

        for raw_pr in prs_to_process:
            bitbucket_pr = BitbucketPR(raw_pr)
            if bitbucket_pr.number in prs_added:
                continue
            if bitbucket_pr.state not in BITBUCKET_STATE_MAP:
                LOG.warning(
                    f"Skipping Bitbucket PR {bitbucket_pr.number} with "
                    f"unknown state {bitbucket_pr.state}"
                )
                continue

            try:
                pr_model, event_models, pr_commit_models = self.process_pr(
                    str(org_repo.id), workspace, repo_slug, bitbucket_pr
                )
            except BitbucketRateLimitExceeded as e:
                # CLUSTOX: pause, not fail. Everything fully processed so far
                # is returned and stored; the bookmark then rests at the last
                # stored PR, so the next scheduled sync resumes exactly there.
                # Failing instead would throw away this batch; continuing
                # would hammer a locked-out API.
                LOG.warning(
                    f"Bitbucket rate limit hit at PR {bitbucket_pr.number} of "
                    f"{workspace}/{repo_slug}; resuming next sync"
                    + (
                        f" (retry-after {e.retry_after_seconds}s)"
                        if e.retry_after_seconds
                        else ""
                    )
                )
                break

            pull_requests.append(pr_model)
            pr_events += event_models
            pr_commits += pr_commit_models
            prs_added.add(bitbucket_pr.number)

        return pull_requests, pr_commits, pr_events

    def process_pr(
        self, repo_id: str, workspace: str, repo_slug: str, pr: BitbucketPR
    ) -> Tuple[PullRequest, List[PullRequestEvent], List[PullRequestCommit]]:
        pr_model: Optional[PullRequest] = self.code_repo_service.get_repo_pr_by_number(
            repo_id, pr.number
        )
        pr_event_model_list: List[PullRequestEvent] = (
            self.code_repo_service.get_pr_events(pr_model)
        )

        activity = self._api.get_pr_activity(workspace, repo_slug, pr.number)

        pr_model = self._to_pr_model(pr, pr_model, repo_id)
        pr_events_models = self._to_pr_events(activity, pr_model, pr_event_model_list)

        pr_commits_model_list: List[PullRequestCommit] = []
        if pr_model.state == PullRequestState.MERGED:
            commits = self._api.get_pr_commits(workspace, repo_slug, pr.number)
            pr_commits_model_list = self._to_pr_commits(commits, pr_model)

            additions, deletions, files_changed = self.process_pr_code_stats(
                workspace, repo_slug, pr.number
            )
            meta = {"user_profile": dict(username=pr_model.author)}
            # CLUSTOX: a failed diffstat leaves code_stats out entirely rather
            # than writing zeros -- the PullRequest properties then read 0 via
            # their own defaults, and LOC undercounts honestly while the PR
            # stays present for lead time and the contributor filter. Writing
            # zeros here would be indistinguishable from a genuinely empty
            # diff.
            if additions is not None:
                meta["code_stats"] = dict(
                    commits=len(pr_commits_model_list),
                    additions=additions,
                    deletions=deletions,
                    changed_files=files_changed,
                    comments=None,
                )
            pr_model.meta = meta

        pr_model = self.code_etl_analytics_service.create_pr_metrics(
            pr_model, pr_events_models, pr_commits_model_list
        )

        return pr_model, pr_events_models, pr_commits_model_list

    def process_pr_code_stats(
        self, workspace: str, repo_slug: str, pr_number: int
    ) -> Tuple[Optional[int], Optional[int], Optional[int]]:
        try:
            diffstat = self._api.get_pr_diffstat(workspace, repo_slug, pr_number)
        except BitbucketRateLimitExceeded:
            raise
        except Exception as e:
            LOG.warning(
                f"Diffstat failed for PR {pr_number} of {workspace}/{repo_slug}: "
                f"{str(e)}"
            )
            return None, None, None

        additions = sum(entry.get("lines_added") or 0 for entry in diffstat)
        deletions = sum(entry.get("lines_removed") or 0 for entry in diffstat)
        return additions, deletions, len(diffstat)

    def _to_pr_model(
        self,
        pr: BitbucketPR,
        pr_model: Optional[PullRequest],
        repo_id: str,
    ) -> PullRequest:
        pr_id = pr_model.id if pr_model else uuid4()
        state = BITBUCKET_STATE_MAP[pr.state]
        reviewers = [
            (participant.get("user") or {}).get("nickname")
            for participant in pr.participants
            if participant.get("role") == "REVIEWER"
            and (participant.get("user") or {}).get("nickname")
        ]

        return PullRequest(
            id=pr_id,
            number=pr.number,
            title=pr.title,
            url=pr.url,
            # CLUSTOX: nickname, not uuid. The contributor dropdown lists
            # `author` verbatim, and "{a1b2c3d4-...}" is not a name anyone can
            # pick from a list. The uuid stays in `data` for a future identity
            # layer. Nickname renames make history split under two handles --
            # the same accepted cost GitHub logins already carry here.
            author=pr.author_nickname or pr.author_uuid,
            state=state,
            base_branch=pr.base_branch,
            head_branch=pr.head_branch,
            data=pr.raw_data,
            created_at=pr.created_on,
            updated_at=pr.updated_on,
            # CLUSTOX: Bitbucket has no merged_at anywhere in the PR object.
            # updated_on at the moment of merge is the closest truth, and it
            # is what lead time keys on.
            state_changed_at=pr.updated_on,
            repo_id=repo_id,
            requested_reviews=[],
            meta=dict(),
            reviewers=reviewers,
            provider=UserIdentityProvider.BITBUCKET.value,
            merge_commit_sha=pr.merge_commit_sha,
        )

    @staticmethod
    def _to_pr_commits(
        commits: List[Dict], pr_model: PullRequest
    ) -> List[PullRequestCommit]:
        pr_commits: List[PullRequestCommit] = []
        for commit in commits:
            if not commit.get("hash"):
                LOG.warning("Skipping Bitbucket commit without a hash")
                continue
            pr_commits.append(
                PullRequestCommit(
                    hash=commit.get("hash"),
                    pull_request_id=pr_model.id,
                    message=commit.get("message") or "",
                    url=((commit.get("links") or {}).get("html") or {}).get("href"),
                    data=commit,
                    author=(commit.get("author") or {}).get("raw"),
                    created_at=_dt_or_none(commit.get("date")),
                    org_repo_id=pr_model.repo_id,
                )
            )
        return pr_commits

    def _to_pr_events(
        self,
        activity: List[Dict],
        pr_model: PullRequest,
        pr_events_model: List[PullRequestEvent],
    ) -> List[PullRequestEvent]:
        """CLUSTOX: Bitbucket's activity feed mixes approvals, comments,
        changes-requested and plain updates in one stream, each under a
        different top-level key. Anything unrecognised is skipped
        individually -- one malformed entry must never cost the batch."""
        pr_events: List[PullRequestEvent] = []
        pr_review_id_map = {
            event.idempotency_key: event.id for event in pr_events_model
        }

        for entry in activity:
            adapted = self._adapt_activity_entry(entry)
            if not adapted:
                continue
            event_state, actor, created_at, idempotency_key, data = adapted
            data["state"] = event_state
            pr_events.append(
                PullRequestEvent(
                    id=pr_review_id_map.get(idempotency_key, uuid4_str()),
                    pull_request_id=str(pr_model.id),
                    type=PullRequestEventType.REVIEW.value,
                    data=data,
                    created_at=created_at,
                    idempotency_key=idempotency_key,
                    org_repo_id=pr_model.repo_id,
                    actor_username=actor,
                )
            )

        return pr_events

    @staticmethod
    def _adapt_activity_entry(entry: Dict):
        try:
            if "approval" in entry:
                approval = entry["approval"] or {}
                created_at = _dt_or_none(approval.get("date"))
                actor = (approval.get("user") or {}).get("nickname")
                if not created_at:
                    return None
                key = f"approval-{actor}-{approval.get('date')}"
                return (
                    PullRequestEventState.APPROVED.value,
                    actor,
                    created_at,
                    key,
                    dict(approval),
                )
            if "changes_requested" in entry:
                changes = entry["changes_requested"] or {}
                created_at = _dt_or_none(changes.get("date"))
                actor = (changes.get("user") or {}).get("nickname")
                if not created_at:
                    return None
                key = f"changes-{actor}-{changes.get('date')}"
                return (
                    PullRequestEventState.CHANGES_REQUESTED.value,
                    actor,
                    created_at,
                    key,
                    dict(changes),
                )
            if "comment" in entry:
                comment = entry["comment"] or {}
                created_at = _dt_or_none(comment.get("created_on"))
                actor = (comment.get("user") or {}).get("nickname")
                if not created_at:
                    return None
                key = f"comment-{comment.get('id')}"
                return (
                    PullRequestEventState.COMMENTED.value,
                    actor,
                    created_at,
                    key,
                    dict(comment, content=None),
                )
        except Exception as e:
            LOG.warning(f"Skipping malformed Bitbucket activity entry: {str(e)}")
        return None


def _dt_or_none(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return dt_from_iso_time_string(value)


def get_bitbucket_etl_handler(org_id: str) -> BitbucketETLHandler:
    from mhq.service.code.sync.revert_prs_bitbucket_sync import (
        get_revert_prs_bitbucket_sync_handler,
    )

    def _get_credentials() -> Tuple[Optional[str], Optional[str]]:
        core_repo_service = CoreRepoService()
        access_token = core_repo_service.get_access_token(
            org_id, UserIdentityProvider.BITBUCKET
        )
        integrations = core_repo_service.get_org_integrations_for_names(
            org_id, [UserIdentityProvider.BITBUCKET.value]
        )
        # CLUSTOX: the email is the Basic-auth username. It lives in
        # provider_meta -- the same home GitLab uses for custom_domain --
        # because it is not a secret; only the token is encrypted.
        email = (
            integrations[0].provider_meta.get("email")
            if integrations and integrations[0].provider_meta
            else None
        )
        if not access_token or not email:
            LOG.error(
                f"Bitbucket credentials incomplete for org {org_id}: "
                f"token {'present' if access_token else 'missing'}, "
                f"email {'present' if email else 'missing'}"
            )
        return email, access_token

    email, access_token = _get_credentials()
    return BitbucketETLHandler(
        org_id,
        BitbucketApiService(email, access_token),
        CodeRepoService(),
        CodeETLAnalyticsService(),
        get_revert_prs_bitbucket_sync_handler(),
    )
