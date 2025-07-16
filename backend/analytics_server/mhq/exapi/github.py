import contextlib
from datetime import datetime
from http import HTTPStatus
from typing import Optional, Dict, Tuple, List, cast

import requests

from github import Github, UnknownObjectException
from github.GithubException import GithubException
from github.Organization import Organization as GithubOrganization
from github.PaginatedList import PaginatedList as GithubPaginatedList
from github.PullRequest import PullRequest as GithubPullRequest
from github.Repository import Repository as GithubRepository

from mhq.exapi.schemas.timeline import (
    GitHubPullTimelineEvent,
    GitHubPrTimelineEventsDict,
)
from mhq.exapi.models.github import GitHubContributor
from mhq.exapi.models.github_timeline import GithubPullRequestTimelineEvents
from mhq.store.models.code.enums import PullRequestEventType
from mhq.utils.log import LOG

PAGE_SIZE = 100


class GithubRateLimitExceeded(Exception):
    pass


class GithubApiService:
    def __init__(self, access_token: str, domain: Optional[str]):
        self._token = access_token
        self.base_url = self._get_api_url(domain)
        self._g = Github(self._token, base_url=self.base_url, per_page=PAGE_SIZE)
        self.headers = {"Authorization": f"Bearer {self._token}"}

    def _get_api_url(self, domain: str) -> str:
        if not domain:
            return "https://api.github.com"
        else:
            return f"{domain}/api/v3"

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

    def _fetch_timeline_events(
        self, repo_name: str, pr_number: int, page: int = 1
    ) -> List[Dict]:
        github_url = f"{self.base_url}/repos/{repo_name}/issues/{pr_number}/timeline"
        query_params = {"per_page": PAGE_SIZE, "page": page}

        try:
            response = requests.get(
                github_url, headers=self.headers, params=query_params
            )
        except requests.RequestException as e:
            raise GithubException(
                HTTPStatus.SERVICE_UNAVAILABLE, f"Network error: {str(e)}"
            ) from e

        if response.status_code == HTTPStatus.NOT_FOUND:
            raise GithubException(
                HTTPStatus.NOT_FOUND,
                f"PR {pr_number} not found for repo {repo_name}",
            )

        if response.status_code == HTTPStatus.FORBIDDEN:
            raise GithubRateLimitExceeded("GitHub API rate limit exceeded")

        if response.status_code != HTTPStatus.OK:
            raise GithubException(
                response.status_code,
                f"Failed to fetch timeline events: {response.text}",
            )

        try:
            return response.json()
        except ValueError as e:
            raise GithubException(
                HTTPStatus.INTERNAL_SERVER_ERROR, f"Invalid JSON response: {str(e)}"
            ) from e

    def _create_timeline_event(self, event_data: Dict) -> GitHubPrTimelineEventsDict:
        return GitHubPrTimelineEventsDict(
            event=event_data.get("event", ""),
            data=cast(GitHubPullTimelineEvent, event_data),
        )

    def get_pr_timeline_events(
        self, repo_name: str, pr_number: int
    ) -> List[GithubPullRequestTimelineEvents]:

        all_timeline_events: List[GitHubPrTimelineEventsDict] = []
        page = 1

        try:
            while True:
                timeline_events = self._fetch_timeline_events(
                    repo_name, pr_number, page
                )
                if not timeline_events:
                    break

                all_timeline_events.extend(
                    [
                        self._create_timeline_event(event_data)
                        for event_data in timeline_events
                    ]
                )

                if len(timeline_events) < PAGE_SIZE:
                    break
                page += 1

        except GithubException:
            raise
        except Exception as e:
            raise GithubException(
                HTTPStatus.INTERNAL_SERVER_ERROR, f"Unexpected error: {str(e)}"
            ) from e

        return self._adapt_github_timeline_events(all_timeline_events)

    @staticmethod
    def _adapt_github_timeline_events(
        timeline_events: List[GitHubPrTimelineEventsDict],
    ) -> List[GithubPullRequestTimelineEvents]:
        adapted_timeline_events: List[GithubPullRequestTimelineEvents] = []

        for timeline_event in timeline_events:
            event_data = timeline_event.get("data")
            if not event_data:
                continue

            event_type = timeline_event.get("event")
            if not event_type:
                continue

            event = GithubPullRequestTimelineEvents(event_type, event_data)

            if (
                all([event.timestamp, event.type, event.id, event.user])
                and event.type != PullRequestEventType.COMMITTED
            ):
                adapted_timeline_events.append(event)

        return adapted_timeline_events
