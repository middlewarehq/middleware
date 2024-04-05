import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple

import pytz
from github.PaginatedList import PaginatedList as GithubPaginatedList
from github.PullRequest import PullRequest as GithubPullRequest
from github.PullRequestReview import PullRequestReview as GithubPullRequestReview
from github.Repository import Repository as GithubRepository

from dora.exapi.github import GithubApiService
from dora.store.models import UserIdentityProvider
from dora.store.models.code import (
    OrgRepo,
    Bookmark,
    PullRequestState,
    PullRequest,
    PullRequestCommit,
    PullRequestEvent,
    PullRequestEventType,
)
from dora.store.repos.code import CodeRepoService
from dora.utils.time import time_now

PR_PROCESSING_CHUNK_SIZE = 100


class GithubETLHandler:
    def __init__(
        self,
        org_id: str,
        github_api_service: GithubApiService,
        code_repo_service: CodeRepoService,
    ):
        self.org_id: str = org_id
        self._api: GithubApiService = github_api_service
        self.code_repo_service: CodeRepoService = code_repo_service
        self.provider: str = UserIdentityProvider.GITHUB.value

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
        return [
            self._process_github_repo(org_repos, github_repo)
            for github_repo in github_repos
        ]

    def get_repo_pull_requests_data(
        self, org_repo: OrgRepo, bookmark: Bookmark
    ) -> None:
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
        bookmark_time = datetime.fromisoformat(bookmark.bookmark)
        for page in range(
            0, github_pull_requests.totalCount // PR_PROCESSING_CHUNK_SIZE + 1, 1
        ):
            prs = github_pull_requests.get_page(page)
            if not prs:
                break

            if prs[-1].updated_at.astimezone(tz=pytz.UTC) <= bookmark_time:
                prs_to_process += [
                    pr
                    for pr in prs
                    if pr.updated_at.astimezone(tz=pytz.UTC) > bookmark_time
                ]
                break

            prs_to_process += prs

        filtered_prs: List = []
        for pr in prs_to_process:
            state_changed_at = pr.merged_at if pr.merged_at else pr.closed_at
            if (
                pr.state.upper() != PullRequestState.OPEN.value
                and state_changed_at.astimezone(tz=pytz.UTC) < bookmark_time
            ):
                continue
            if pr not in filtered_prs:
                filtered_prs.append(pr)

        if not filtered_prs:
            print("Nothing to process 🎉")
            return

        pull_requests: List[PullRequest] = []
        pr_commits: List[PullRequestCommit] = []
        pr_events: List[PullRequestEvent] = []
        prs_added = set()

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

    def process_pr(
        self, repo_id: str, pr: GithubPullRequest
    ) -> Tuple[PullRequest, List[PullRequestEvent], List[PullRequestCommit]]:
        pr_model: Optional[PullRequest] = self.code_repo_service.get_repo_pr_by_number(
            repo_id, pr.number
        )
        pr_event_model_list = self.code_repo_service.get_pr_events(pr_model)
        pr_commits_model_list = []

        reviews: List[GithubPullRequestReview] = list(self._api.get_pr_reviews(pr))
        pr_model = self._to_pr_model(pr, pr_model, repo_id, len(reviews))
        pr_events_model_list = self._to_pr_events(
            reviews, pr_model, pr_event_model_list
        )
        if pr.merged_at:
            commits = list(
                map(
                    lambda x: x.__dict__["_rawData"], list(self._api.get_pr_commits(pr))
                )
            )
            pr_commits_model_list = self._to_pr_commits(commits, pr_model)

        # TODO: Cache PR metrics
        # pr_model = get_pr_cache_service().cache_pr_metrics(
        #     pr_model, pr_events_model_list, pr_commits_model_list
        # )

        return pr_model, pr_events_model_list, pr_commits_model_list

    def _process_github_repo(
        self, org_repos: List[OrgRepo], github_repo: GithubRepository
    ):

        repo_idempotency_key_id_map = {
            org_repo.idempotency_key: str(org_repo.id) for org_repo in org_repos
        }

        org_repo = OrgRepo(
            id=repo_idempotency_key_id_map.get(str(github_repo.id), uuid.uuid4()),
            org_id=self.org_id,
            name=github_repo.name,
            provider=self.provider,
            org_name=github_repo.organization.login,
            default_branch=github_repo.default_branch,
            language=github_repo.language,
            contributors=self._api.get_repo_contributors(github_repo),
            idempotency_key=str(github_repo.id),
            slug=github_repo.name,
            updated_at=time_now(),
        )
        return org_repo

    def _to_pr_model(
        self, pr: PullRequest, pr_model, repo_id: str, review_comments: int = 0
    ) -> PullRequest:
        state = self._get_state(pr)
        pr_id = pr_model.id if pr_model else uuid.uuid4()
        state_changed_at = None
        if state != PullRequestState.OPEN:
            state_changed_at = (
                pr.merged_at.astimezone(pytz.UTC)
                if pr.merged_at
                else pr.closed_at.astimezone(pytz.UTC)
            )

        merge_commit_sha: Optional[str] = self._get_merge_commit_sha(pr.raw_data, state)

        return PullRequest(
            id=pr_id,
            number=pr.number,
            title=pr.title,
            url=pr.html_url,
            created_at=pr.created_at.astimezone(pytz.UTC),
            updated_at=pr.updated_at.astimezone(pytz.UTC),
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

    def _get_merge_commit_sha(
        self, raw_data: Dict, state: PullRequestState
    ) -> Optional[str]:
        if state != PullRequestState.MERGED:
            return None

        merge_commit_sha = raw_data.get("merge_commit_sha")

        return merge_commit_sha

    def _get_state(self, pr: PullRequest) -> PullRequestState:
        if pr.merged_at:
            return PullRequestState.MERGED

        if pr.closed_at:
            return PullRequestState.CLOSED

        return PullRequestState.OPEN

    def _to_pr_events(
        self,
        reviews: [GithubPullRequestReview],
        pr_model: PullRequest,
        pr_events_model: [PullRequestEvent],
    ):
        pr_events = []
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
                    created_at=review.submitted_at.astimezone(pytz.UTC),
                    idempotency_key=str(review.id),
                    org_repo_id=pr_model.repo_id,
                    actor_username=username,
                )
            )
        return pr_events

    def _to_pr_commits(
        self,
        commits,
        pr_model: PullRequest,
    ):
        """
        Sample commit

        {
        'sha': '123456789098765',
        'commit': {'author': {'name': 'abc', 'email': 'abc@midd.com', 'date': '2022-06-29T10:53:15Z'},
        'committer': {'name': 'abc', 'email': 'abc@midd.com', 'date': '2022-06-29T10:53:15Z'},
        'message': '[abc 315] avoid mapping edit state',
        'html_url': 'https://github.com/abc',
        'author': {'login': 'abc', 'id': 95607047, 'node_id': 'abc', 'avatar_url': ''},
        }
        """
        pr_commits = []

        for commit in commits:
            pr_commits.append(
                PullRequestCommit(
                    hash=commit["sha"],
                    pull_request_id=str(pr_model.id),
                    url=commit["html_url"],
                    data=commit,
                    message=commit["commit"]["message"],
                    author=commit["author"]["login"]
                    if commit.get("author")
                    else commit["commit"].get("committer", {}).get("email", ""),
                    created_at=self._dt_from_github_dt_string(
                        commit["commit"]["committer"]["date"]
                    ),
                    org_repo_id=pr_model.repo_id,
                )
            )
        return pr_commits

    def _dt_from_github_dt_string(self, dt_string: str) -> datetime:
        return datetime.strptime(dt_string, "%Y-%m-%dT%H:%M:%SZ").astimezone(
            tz=pytz.UTC
        )
