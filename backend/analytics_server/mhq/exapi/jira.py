from typing import Dict, List, Optional, Tuple

import requests
from requests.auth import HTTPBasicAuth

from mhq.exapi.models.jira import JiraBoard, JiraIssue, JiraSprint

# Jira retired GET/POST /rest/api/3/search in favor of /rest/api/3/search/jql
# (the old endpoint now returns 410 Gone) -- pagination there is cursor-based
# via nextPageToken, not startAt/total.
_SEARCH_PAGE_SIZE = 100
# Deliberately narrow: only what Ticket/JiraIssue actually use. Story
# points/sprint are intentionally not requested -- Jira exposes those as
# instance-specific customfield_* ids that need a separate /field lookup
# to resolve by name, and nothing downstream reads them yet. Add that
# lookup if/when a consumer needs them, rather than paying for it now.
_ISSUE_FIELDS = ["summary", "status", "issuetype", "created", "updated"]


class JiraApiError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class JiraRateLimitExceeded(JiraApiError):
    def __init__(self, retry_after: Optional[str] = None):
        super().__init__("Jira rate limit exceeded", status_code=429)
        self.retry_after = retry_after


class JiraApiService:
    def __init__(self, email: str, api_token: str, site_url: str):
        self.base_url = f"https://{site_url}/rest/api/3"
        # Sprints/boards live on a different API surface than issues --
        # /rest/agile/1.0, not /rest/api/3 -- same site, same auth.
        self.agile_base_url = f"https://{site_url}/rest/agile/1.0"
        self._auth = HTTPBasicAuth(email, api_token)

    def check_pat(self) -> bool:
        response = requests.get(f"{self.base_url}/myself", auth=self._auth, timeout=8)
        return response.status_code == 200

    def search_issues(
        self,
        jql: str,
        next_page_token: Optional[str] = None,
        max_results: int = _SEARCH_PAGE_SIZE,
    ) -> Dict:
        """
        One page of /rest/api/3/search/jql, with the changelog expanded
        so status-transition history comes back in the same call --
        avoids a separate per-issue changelog request (a real N+1 this
        way, not just a theoretical one, since a project can easily have
        hundreds of issues).
        """
        body = {
            "jql": jql,
            "fields": _ISSUE_FIELDS,
            "expand": "changelog",
            "maxResults": max_results,
        }
        if next_page_token:
            body["nextPageToken"] = next_page_token

        response = requests.post(
            f"{self.base_url}/search/jql", json=body, auth=self._auth, timeout=15
        )
        self._raise_for_error(response)
        return response.json()

    def get_all_issues(self, jql: str) -> List[JiraIssue]:
        issues: List[JiraIssue] = []
        next_page_token = None

        while True:
            page = self.search_issues(jql, next_page_token=next_page_token)
            page_issues = page.get("issues") or []
            issues.extend(JiraIssue(issue) for issue in page_issues)

            next_page_token = page.get("nextPageToken")
            # Defensive on both signals: this endpoint dropped the old
            # /search's explicit isLast/total fields in favor of a bare
            # cursor, so stop on either "no cursor for a next page" or "the
            # page came back empty" -- either alone is a safe stop
            # condition, so checking both can't loop forever even if one
            # of them doesn't behave exactly as expected for some query.
            if not next_page_token or not page_issues:
                break

        return issues

    def get_boards_for_project(self, project_key: str) -> List[JiraBoard]:
        """
        CLUSTOX: Jira integration -- the Sprint rollup chart (docs/
        JIRA_INTEGRATION_PROPOSAL.md §6D). Only scrum boards have
        sprints -- callers filter on board_type before ever calling the
        sprint endpoints below, so a Kanban-only project cleanly syncs
        zero sprints rather than erroring.
        """
        boards: List[JiraBoard] = []
        start_at = 0

        while True:
            response = requests.get(
                f"{self.agile_base_url}/board",
                params={"projectKeyOrId": project_key, "startAt": start_at},
                auth=self._auth,
                timeout=8,
            )
            self._raise_for_error(response)
            page = response.json()
            page_values = page.get("values") or []
            boards.extend(JiraBoard(board) for board in page_values)

            if page.get("isLast", True) or not page_values:
                break
            start_at += len(page_values)

        return boards

    def get_sprints_for_board(self, board_id: int) -> List[JiraSprint]:
        sprints: List[JiraSprint] = []
        start_at = 0

        while True:
            response = requests.get(
                f"{self.agile_base_url}/board/{board_id}/sprint",
                params={"startAt": start_at},
                auth=self._auth,
                timeout=8,
            )
            self._raise_for_error(response)
            page = response.json()
            page_values = page.get("values") or []
            sprints.extend(JiraSprint(sprint) for sprint in page_values)

            if page.get("isLast", True) or not page_values:
                break
            start_at += len(page_values)

        return sprints

    def get_sprint_issue_counts(self, sprint_id: int) -> Tuple[int, int]:
        """
        (planned_count, completed_count) for one sprint -- two
        maxResults=0 calls that read only each response's own `total`
        metadata field, never the issue bodies themselves. A sprint can
        carry hundreds of issues on a real site (confirmed live against
        this org's own data), so fetching full issue lists just to count
        them would be needless -- Jira's sprint-issue endpoint already
        reports `total` without paginating through the issues at all.
        """
        planned = self._sprint_issue_total(sprint_id)
        completed = self._sprint_issue_total(sprint_id, jql="statusCategory = Done")
        return planned, completed

    def _sprint_issue_total(self, sprint_id: int, jql: Optional[str] = None) -> int:
        params = {"maxResults": 0}
        if jql:
            params["jql"] = jql

        response = requests.get(
            f"{self.agile_base_url}/sprint/{sprint_id}/issue",
            params=params,
            auth=self._auth,
            timeout=8,
        )
        self._raise_for_error(response)
        return response.json().get("total", 0)

    def _raise_for_error(self, response: requests.Response) -> None:
        if response.status_code == 429:
            raise JiraRateLimitExceeded(retry_after=response.headers.get("Retry-After"))
        if response.status_code in (401, 403):
            raise JiraApiError(
                "Jira credentials were rejected", status_code=response.status_code
            )
        if response.status_code >= 400:
            raise JiraApiError(
                f"Jira request failed with status {response.status_code}: "
                f"{response.text}",
                status_code=response.status_code,
            )
