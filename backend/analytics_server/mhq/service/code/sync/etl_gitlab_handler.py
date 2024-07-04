import asyncio
from typing import List, Dict, Optional, Tuple, Set, Any
from mhq.utils.diffparser import parse_gitlab_diffs
from mhq.exapi.models.gitlab import (
    GitlabCommit,
    GitlabNote,
    GitlabNoteType,
    GitlabPR,
    GitlabPRState,
    GitlabRepo,
)
from mhq.store.models.code.enums import PullRequestEventState
from mhq.utils.string import uuid4_str
from mhq.service.code.sync.revert_pr_gitlab_sync import (
    RevertPRsGitlabSyncHandler,
    get_revert_prs_gitlab_sync_handler,
)
from mhq.exapi.gitlab import GitlabApiService
from mhq.service.code.sync.etl_code_analytics import CodeETLAnalyticsService
from mhq.service.code.sync.etl_provider_handler import CodeProviderETLHandler
from mhq.store.models import UserIdentityProvider
from mhq.store.models.code import (
    OrgRepo,
    Bookmark,
    PullRequestState,
    PullRequest,
    PullRequestCommit,
    PullRequestEvent,
    PullRequestEventType,
    PullRequestRevertPRMapping,
    CodeProvider,
)
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.core import CoreRepoService
from mhq.utils.log import LOG
from mhq.utils.time import dt_from_iso_time_string, time_now

PR_PROCESSING_CHUNK_SIZE = 100


class GitlabETLHandler(CodeProviderETLHandler):
    def __init__(
        self,
        org_id: str,
        gitlab_api_service: GitlabApiService,
        code_repo_service: CodeRepoService,
        code_etl_analytics_service: CodeETLAnalyticsService,
        gitlab_revert_pr_sync_handler: RevertPRsGitlabSyncHandler,
    ):
        self.org_id: str = org_id
        self._api: GitlabApiService = gitlab_api_service
        self.code_repo_service: CodeRepoService = code_repo_service
        self.code_etl_analytics_service: CodeETLAnalyticsService = (
            code_etl_analytics_service
        )
        self.gitlab_revert_pr_sync_handler: RevertPRsGitlabSyncHandler = (
            gitlab_revert_pr_sync_handler
        )
        self.provider: str = CodeProvider.GITLAB.value

    def check_pat_validity(self) -> bool:
        """
        This method checks if the PAT is valid.
        :returns: PAT details
        :raises: Exception if PAT is invalid
        """
        is_valid = self._api.check_pat()
        if not is_valid:
            raise Exception("Gitlab Personal Access Token is invalid")
        return is_valid

    def get_org_repos(self, org_repos: List[OrgRepo]) -> List[OrgRepo]:
        """
        This method returns Gitlab repos for Org.
        :param org_repos: List of OrgRepo objects
        :returns: List of Gitlab repos as OrgRepo objects
        """
        gitlab_repos: List[GitlabRepo] = [
            self._api.get_project(org_repo.idempotency_key) for org_repo in org_repos
        ]

        repo_idempotency_key_org_repo_map = {
            org_repo.idempotency_key: org_repo for org_repo in org_repos
        }

        return [
            self._process_gitlab_repo(
                repo_idempotency_key_org_repo_map.get(str(gitlab_repo.idempotency_key)),
                gitlab_repo,
            )
            for gitlab_repo in gitlab_repos
            if repo_idempotency_key_org_repo_map.get(str(gitlab_repo.idempotency_key))
        ]

    def get_revert_prs_mapping(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        return self.gitlab_revert_pr_sync_handler(prs)

    def _process_gitlab_repo(
        self, org_repo: OrgRepo, gitlab_repo: GitlabRepo
    ) -> OrgRepo:
        org_repo = OrgRepo(
            id=org_repo.id,
            org_id=self.org_id,
            name=gitlab_repo.name,
            provider=self.provider,
            org_name=org_repo.org_name,
            default_branch=gitlab_repo.default_branch,
            language=str(gitlab_repo.languages),
            contributors=self.get_repo_contributors(gitlab_repo),
            idempotency_key=str(gitlab_repo.idempotency_key),
            slug=gitlab_repo.name,
            updated_at=time_now(),
        )
        return org_repo

    def get_repo_pull_requests_data(
        self, org_repo: OrgRepo, bookmark: Bookmark
    ) -> Tuple[List[PullRequest], List[PullRequestCommit], List[PullRequestEvent]]:
        """
        This method returns all pull requests, their Commits and Events of a repo.
        :param org_repo: OrgRepo object to get pull requests for
        :param bookmark: Bookmark date to get all pull requests after this date
        :return: Pull requests, their commits and events
        """
        gitlab_repo: GitlabRepo = self._api.get_project(org_repo.idempotency_key)
        bookmark_time = dt_from_iso_time_string(bookmark.bookmark)
        prs_to_process: List[Dict] = asyncio.run(
            self._api.get_project_merge_requests(
                gitlab_repo.idempotency_key, bookmark_time
            )
        )
        filtered_prs: List[Dict] = []
        for pr in prs_to_process:
            if pr not in filtered_prs:
                filtered_prs.append(pr)

        filtered_prs = filtered_prs[::-1]
        if not filtered_prs:
            print("Nothing to process 🎉")
            return [], [], []

        pull_requests: List[PullRequest] = []
        pr_commits: List[PullRequestCommit] = []
        pr_events: List[PullRequestEvent] = []
        prs_added: Set[int] = set()

        for gitlab_pr in filtered_prs:
            gitlab_pr = GitlabPR(gitlab_pr)
            if gitlab_pr.number in prs_added:
                continue

            pr_model, event_models, pr_commit_models = self.process_pr(
                str(org_repo.id), str(org_repo.idempotency_key), gitlab_pr
            )
            pull_requests.append(pr_model)
            pr_events += event_models
            pr_commits += pr_commit_models
            prs_added.add(gitlab_pr.number)

        return pull_requests, pr_commits, pr_events

    def process_pr(
        self, repo_id: str, repo_idempotency_key: str, pr: GitlabPR
    ) -> Tuple[PullRequest, List[PullRequestEvent], List[PullRequestCommit]]:
        pr_model: Optional[PullRequest] = self.code_repo_service.get_repo_pr_by_number(
            repo_id, pr.number
        )
        pr_event_model_list: List[PullRequestEvent] = (
            self.code_repo_service.get_pr_events(pr_model)
        )
        pr_commits_model_list: List = []
        reviews: List[GitlabNote] = self._api.get_merge_request_notes(
            repo_idempotency_key, pr.number
        )

        pr_model: PullRequest = GitlabETLHandler._to_pr_model(pr, pr_model, repo_id)
        pr_events_models: List[PullRequestEvent] = GitlabETLHandler._to_pr_events(
            reviews, pr_model, pr_event_model_list
        )

        if pr_model.state == PullRequestState.MERGED:
            commits = self._api.get_merge_request_commits(
                repo_idempotency_key, pr.number
            )
            pr_commits_model_list: List[PullRequestCommit] = self._to_pr_commits(
                commits, pr_model
            )

            additions, deletions, files_changed = self.process_pr_code_stats(
                repo_idempotency_key, pr_model
            )
            commits_count = len(pr_commits_model_list)

            pr_model.meta = {
                "code_stats": dict(
                    commits=commits_count,
                    additions=additions,
                    deletions=deletions,
                    changed_files=files_changed,
                    comments=None,
                ),
                "user_profile": dict(username=pr_model.author),
            }

        pr_model = self.code_etl_analytics_service.create_pr_metrics(
            pr_model, pr_events_models, pr_commits_model_list
        )

        return pr_model, pr_events_models, pr_commits_model_list

    def process_pr_code_stats(
        self,
        repo_idempotency_key: str,
        pr_model: PullRequest,
    ) -> Tuple[int, int, int]:
        pr_number = pr_model.number
        response = self._api.get_merge_request_diff(repo_idempotency_key, pr_number)
        diffs = list(map(lambda x: x.get("diff"), response))

        additions, deletions, files_changed = parse_gitlab_diffs(diffs)
        return additions, deletions, files_changed

    def get_repo_contributors(self, gitlab_repo: GitlabRepo) -> Dict[str, Any]:
        project_contributors: List[Dict] = self._api.get_project_contributors(
            gitlab_repo.idempotency_key
        )

        contributors = [
            [
                contributor.get("email"),
                contributor.get("commits", 0),
            ]
            for contributor in project_contributors
            if contributor.get("email") is not None
        ]
        contributors_map = {
            "contributions": contributors,
        }
        return contributors_map

    @staticmethod
    def _to_pr_model(
        pr: GitlabPR,
        pr_model: Optional[PullRequest],
        repo_id: str,
    ):
        pr_id = pr_model.id if pr_model else uuid4_str()
        return PullRequest(
            id=pr_id,
            number=pr.number,
            title=pr.title,
            url=pr.url,
            author=pr.author,
            state=GitlabETLHandler.process_pr_state(pr),
            base_branch=pr.base_branch,
            head_branch=pr.head_branch,
            data=pr.data,
            created_at=pr.created_at,
            updated_at=pr.updated_at,
            state_changed_at=pr.merged_at or pr.closed_at or pr.updated_at,
            repo_id=repo_id,
            requested_reviews=[],
            meta=dict(),
            reviewers=pr.reviewers,
            provider=UserIdentityProvider.GITLAB.value,
            merge_commit_sha=pr.merge_commit_sha,
        )

    @staticmethod
    def process_pr_state(pr: GitlabPR) -> PullRequestState:
        state = pr.state
        if state == GitlabPRState.OPENED:
            return PullRequestState.OPEN

        if state == GitlabPRState.CLOSED:
            return PullRequestState.CLOSED

        if state == GitlabPRState.MERGED:
            return PullRequestState.MERGED

        if state == GitlabPRState.LOCKED:
            if pr.merged_at:
                return PullRequestState.MERGED
            if pr.closed_at:
                return PullRequestState.CLOSED

        return PullRequestState.OPEN.value

    @staticmethod
    def _to_pr_commits(
        commits: List[GitlabCommit], pr_model: PullRequest
    ) -> List[PullRequestCommit]:
        pr_commits: List[PullRequestCommit] = []

        for commit in commits:
            pr_commits.append(
                PullRequestCommit(
                    hash=commit.hash,
                    pull_request_id=pr_model.id,
                    message=commit.message,
                    url=commit.url,
                    data=commit.data,
                    author=commit.author_email,
                    created_at=commit.created_at,
                    org_repo_id=pr_model.repo_id,
                )
            )
        return pr_commits

    @staticmethod
    def _get_merge_commit_sha(raw_data: Dict, state: PullRequestState) -> Optional[str]:
        if state != PullRequestState.MERGED:
            return None

        merge_commit_sha = raw_data.get("merge_commit_sha")

        return merge_commit_sha

    @staticmethod
    def _to_pr_events(
        reviews: List[GitlabNote],
        pr_model: PullRequest,
        pr_events_model: List[PullRequestEvent],
    ) -> List[PullRequestEvent]:
        pr_events: List[PullRequestEvent] = []
        pr_review_id_map = {
            event.idempotency_key: event.id for event in pr_events_model
        }

        for review in reviews:
            if review.state == GitlabNoteType.UPDATED:
                continue

            review.data["state"] = GitlabETLHandler._get_event_state(review)
            pr_events.append(
                PullRequestEvent(
                    id=pr_review_id_map.get(str(review.idempotency_key), uuid4_str()),
                    pull_request_id=str(pr_model.id),
                    type=PullRequestEventType.REVIEW.value,
                    data=review.data,
                    created_at=review.created_at,
                    idempotency_key=str(review.idempotency_key),
                    org_repo_id=str(pr_model.repo_id),
                    actor_username=review.actor_username,
                )
            )

        return pr_events

    @staticmethod
    def _get_event_state(event: GitlabNote):
        if event.state == GitlabNoteType.CHANGES_REQUESTED:
            return PullRequestEventState.CHANGES_REQUESTED.value
        elif event.state == GitlabNoteType.APPROVED:
            return PullRequestEventState.APPROVED.value
        elif event.state == GitlabNoteType.COMMENTED:
            return PullRequestEventState.COMMENTED.value
        return None


def get_gitlab_etl_handler(org_id: str) -> GitlabETLHandler:
    def _get_custom_gitlab_domain() -> str:
        pass

    def _get_access_token():
        core_repo_service = CoreRepoService()
        access_token = core_repo_service.get_access_token(
            org_id, UserIdentityProvider.GITLAB
        )
        if not access_token:
            LOG.error(
                f"Access token not found for org {org_id} and provider {UserIdentityProvider.GITLAB.value}"
            )
        return access_token

    return GitlabETLHandler(
        org_id,
        GitlabApiService(_get_access_token()),
        CodeRepoService(),
        CodeETLAnalyticsService(),
        get_revert_prs_gitlab_sync_handler(),
    )
