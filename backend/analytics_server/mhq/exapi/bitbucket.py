from datetime import datetime
from typing import Dict, List, Optional

import requests
from requests.exceptions import HTTPError

PAGE_SIZE = 50


class BitbucketRateLimitExceeded(Exception):
    """Raised on HTTP 429. The client only reports; the ETL handler owns the
    pause-and-resume policy, because only it knows what has been safely
    stored so far."""

    def __init__(self, message: str, retry_after_seconds: Optional[int] = None):
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class BitbucketApiService:
    """Bitbucket Cloud v2 REST client.

    CLUSTOX: auth is an Atlassian API token via HTTP Basic auth
    (email, token) -- app passwords are being phased out by Atlassian, and
    OAuth would be a different shape from every other integration here. The
    pair rides on the session, never in a header string and never in a URL.
    """

    def __init__(self, email: str, api_token: str):
        self.base_url = "https://api.bitbucket.org/2.0"
        self._session = requests.Session()
        self._session.auth = (email, api_token)

    def check_pat(self) -> bool:
        url = f"{self.base_url}/user"
        try:
            response = self._session.get(url)
        except Exception as e:
            raise Exception(f"Error in Bitbucket token validation, Error: {e}")
        return response.status_code == 200

    def _handle_error(self, response):
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            raise BitbucketRateLimitExceeded(
                "Bitbucket rate limit exceeded",
                retry_after_seconds=int(retry_after) if retry_after else None,
            )
        if response.status_code != 200:
            try:
                error = (response.json().get("error") or {}).get("message", "")
            except ValueError:
                error = ""
            raise HTTPError(
                f"Request failed with status {response.status_code}: {error}"
            )

    def _get_paginated(self, url: str, params: Optional[Dict] = None) -> List[Dict]:
        """Bitbucket paginates by `next` link, not page numbers: each page is
        `{"values": [...], "next": "<absolute url>"}` and the last page has no
        `next`. The `next` URL already carries every query param, so params go
        only on the first request."""
        values: List[Dict] = []
        request_params = {**(params or {}), "pagelen": PAGE_SIZE}

        while url:
            response = self._session.get(url, params=request_params)
            self._handle_error(response)
            body = response.json()
            values.extend(body.get("values") or [])
            url = body.get("next")
            request_params = None

        return values

    def get_workspaces(self) -> List[Dict]:
        return self._get_paginated(f"{self.base_url}/workspaces")

    def get_workspace_repos(self, workspace: str) -> List[Dict]:
        return self._get_paginated(f"{self.base_url}/repositories/{workspace}")

    def get_repo_pull_requests(
        self, workspace: str, repo_slug: str, updated_since: datetime
    ) -> List[Dict]:
        url = f"{self.base_url}/repositories/{workspace}/{repo_slug}/pullrequests"
        # CLUSTOX: `state` must list every state explicitly -- without it the
        # API returns ONLY open PRs, and every merged PR silently vanishes
        # from lead time. Fetched "successfully", wrong, and invisible.
        params = {
            "q": f'updated_on > "{updated_since.isoformat()}"',
            "sort": "updated_on",
            "state": ["MERGED", "OPEN", "DECLINED", "SUPERSEDED"],
        }
        return self._get_paginated(url, params)

    def get_pr_activity(self, workspace: str, repo_slug: str, pr_id: int) -> List[Dict]:
        url = (
            f"{self.base_url}/repositories/{workspace}/{repo_slug}"
            f"/pullrequests/{pr_id}/activity"
        )
        return self._get_paginated(url)

    def get_pr_commits(self, workspace: str, repo_slug: str, pr_id: int) -> List[Dict]:
        url = (
            f"{self.base_url}/repositories/{workspace}/{repo_slug}"
            f"/pullrequests/{pr_id}/commits"
        )
        return self._get_paginated(url)

    def get_pr_diffstat(self, workspace: str, repo_slug: str, pr_id: int) -> List[Dict]:
        url = (
            f"{self.base_url}/repositories/{workspace}/{repo_slug}"
            f"/pullrequests/{pr_id}/diffstat"
        )
        return self._get_paginated(url)
