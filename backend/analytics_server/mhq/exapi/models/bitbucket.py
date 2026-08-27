from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

from mhq.utils.time import dt_from_iso_time_string


@dataclass
class BitbucketRepo:
    name: str
    org_name: str
    default_branch: str
    idempotency_key: str
    slug: str
    description: str
    web_url: str

    def __init__(self, repo: Dict):
        self.name = repo.get("name")
        # CLUSTOX: the workspace slug is Bitbucket's org-level container --
        # the counterpart of a GitHub org / GitLab namespace.
        self.org_name = (repo.get("workspace") or {}).get("slug")
        self.default_branch = (repo.get("mainbranch") or {}).get("name")
        # The uuid, not the slug: slugs can be renamed, uuids cannot, and the
        # idempotency key is what sync dedupes on across renames.
        self.idempotency_key = repo.get("uuid")
        self.slug = repo.get("slug")
        self.description = repo.get("description")
        self.web_url = ((repo.get("links") or {}).get("html") or {}).get("href")


@dataclass
class BitbucketPR:
    number: int
    title: str
    state: str
    author_uuid: Optional[str]
    author_nickname: Optional[str]
    head_branch: Optional[str]
    base_branch: Optional[str]
    created_on: Optional[datetime]
    updated_on: Optional[datetime]
    merge_commit_sha: Optional[str]
    url: Optional[str]
    participants: List[Dict]
    raw_data: Dict

    def __init__(self, pr: Dict):
        self.number = pr.get("id")
        self.title = pr.get("title") or ""
        self.state = pr.get("state")
        author = pr.get("author") or {}
        self.author_uuid = author.get("uuid")
        self.author_nickname = author.get("nickname")
        self.head_branch = ((pr.get("source") or {}).get("branch") or {}).get("name")
        self.base_branch = ((pr.get("destination") or {}).get("branch") or {}).get(
            "name"
        )
        self.created_on = _dt_or_none(pr.get("created_on"))
        self.updated_on = _dt_or_none(pr.get("updated_on"))
        # CLUSTOX: null on every unmerged PR -- the common case, not an edge
        # case. `or {}` keeps a None from exploding the chain.
        self.merge_commit_sha = (pr.get("merge_commit") or {}).get("hash")
        self.url = ((pr.get("links") or {}).get("html") or {}).get("href")
        self.participants = pr.get("participants") or []
        self.raw_data = pr


def _dt_or_none(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return dt_from_iso_time_string(value)
