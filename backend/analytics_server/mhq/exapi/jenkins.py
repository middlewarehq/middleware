# CLUSTOX: Jenkins REST client. Knows Jenkins' API shape and nothing about our
# models -- adaptation to RepoWorkflowRuns lives in the ETL handler.
from datetime import datetime
from typing import Dict, List, Tuple

import pytz
import requests

# Connect and read timeouts. The workspace sync loop is sequential, so an
# untimed request against a hung Jenkins stalls every workspace behind it.
DEFAULT_TIMEOUT: Tuple[int, int] = (5, 30)

# Fetched per build. Explicit rather than a wildcard so a Jenkins with many
# plugins does not return megabytes of action data per build.
BUILD_TREE = (
    "builds[number,result,timestamp,duration,url,building,"
    "actions[causes[userId,userName,shortDescription],"
    "lastBuiltRevision[SHA1,branch[name]]]]"
)

JOB_TREE = "jobs[name,fullName,url]"


def job_path(job_full_name: str) -> str:
    """Jenkins addresses nested jobs by repeating /job/ for each segment."""
    return "/".join(f"job/{segment}" for segment in job_full_name.split("/"))


class JenkinsApiService:
    def __init__(
        self,
        base_url: str,
        username: str,
        api_token: str,
        timeout: Tuple[int, int] = DEFAULT_TIMEOUT,
    ):
        self._base_url = base_url.rstrip("/")
        self._auth = (username, api_token)
        self._timeout = timeout

    def _get(self, path: str):
        # TLS verification is deliberately not configurable. A skip-verify
        # option is easy to add, hard to remove, and this connection carries an
        # API token.
        return requests.get(
            f"{self._base_url}/{path}",
            auth=self._auth,
            timeout=self._timeout,
            verify=True,
        )

    def check_pat(self) -> bool:
        response = self._get("api/json")
        return response.status_code == 200

    def get_jobs(self) -> List[Dict]:
        response = self._get(f"api/json?tree={JOB_TREE}")
        response.raise_for_status()
        return [
            {
                "name": job.get("name"),
                "full_name": job.get("fullName") or job.get("name"),
                "url": job.get("url"),
            }
            for job in response.json().get("jobs", [])
        ]

    def get_builds(self, job_full_name: str, bookmark: datetime) -> List[Dict]:
        response = self._get(f"{job_path(job_full_name)}/api/json?tree={BUILD_TREE}")
        response.raise_for_status()
        builds = response.json().get("builds", [])
        return [
            build
            for build in builds
            if self._build_time(build) and self._build_time(build) > bookmark
        ]

    @staticmethod
    def _build_time(build: Dict):
        timestamp = build.get("timestamp")
        if not timestamp:
            return None
        return datetime.fromtimestamp(timestamp / 1000, tz=pytz.UTC)
