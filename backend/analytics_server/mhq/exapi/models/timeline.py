from typing import Optional, Dict, Literal, Union
from dataclasses import dataclass
from datetime import datetime


@dataclass
class GitHubUser:
    login: str
    id: int
    node_id: str
    avatar_url: str
    gravatar_id: str
    url: str
    html_url: str
    followers_url: str
    following_url: str
    gists_url: str
    starred_url: str
    subscriptions_url: str
    organizations_url: str
    repos_url: str
    events_url: str
    received_events_url: str
    type: str
    user_view_type: str
    site_admin: bool


@dataclass
class GitHubReviewEvent:
    id: int
    node_id: str
    user: GitHubUser
    body: str
    commit_id: str
    submitted_at: Union[str, datetime]
    state: str
    html_url: str
    pull_request_url: str
    author_association: str
    _links: Dict
    event: Literal["reviewed"]

    def __post_init__(self):
        if isinstance(self.submitted_at, str) and self.submitted_at:
            # Convert ISO format with Z (UTC) to datetime
            self.submitted_at = datetime.fromisoformat(
                self.submitted_at.replace("Z", "+00:00")
            )


@dataclass
class GitHubReadyForReviewEvent:
    id: int
    node_id: str
    url: str
    actor: GitHubUser
    event: Literal["ready_for_review"]
    commit_id: Optional[str] = None
    commit_url: Optional[str] = None
    created_at: Union[str, datetime] = ""
    performed_via_github_app: Optional[str] = None

    def __post_init__(self):
        if isinstance(self.created_at, str) and self.created_at:
            # Convert ISO format with Z (UTC) to datetime
            self.created_at = datetime.fromisoformat(
                self.created_at.replace("Z", "+00:00")
            )


GitHubTimeline = Union[GitHubReviewEvent, GitHubReadyForReviewEvent]
