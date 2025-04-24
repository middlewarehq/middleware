import contextlib
from datetime import datetime
from http import HTTPStatus
from typing import Any, Optional, Dict, Tuple, List

import requests
from github import Github, UnknownObjectException
from github.GithubException import GithubException
from github.Organization import Organization as GithubOrganization
from github.PaginatedList import PaginatedList as GithubPaginatedList
from github.PullRequest import PullRequest as GithubPullRequest
from github.Repository import Repository as GithubRepository

from mhq.exapi.models.github import GitHubContributor
from mhq.exapi.types.timeline import (
    GitHubReadyForReviewEventDict,
    GitHubReviewEventDict,
)
from mhq.exapi.models.timeline import (
    GitHubTimeline,
    GitHubReadyForReviewEvent,
    GitHubReviewEvent,
    GitHubUser,
)
from mhq.utils.log import LOG

PAGE_SIZE = 100


class GithubRateLimitExceeded(Exception):
    pass


class GithubApiService:
    def __init__(self, access_token: str):
        self._token = access_token
        self._g = Github(self._token, per_page=PAGE_SIZE)
        self.base_url = "https://api.github.com"
        self.headers = {"Authorization": f"Bearer {self._token}"}

    @contextlib.contextmanager
    def temp_config(self, per_page: int = 30):
        self._g.per_page = per_page
        yield
        self._g.per_page = PAGE_SIZE

    def check_pat(self) -> bool:
        """
        Checks if PAT is Valid
        :returns:
        :raises HTTPError: If the request fails and status code is not 200
        """
        url = f"{self.base_url}/user"
        try:
            response = requests.get(url, headers=self.headers)
        except GithubException as e:
            raise Exception(f"Error in PAT validation, Error: {e.data}")
        return response.status_code == 200

    def get_org_list(self) -> [GithubOrganization]:
        try:
            orgs = list(self._g.get_user().get_orgs())
        except GithubException as e:
            raise e

        return orgs

    def get_repos(
        self, org_login: str, per_page: int = 30, page: int = 0
    ) -> [GithubRepository]:
        with self.temp_config(
            per_page=per_page
        ):  # This works on assumption of single thread, else make thread local
            o = self._g.get_organization(org_login)
            repos = o.get_repos().get_page(page)
        return repos

    def get_repos_raw(
        self, org_login: str, per_page: int = 30, page: int = 0
    ) -> [Dict]:
        try:
            repos = self.get_repos(org_login, per_page, page)
        except GithubException as e:
            raise e

        return [repo.__dict__["_rawData"] for repo in repos]

    def get_user_repos_raw(self, per_page: int = 30, page: int = 0) -> [Dict]:
        try:
            user = self._g.get_user()
            with self.temp_config(per_page=per_page):
                repos = user.get_repos().get_page(page)
        except GithubException as e:
            raise e

        return [repo.__dict__["_rawData"] for repo in repos]

    def get_repo(self, org_login: str, repo_name: str) -> Optional[GithubRepository]:
        try:
            return self._g.get_repo(f"{org_login}/{repo_name}")
        except GithubException as e:
            raise e

    def get_repo_contributors(self, github_repo: GithubRepository) -> [Tuple[str, int]]:
        contributors = list(github_repo.get_contributors())
        return [(u.login, u.contributions) for u in contributors]

    def get_pull_requests(
        self, repo: GithubRepository, state="all", sort="updated", direction="desc"
    ) -> GithubPaginatedList:
        return repo.get_pulls(state=state, sort=sort, direction=direction)

    def get_raw_prs(self, prs: [GithubPullRequest]):
        return [pr.__dict__["_rawData"] for pr in prs]

    def get_pull_request(
        self, github_repo: GithubRepository, number: int
    ) -> GithubPullRequest:
        return github_repo.get_pull(number=number)

    def get_pr_commits(self, pr: GithubPullRequest):
        return pr.get_commits()

    def get_pr_reviews(self, pr: GithubPullRequest) -> GithubPaginatedList:
        return pr.get_reviews()

    def get_pr_timeline(
        self, org_login: str, repo_name: str, pr_number: int
    ) -> List[GitHubTimeline]:
        """
        Fetches the timeline events for a pull request.

        Args:
            org_login: The organization login name
            repo_name: The repository name
            pr_number: The pull request number

        Returns:
            List of GitHub timeline events

        Raises:
            GithubException: If the API request fails
        """
        try:
            timeline_events = self._fetch_all_timeline_events(
                org_login, repo_name, pr_number
            )
            return self._process_timeline_events(timeline_events)
        except GithubException as e:
            LOG.error(
                f"Failed to fetch PR timeline for {org_login}/{repo_name}#{pr_number}: {str(e)}"
            )
            raise

    def _process_timeline_events(
        self, timeline_events: List[Dict[str, Any]]
    ) -> List[GitHubTimeline]:
        """Process raw timeline events into model objects."""
        result = []
        for event in timeline_events:
            if not self._is_supported_event(event):
                continue

            timeline_model = self._convert_to_timeline_model(event)
            if timeline_model:
                result.append(timeline_model)

        return result

    def _fetch_all_timeline_events(
        self, org_login: str, repo_name: str, pr_number: int
    ) -> List[Dict[str, Any]]:
        """
        Fetches all timeline events with pagination.

        Args:
            org_login: The organization login name
            repo_name: The repository name
            pr_number: The pull request number

        Returns:
            List of raw timeline events

        Raises:
            GithubException: If the API request fails
        """
        all_events = []
        page = 1

        while True:
            github_url = f"{self.base_url}/repos/{org_login}/{repo_name}/issues/{pr_number}/timeline"
            query_params = {"per_page": PAGE_SIZE, "page": page}

            response = requests.get(
                github_url, headers=self.headers, params=query_params
            )

            if response.status_code != HTTPStatus.OK:
                raise GithubException(response.status_code, response.json())

            data = response.json()
            all_events.extend(data)

            if len(data) < PAGE_SIZE:
                break

            page += 1

        return all_events

    def _is_supported_event(self, timeline_event: Dict[str, Any]) -> bool:
        """
        Checks if the event type is supported.

        Args:
            timeline_event: Raw timeline event data

        Returns:
            True if event type is supported, False otherwise
        """
        SUPPORTED_EVENTS = {"ready_for_review", "reviewed"}
        return timeline_event.get("event") in SUPPORTED_EVENTS

    def _convert_to_timeline_model(
        self, timeline_event: Dict[str, Any]
    ) -> Optional[GitHubTimeline]:
        """
        Converts raw event data into a typed model instance.

        Args:
            timeline_event: Raw timeline event data

        Returns:
            GitHubTimeline object or None if event type is not supported
        """
        event_type = timeline_event.get("event")

        event_converters = {
            "ready_for_review": self._create_ready_for_review_event,
            "reviewed": self._create_review_event,
        }

        converter = event_converters.get(event_type)
        if not converter:
            return None

        return converter(timeline_event)

    def _create_ready_for_review_event(
        self, event_data: Dict[str, Any]
    ) -> GitHubReadyForReviewEvent:
        """
        Creates a ReadyForReview event from raw data.

        Args:
            event_data: Raw event data

        Returns:
            GitHubReadyForReviewEvent object
        """
        typed_dict = GitHubReadyForReviewEventDict(
            id=event_data.get("id"),
            node_id=event_data.get("node_id"),
            url=event_data.get("url"),
            actor=event_data.get("actor"),
            event=event_data.get("event"),
            commit_id=event_data.get("commit_id"),
            commit_url=event_data.get("commit_url"),
            created_at=event_data.get("created_at"),
            performed_via_github_app=event_data.get("performed_via_github_app"),
        )

        return GitHubReadyForReviewEvent(
            id=typed_dict["id"],
            node_id=typed_dict["node_id"],
            url=typed_dict["url"],
            actor=GitHubUser(**typed_dict["actor"]) if typed_dict["actor"] else None,
            event=typed_dict["event"],
            commit_id=typed_dict.get("commit_id"),
            commit_url=typed_dict.get("commit_url"),
            created_at=typed_dict["created_at"],
            performed_via_github_app=typed_dict.get("performed_via_github_app"),
        )

    def _create_review_event(self, event_data: Dict[str, Any]) -> GitHubReviewEvent:
        """
        Creates a Review event from raw data.

        Args:
            event_data: Raw event data

        Returns:
            GitHubReviewEvent object
        """
        typed_dict = GitHubReviewEventDict(
            id=event_data.get("id"),
            node_id=event_data.get("node_id"),
            user=event_data.get("user"),
            body=event_data.get("body"),
            commit_id=event_data.get("commit_id"),
            submitted_at=event_data.get("submitted_at"),
            state=event_data.get("state"),
            html_url=event_data.get("html_url"),
            pull_request_url=event_data.get("pull_request_url"),
            author_association=event_data.get("author_association"),
            _links=event_data.get("_links"),
            event=event_data.get("event"),
        )

        return GitHubReviewEvent(
            id=typed_dict["id"],
            node_id=typed_dict["node_id"],
            user=GitHubUser(**typed_dict["user"]) if typed_dict["user"] else None,
            body=typed_dict["body"],
            commit_id=typed_dict["commit_id"],
            submitted_at=typed_dict["submitted_at"],
            state=typed_dict["state"],
            html_url=typed_dict["html_url"],
            pull_request_url=typed_dict["pull_request_url"],
            author_association=typed_dict["author_association"],
            _links=typed_dict["_links"],
            event=typed_dict["event"],
        )

    def get_contributors(
        self, org_login: str, repo_name: str
    ) -> List[GitHubContributor]:

        gh_contributors_list = []
        page = 1

        def _get_contributor_data_from_dict(contributor) -> GitHubContributor:
            return GitHubContributor(
                login=contributor["login"],
                id=contributor["id"],
                node_id=contributor["node_id"],
                avatar_url=contributor["avatar_url"],
                contributions=contributor["contributions"],
                events_url=contributor["events_url"],
                followers_url=contributor["followers_url"],
                following_url=contributor["following_url"],
                site_admin=contributor["site_admin"],
                gists_url=contributor["gists_url"],
                gravatar_id=contributor["gravatar_id"],
                html_url=contributor["html_url"],
                organizations_url=contributor["organizations_url"],
                received_events_url=contributor["received_events_url"],
                repos_url=contributor["repos_url"],
                starred_url=contributor["starred_url"],
                type=contributor["type"],
                subscriptions_url=contributor["subscriptions_url"],
                url=contributor["url"],
            )

        def _fetch_contributors(page: int = 0):
            github_url = f"{self.base_url}/repos/{org_login}/{repo_name}/contributors"
            query_params = dict(per_page=PAGE_SIZE, page=page)
            response = requests.get(
                github_url, headers=self.headers, params=query_params
            )
            assert response.status_code == HTTPStatus.OK
            return response.json()

        data = _fetch_contributors(page=page)
        while data:
            gh_contributors_list += data
            if len(data) < PAGE_SIZE:
                break

            page += 1
            data = _fetch_contributors(page=page)

        contributors: List[GitHubContributor] = [
            _get_contributor_data_from_dict(contributor)
            for contributor in gh_contributors_list
        ]
        return contributors

    def get_org_members(self, org_login: str) -> List[GitHubContributor]:

        gh_org_member_list = []
        page = 1

        def _get_contributor_data_from_dict(contributor) -> GitHubContributor:
            return GitHubContributor(
                login=contributor["login"],
                id=contributor["id"],
                node_id=contributor["node_id"],
                avatar_url=contributor["avatar_url"],
                events_url=contributor["events_url"],
                followers_url=contributor["followers_url"],
                following_url=contributor["following_url"],
                site_admin=contributor["site_admin"],
                gists_url=contributor["gists_url"],
                gravatar_id=contributor["gravatar_id"],
                html_url=contributor["html_url"],
                organizations_url=contributor["organizations_url"],
                received_events_url=contributor["received_events_url"],
                repos_url=contributor["repos_url"],
                starred_url=contributor["starred_url"],
                type=contributor["type"],
                subscriptions_url=contributor["subscriptions_url"],
                url=contributor["url"],
                contributions=0,
            )

        def _fetch_members(page: int = 0):
            github_url = f"{self.base_url}/orgs/{org_login}/members"
            query_params = dict(per_page=PAGE_SIZE, page=page)
            response = requests.get(
                github_url, headers=self.headers, params=query_params
            )
            assert response.status_code == HTTPStatus.OK
            return response.json()

        data = _fetch_members(page=page)
        while data:
            gh_org_member_list += data
            if len(data) < PAGE_SIZE:
                break

            page += 1
            data = _fetch_members(page=page)

        members: List[GitHubContributor] = [
            _get_contributor_data_from_dict(contributor)
            for contributor in gh_org_member_list
        ]
        return members

    def get_repo_workflows(
        self, org_login: str, repo_name: str
    ) -> Optional[GithubPaginatedList]:
        try:
            return self._g.get_repo(f"{org_login}/{repo_name}").get_workflows()
        except UnknownObjectException:
            return None

    def get_workflow_runs(
        self, org_login: str, repo_name: str, workflow_id: str, bookmark: datetime
    ):
        repo_workflows = []
        page = 1

        def _fetch_workflow_runs(page: int = 1):
            github_url = f"{self.base_url}/repos/{org_login}/{repo_name}/actions/workflows/{workflow_id}/runs"
            query_params = dict(
                per_page=PAGE_SIZE,
                page=page,
                created=f"created:>={bookmark.isoformat()}",
            )
            response = requests.get(
                github_url, headers=self.headers, params=query_params
            )

            if response.status_code == HTTPStatus.NOT_FOUND:
                LOG.error(
                    f"[GitHub Sync Repo Workflow Worker] Workflow {workflow_id} Not found "
                    f"for repo {org_login}/{repo_name}"
                )
                return {}

            assert response.status_code == HTTPStatus.OK
            return response.json()

        data = _fetch_workflow_runs(page=page)
        while data and data.get("workflow_runs"):
            curr_workflow_repos = data.get("workflow_runs")
            repo_workflows += curr_workflow_repos
            if len(curr_workflow_repos) == 0:
                break

            page += 1
            data = _fetch_workflow_runs(page=page)
        return repo_workflows
