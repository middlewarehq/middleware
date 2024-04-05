import contextlib
from datetime import datetime
from http import HTTPStatus
from typing import Optional, Dict, Tuple, List

import requests
from github import Github, UnknownObjectException
from github.GithubException import RateLimitExceededException
from github.Organization import Organization as GithubOrganization
from github.PaginatedList import PaginatedList as GithubPaginatedList
from github.PullRequest import PullRequest as GithubPullRequest
from github.PullRequestReview import PullRequestReview as GithubPullRequestReview
from github.Repository import Repository as GithubRepository

from dora.exapi.models.github import GitHubContributor
from dora.utils.log import LOG

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
        url = f"{self.base_url}/personal_access_tokens/self"

        response = requests.get(url, headers=self.headers)
        return response.status_code == 200

    def get_org_list(self) -> [GithubOrganization]:
        try:
            orgs = list(self._g.get_user().get_orgs())
        except RateLimitExceededException:
            raise GithubRateLimitExceeded("GITHUB_API_LIMIT_EXCEEDED")

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
        except RateLimitExceededException:
            raise GithubRateLimitExceeded("GITHUB_API_LIMIT_EXCEEDED")

        return [repo.__dict__["_rawData"] for repo in repos]

    def get_repo(self, org_login: str, repo_name: str) -> Optional[GithubRepository]:
        try:
            return self._g.get_repo(f"{org_login}/{repo_name}")
        except UnknownObjectException:
            return None

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

    def get_pr_reviews(
        self, pr: GithubPullRequest
    ) -> GithubPaginatedList[GithubPullRequestReview]:
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
