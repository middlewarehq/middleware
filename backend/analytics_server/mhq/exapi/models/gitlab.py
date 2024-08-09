from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from mhq.utils.time import dt_from_iso_time_string


@dataclass
class GitlabRepo:
    name: str
    org_name: str
    default_branch: str
    idempotency_key: str
    slug: str
    description: str
    web_url: str
    languages: Dict = None
    contributors: List = None

    def __init__(self, project: Dict):
        self.name = project.get("name")
        self.org_name = project.get("namespace", {}).get("full_path")
        self.default_branch = project.get("default_branch")
        self.idempotency_key = str(project.get("id"))
        self.slug = project.get("path")
        self.description = project.get("description")
        self.web_url = project.get("web_url")
        self.languages = project.get("languages")
        self.contributors = project.get("contributors")

    def __hash__(self):
        return hash(str(self.idempotency_key))


@dataclass
class GitlabUser:
    name: str
    username: str
    avatar_url: str
    meta: dict

    def __init__(self, user: Dict):
        self.name = user.get("name")
        self.username = user.get("username")
        self.avatar_url = user.get("avatar_url")
        self.meta = user

    def __hash__(self):
        return hash(str(self.username))


class GitlabPRState(Enum):
    OPENED = "opened"
    CLOSED = "closed"
    MERGED = "merged"
    LOCKED = "locked"


@dataclass
class GitlabPR:
    title: str
    url: str
    number: str
    author: str
    base_branch: str
    head_branch: str
    data: dict
    created_at: datetime
    updated_at: datetime
    closed_at: datetime
    merged_at: datetime
    reviewers: list
    merge_commit_sha: Optional[str]
    merged_by: Optional[str]

    def __init__(self, pr: Dict):
        self.title = pr.get("title")
        self.url = pr.get("web_url")
        self.number = str(pr.get("iid"))
        self.author = pr.get("author", {}).get("username")
        self.base_branch = pr.get("target_branch")
        self.head_branch = pr.get("source_branch")
        self.data = pr
        self.created_at = dt_from_iso_time_string(pr.get("created_at"))
        self.updated_at = dt_from_iso_time_string(pr.get("updated_at"))
        self.closed_at = (
            dt_from_iso_time_string(pr.get("closed_at"))
            if pr.get("closed_at")
            else None
        )
        self.merged_at = (
            dt_from_iso_time_string(pr.get("merged_at"))
            if pr.get("merged_at")
            else None
        )
        self.reviewers = [
            reviewer.get("username") for reviewer in pr.get("reviewers", [])
        ]
        self.merge_commit_sha = pr.get("merge_commit_sha")
        self.merged_by = (pr.get("merged_by") or {}).get("username")

    @property
    def state(self):
        state = self.data.get("state")
        if state == "opened":
            return GitlabPRState.OPENED
        if state == "closed":
            return GitlabPRState.CLOSED
        if state == "merged":
            return GitlabPRState.MERGED
        if state == "locked":
            return GitlabPRState.LOCKED


@dataclass
class GitlabCommit:
    message: str
    url: str
    hash: str
    author_email: str
    created_at: datetime
    data: dict

    def __init__(self, commit: Dict):
        self.message = commit.get("message")
        self.url = commit.get("web_url")
        self.hash = commit.get("id")
        self.author_email = commit.get("author_email")
        self.created_at = dt_from_iso_time_string(commit.get("created_at"))
        self.data = commit


class GitlabNoteType(Enum):
    CHANGES_REQUESTED = "CHANGES_REQUESTED"
    APPROVED = "APPROVED"
    COMMENTED = "COMMENTED"
    UPDATED = "UPDATED"


def _is_pr_approved_event(data: dict) -> bool:
    body: str = data.get("body")
    if body == "approved this merge request":
        return True
    return False


@dataclass
class GitlabNote:
    data: dict
    created_at: datetime
    idempotency_key: str
    actor_username: str

    def __init__(self, note: Dict):
        self.data = note
        self.created_at = dt_from_iso_time_string(note.get("created_at"))
        self.idempotency_key = str(note.get("id"))
        self.actor_username = note.get("author", {}).get("username")

    @property
    def state(self):
        type = self.data.get("type")
        if type == "DiffNote":
            return GitlabNoteType.CHANGES_REQUESTED
        system: bool = self.data.get("system")
        if not system:
            return GitlabNoteType.COMMENTED
        if _is_pr_approved_event(self.data):
            return GitlabNoteType.APPROVED
        return GitlabNoteType.UPDATED
