from collections.abc import Awaitable
from typing import Dict, List
import requests
from datetime import datetime
from requests.exceptions import HTTPError
import aiohttp

from mhq.exapi.models.gitlab import GitlabCommit, GitlabNote, GitlabRepo, GitlabUser


class GithubRateLimitExceeded(Exception):
    pass


class GitlabApiService:
    def __init__(self, access_token: str, domain="gitlab.com"):
        self._token = access_token
        self.base_url = f"https://{domain}/api/v4"
        self.headers = {"Authorization": f"Bearer {self._token}"}

    def check_pat(self) -> bool:
        """
        Checks if PAT is Valid
        :returns:
        :raises HTTPError: If the request fails and status code is not 200
        """
        url = f"{self.base_url}/user"
        try:
            response = requests.get(url, headers=self.headers)
        except Exception as e:
            raise Exception(f"Error in PAT validation, Error: {e.data}")

        return response.status_code == 200

    def _handle_error(self, response):
        if response.status_code != 200:
            error = response.json().get("error", "")
            message = response.json().get("message", "")
            raise HTTPError(
                f"Request failed with status {response.status_code}: {error} {message}"
            )

    def get_authenticated_user(self) -> GitlabUser:
        url = f"{self.base_url}/user"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        user = response.json()
        return GitlabUser(user)

    def get_user_projects(
        self, user_id: int, page: int = 1, per_page: int = 20
    ) -> List[GitlabRepo]:
        url = f"{self.base_url}/users/{user_id}/projects"
        params = {
            "page": page,
            "per_page": per_page,
            "order_by": "updated_at",
            "sort": "desc",
        }
        response = requests.get(url, headers=self.headers, params=params)
        self._handle_error(response)
        projects = response.json()
        return list(map(GitlabRepo, projects))

    def get_groups(self) -> List[Dict]:
        url = f"{self.base_url}/groups"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        groups = response.json()
        return groups

    def get_group_projects(
        self, group_id, page_size: int = 20, page: int = 1
    ) -> List[GitlabRepo]:
        url = f"{self.base_url}/groups/{group_id}/projects"
        params = {"page": page, "per_page": page_size}
        response = requests.get(url, headers=self.headers, params=params)
        self._handle_error(response)
        projects = response.json()
        return list(map(GitlabRepo, projects))

    def get_group_members(self, group_id) -> List[GitlabUser]:
        url = f"{self.base_url}/groups/{group_id}/members/all"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        members = response.json()
        return list(map(GitlabUser, members))

    def get_project(self, project_id) -> GitlabRepo:
        url = f"{self.base_url}/projects/{project_id}"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        project = response.json()
        return GitlabRepo(project)

    def get_project_users(self, project_id) -> List[GitlabUser]:
        url = f"{self.base_url}/projects/{project_id}/users"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        users = response.json()
        return list(map(GitlabUser, users))

    def get_project_languages(self, project_id) -> Dict[str, float]:
        url = f"{self.base_url}/projects/{project_id}/languages"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        language_map = response.json()
        return language_map

    def get_project_contributors(self, project_id):
        url = f"{self.base_url}/projects/{project_id}/repository/contributors"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        contributors = response.json()
        return contributors

    async def get_project_merge_requests(
        self, project_id, updated_after: datetime, per_page=20
    ) -> Awaitable[List[Dict]]:
        updated_after = updated_after.isoformat()
        url = f"{self.base_url}/projects/{project_id}/merge_requests"
        params = {"per_page": per_page, "updated_after": updated_after}
        merge_requests = []

        async with aiohttp.ClientSession(headers=self.headers) as session:
            page = 1
            while True:
                params["page"] = page
                async with session.get(url, params=params) as response:
                    response.raise_for_status()
                    page_merge_requests = await response.json()
                    merge_requests.extend(page_merge_requests)

                    if len(page_merge_requests) < per_page:
                        break

                    page += 1

        return merge_requests

    def get_merge_request_commits(
        self, project_id, merge_request_internal_id
    ) -> List[GitlabCommit]:
        url = f"{self.base_url}/projects/{project_id}/merge_requests/{merge_request_internal_id}/commits"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        commits = response.json()
        return list(map(GitlabCommit, commits))

    def get_merge_request_notes(
        self, project_id, merge_request_internal_id
    ) -> List[GitlabNote]:
        url = f"{self.base_url}/projects/{project_id}/merge_requests/{merge_request_internal_id}/notes"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        notes = response.json()
        return list(map(GitlabNote, notes))

    def get_merge_request_diff(
        self, project_id, merge_request_internal_id
    ) -> List[Dict]:
        url = f"{self.base_url}/projects/{project_id}/merge_requests/{merge_request_internal_id}/diffs"
        response = requests.get(url, headers=self.headers)
        self._handle_error(response)
        diff = response.json()
        return diff
