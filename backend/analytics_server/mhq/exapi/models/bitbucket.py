from dataclasses import dataclass
from datetime import datetime
from enum import Enum
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
    languages: Optional[Dict] = None
    contributors: Optional[List] = None

    def __init__(self, repo: Dict):
        self.name = repo.get("name", "")
        workspace = repo.get("workspace", {})
        self.org_name = workspace.get("slug", workspace.get("name", ""))
        self.default_branch = repo.get("mainbranch", {}).get("name", "main")
        self.idempotency_key = str(repo.get("uuid", ""))
        self.slug = repo.get("slug", "")
        self.description = repo.get("description", "")
        self.web_url = repo.get("links", {}).get("html", {}).get("href", "")
        self.languages = repo.get("language")

    def __hash__(self):
        return hash(self.idempotency_key)


class BitbucketPRState(Enum):
    OPEN = "OPEN"
    MERGED = "MERGED"
    SUPERSEDED = "SUPERSEDED"
    DECLINED = "DECLINED"


@dataclass
class BitbucketPR:
    number: int
    title: str
    url: str
    author: str
    reviewers: List[str]
    state: BitbucketPRState
    base_branch: str
    head_branch: str
    data: Dict
    created_at: datetime
    updated_at: datetime
    merged_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    merge_commit_sha: Optional[str] = None

    def __init__(self, pr: Dict):
        self.number = pr.get("id", 0)
        self.title = pr.get("title", "")
        self.url = pr.get("links", {}).get("html", {}).get("href", "")
        self.author = pr.get("author", {}).get("display_name", "")
        self.reviewers = [
            reviewer.get("display_name", "")
            for reviewer in pr.get("reviewers", [])
        ]
        state_str = pr.get("state", "OPEN").upper()
        try:
            self.state = BitbucketPRState(state_str)
        except ValueError:

            self.state = BitbucketPRState.OPEN
        self.base_branch = pr.get("destination", {}).get("branch", {}).get("name", "")
        self.head_branch = pr.get("source", {}).get("branch", {}).get("name", "")
        self.data = pr
        self.created_at = dt_from_iso_time_string(pr.get("created_on", "")) or datetime.now()
        self.updated_at = dt_from_iso_time_string(pr.get("updated_on", "")) or datetime.now()
        
        # Parse merge/close dates
        if pr.get("merge_commit"):
            self.merged_at = self.updated_at
            self.merge_commit_sha = pr.get("merge_commit", {}).get("hash", "")
        
        if self.state in [BitbucketPRState.DECLINED, BitbucketPRState.SUPERSEDED]:
            self.closed_at = self.updated_at


@dataclass
class BitbucketCommit:
    hash: str
    message: str
    url: str
    data: Dict
    author_email: str
    created_at: datetime

    def __init__(self, commit: Dict):
        self.hash = commit.get("hash", "")
        self.message = commit.get("message", "")
        self.url = commit.get("links", {}).get("html", {}).get("href", "")
        self.data = commit
        self.author_email = commit.get("author", {}).get("raw", "").split("<")[-1].replace(">", "").strip()
        self.created_at = dt_from_iso_time_string(commit.get("date", "")) or datetime.now()


class BitbucketReviewState(Enum):
    APPROVED = "approved"
    CHANGES_REQUESTED = "changes_requested"
    COMMENTED = "commented"


@dataclass
class BitbucketReview:
    id: str
    state: BitbucketReviewState
    created_at: datetime
    actor_username: str
    data: Dict
    idempotency_key: str

    def __init__(self, review: Dict):
        self.id = str(review.get("uuid", ""))
        self.state = BitbucketReviewState(review.get("state", "commented"))
        self.created_at = dt_from_iso_time_string(review.get("date", "")) or datetime.now()
        self.actor_username = review.get("user", {}).get("display_name", "")
        self.data = review
        self.idempotency_key = self.id