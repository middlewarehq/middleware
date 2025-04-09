import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Set

import pytz
from github.PaginatedList import PaginatedList as GithubPaginatedList
from github.PullRequest import PullRequest as GithubPullRequest
from github.PullRequestReview import PullRequestReview as GithubPullRequestReview
from github.Repository import Repository as GithubRepository

from mhq.exapi.github import GithubApiService
from mhq.service.code.sync.etl_code_analytics import CodeETLAnalyticsService
from mhq.service.code.sync.etl_provider_handler import CodeProviderETLHandler
from mhq.service.code.sync.revert_prs_github_sync import (
    RevertPRsGitHubSyncHandler,
    get_revert_prs_github_sync_handler,
)
from mhq.store.models import UserIdentityProvider
from mhq.store.models.code import (
    OrgRepo,
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
from mhq.utils.time import time_now, ISO_8601_DATE_FORMAT

PR_PROCESSING_CHUNK_SIZE = 100


class GithubETLHandler(CodeProviderETLHandler):
    def __init__(
        self,
        org_id: str,
        github_api_service: GithubApiService,
        code_repo_service: CodeRepoService,
        code_etl_analytics_service: CodeETLAnalyticsService,
        github_revert_pr_sync_handler: RevertPRsGitHubSyncHandler,
    ):
        self.org_id: str = org_id
        self._api: GithubApiService = github_api_service
        self.code_repo_service: CodeRepoService = code_repo_service
        self.code_etl_analytics_service: CodeETLAnalyticsService = (
            code_etl_analytics_service
        )
        self.github_revert_pr_sync_handler: RevertPRsGitHubSyncHandler = (
            github_revert_pr_sync_handler
        )
        self.provider: str = CodeProvider.GITHUB.value

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

    def get_org_repos(self, org_repos: List[OrgRepo]) -> List[OrgRepo]:
        """
        This method returns GitHub repos for Org.
        :param org_repos: List of OrgRepo objects
        :returns: List of GitHub repos as OrgRepo objects
        """
        github_repos: List[GithubRepository] = [
            self._api.get_repo(org_repo.org_name, org_repo.name)
            for org_repo in org_repos
        ]

        repo_idempotency_key_org_repo_map = {
            org_repo.idempotency_key: org_repo for org_repo in org_repos
        }

        return [
            self._process_github_repo(
                repo_idempotency_key_org_repo_map.get(str(github_repo.id)), github_repo
            )
            for github_repo in github_repos
            if repo_idempotency_key_org_repo_map.get(str(github_repo.id))
        ]

    def get_repo_pull_requests_data(
        self, org_repo: OrgRepo, bookmark: datetime
    ) -> Tuple[List[PullRequest], List[PullRequestCommit], List[PullRequestEvent]]:
        """
        This method returns all pull requests, their Commits and Events of a repo.
        :param org_repo: OrgRepo object to get pull requests for
        :param bookmark: Bookmark date to get all pull requests after this date
        :return: Pull requests, their commits and events
        """
        github_repo: GithubRepository = self._api.get_repo(
            org_repo.org_name, org_repo.name
        )
        github_pull_requests: GithubPaginatedList = self._api.get_pull_requests(
            github_repo
        )

        prs_to_process = []
        for page in range(
            0, github_pull_requests.totalCount // PR_PROCESSING_CHUNK_SIZE + 1, 1
        ):
            prs = github_pull_requests.get_page(page)
            if not prs:
                break

            if prs[-1].updated_at.replace(tzinfo=pytz.UTC) <= bookmark:
                prs_to_process += [
                    pr
                    for pr in prs
                    if pr.updated_at.replace(tzinfo=pytz.UTC) > bookmark
                ]
                break

            prs_to_process += prs

        filtered_prs: List = []
        for pr in prs_to_process:
            state_changed_at = pr.merged_at if pr.merged_at else pr.closed_at
            if (
                pr.state.upper() != PullRequestState.OPEN.value
                and state_changed_at.replace(tzinfo=pytz.UTC) < bookmark
            ):
                continue
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

        for github_pr in filtered_prs:
            if github_pr.number in prs_added:
                continue

            pr_model, event_models, pr_commit_models = self.process_pr(
                str(org_repo.id), github_pr
            )
            pull_requests.append(pr_model)
            pr_events += event_models
            pr_commits += pr_commit_models
            prs_added.add(github_pr.number)

        return pull_requests, pr_commits, pr_events

    def process_pr(
        self, repo_id: str, pr: GithubPullRequest
    ) -> Tuple[PullRequest, List[PullRequestEvent], List[PullRequestCommit]]:
        pr_model: Optional[PullRequest] = self.code_repo_service.get_repo_pr_by_number(
            repo_id, pr.number
        )
        pr_event_model_list: List[PullRequestEvent] = (
            self.code_repo_service.get_pr_events(pr_model)
        )
        pr_commits_model_list: List = []

        reviews: List[GithubPullRequestReview] = list(self._api.get_pr_reviews(pr))
        pr_model: PullRequest = self._to_pr_model(pr, pr_model, repo_id, len(reviews))
        pr_events_model_list: List[PullRequestEvent] = self._to_pr_events(
            reviews, pr_model, pr_event_model_list
        )
        if pr.merged_at:
            commits: List[Dict] = list(
                map(
                    lambda x: x.__dict__["_rawData"], list(self._api.get_pr_commits(pr))
                )
            )
            pr_commits_model_list: List[PullRequestCommit] = self._to_pr_commits(
                commits, pr_model
            )

        pr_model = self.code_etl_analytics_service.create_pr_metrics(
            pr_model, pr_events_model_list, pr_commits_model_list
        )

        return pr_model, pr_events_model_list, pr_commits_model_list

    def get_revert_prs_mapping(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        return self.github_revert_pr_sync_handler(prs)

    def _process_github_repo(
        self, org_repo: OrgRepo, github_repo: GithubRepository
    ) -> OrgRepo:

        org_repo = OrgRepo(
            id=org_repo.id,
            org_id=self.org_id,
            name=github_repo.name,
            provider=self.provider,
            org_name=org_repo.org_name,
            default_branch=github_repo.default_branch,
            language=github_repo.language,
            contributors=self._api.get_repo_contributors(github_repo),
            idempotency_key=str(github_repo.id),
            slug=github_repo.name,
            updated_at=time_now(),
        )
        return org_repo

    def _to_pr_model(
        self,
        pr: GithubPullRequest,
        pr_model: Optional[PullRequest],
        repo_id: str,
        review_comments: int = 0,
    ) -> PullRequest:
        state = self._get_state(pr)
        pr_id = pr_model.id if pr_model else uuid.uuid4()
        state_changed_at = None
        if state != PullRequestState.OPEN:
            state_changed_at = (
                pr.merged_at.replace(tzinfo=pytz.UTC)
                if pr.merged_at
                else pr.closed_at.replace(tzinfo=pytz.UTC)
            )

        merge_commit_sha: Optional[str] = self._get_merge_commit_sha(pr.raw_data, state)

        return PullRequest(
            id=pr_id,
            number=str(pr.number),
            title=pr.title,
            url=pr.html_url,
            created_at=pr.created_at.replace(tzinfo=pytz.UTC),
            updated_at=pr.updated_at.replace(tzinfo=pytz.UTC),
            state_changed_at=state_changed_at,
            state=state,
            base_branch=pr.base.ref,
            head_branch=pr.head.ref,
            author=pr.user.login,
            repo_id=repo_id,
            data=pr.raw_data,
            requested_reviews=[r["login"] for r in pr.raw_data["requested_reviewers"]],
            meta=dict(
                code_stats=dict(
                    commits=pr.commits,
                    additions=pr.additions,
                    deletions=pr.deletions,
                    changed_files=pr.changed_files,
                    comments=review_comments,
                ),
                user_profile=dict(username=pr.user.login),
            ),
            provider=UserIdentityProvider.GITHUB.value,
            merge_commit_sha=merge_commit_sha,
        )

    @staticmethod
    def _get_merge_commit_sha(raw_data: Dict, state: PullRequestState) -> Optional[str]:
        if state != PullRequestState.MERGED:
            return None

        merge_commit_sha = raw_data.get("merge_commit_sha")

        return merge_commit_sha

    @staticmethod
    def _get_state(pr: GithubPullRequest) -> PullRequestState:
        if pr.merged_at:
            return PullRequestState.MERGED
        if pr.closed_at:
            return PullRequestState.CLOSED

        return PullRequestState.OPEN

    @staticmethod
    def _to_pr_events(
        reviews: [GithubPullRequestReview],
        pr_model: PullRequest,
        pr_events_model: [PullRequestEvent],
    ) -> List[PullRequestEvent]:
        pr_events: List[PullRequestEvent] = []
        pr_event_id_map = {event.idempotency_key: event.id for event in pr_events_model}

        for review in reviews:
            if not review.submitted_at:
                continue  # Discard incomplete reviews

            actor = review.raw_data.get("user", {})
            username = actor.get("login", "") if actor else ""

            pr_events.append(
                PullRequestEvent(
                    id=pr_event_id_map.get(str(review.id), uuid.uuid4()),
                    pull_request_id=str(pr_model.id),
                    type=PullRequestEventType.REVIEW.value,
                    data=review.raw_data,
                    created_at=review.submitted_at.replace(tzinfo=pytz.UTC),
                    idempotency_key=str(review.id),
                    org_repo_id=pr_model.repo_id,
                    actor_username=username,
                )
            )
        return pr_events

    def _to_pr_commits(
        self,
        commits: List[Dict],
        pr_model: PullRequest,
    ) -> List[PullRequestCommit]:
        """
        Sample commit

        {
            'sha': '123456789098765',
            'commit': {
                'committer': {'name': 'abc', 'email': 'abc@midd.com', 'date': '2022-06-29T10:53:15Z'},
                'message': '[abc 315] avoid mapping edit state',
            }
            'author': {'login': 'abc', 'id': 95607047, 'node_id': 'abc', 'avatar_url': ''},
            'html_url': 'https://github.com/123456789098765',
        }
        """
        pr_commits: List[PullRequestCommit] = []

        for commit in commits:
            pr_commits.append(
                PullRequestCommit(
                    hash=commit["sha"],
                    pull_request_id=str(pr_model.id),
                    url=commit["html_url"],
                    data=commit,
                    message=commit["commit"]["message"],
                    author=(
                        commit["author"]["login"]
                        if commit.get("author")
                        else commit["commit"].get("committer", {}).get("email", "")
                    ),
                    created_at=self._dt_from_github_dt_string(
                        commit["commit"]["committer"]["date"]
                    ),
                    org_repo_id=pr_model.repo_id,
                )
            )
        return pr_commits

    @staticmethod
    def _dt_from_github_dt_string(dt_string: str) -> datetime:
        dt_without_timezone = datetime.strptime(dt_string, ISO_8601_DATE_FORMAT)
        return dt_without_timezone.replace(tzinfo=pytz.UTC)


def get_github_etl_handler(org_id: str) -> GithubETLHandler:
    def _get_access_token():
        core_repo_service = CoreRepoService()
        access_token = core_repo_service.get_access_token(
            org_id, UserIdentityProvider.GITHUB
        )
        if not access_token:
            LOG.error(
                f"Access token not found for org {org_id} and provider {UserIdentityProvider.GITHUB.value}"
            )
        return access_token

    return GithubETLHandler(
        org_id,
        GithubApiService(_get_access_token()),
        CodeRepoService(),
        CodeETLAnalyticsService(),
        get_revert_prs_github_sync_handler(),
    )
