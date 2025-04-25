from typing import Optional, Dict, Literal, Union
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class GitHubUser:
    """GitHub user information.

    Required fields:
        login: GitHub username
        id: Unique user identifier
        node_id: GitHub node identifier
        type: User type (e.g., "User", "Organization")
    """

    # Required core fields
    login: str
    id: int
    node_id: str
    type: str

    # Optional URL fields
    avatar_url: Optional[str] = None
    html_url: Optional[str] = None
    url: Optional[str] = None
    gravatar_id: Optional[str] = None

    # Optional relation URLs
    followers_url: Optional[str] = None
    following_url: Optional[str] = None
    gists_url: Optional[str] = None
    starred_url: Optional[str] = None
    subscriptions_url: Optional[str] = None
    organizations_url: Optional[str] = None
    repos_url: Optional[str] = None
    events_url: Optional[str] = None
    received_events_url: Optional[str] = None


@dataclass
class GitHubReviewEvent:
    """GitHub pull request review event.

    Required fields:
        id: Unique event identifier
        node_id: GitHub node identifier
        user: User who performed the review
        event: Event type (always "reviewed")
    """

    # Required core fields
    id: int
    node_id: str
    user: GitHubUser
    event: Literal["reviewed"]

    # Optional content fields
    body: Optional[str] = None
    state: Optional[str] = None

    # Optional reference fields
    commit_id: Optional[str] = None
    html_url: Optional[str] = None
    pull_request_url: Optional[str] = None
    author_association: Optional[str] = None

    # Optional metadata
    submitted_at: Optional[Union[str, datetime]] = None
    _links: Optional[Dict] = field(default_factory=dict)

    def __post_init__(self):
        # Convert string timestamps to datetime objects
        if isinstance(self.submitted_at, str) and self.submitted_at:
            self.submitted_at = datetime.fromisoformat(
                self.submitted_at.replace("Z", "+00:00")
            )


@dataclass
class GitHubReadyForReviewEvent:
    """GitHub ready for review event for pull requests.

    Required fields:
        id: Unique event identifier
        node_id: GitHub node identifier
        actor: User who marked PR as ready for review
        event: Event type (always "ready_for_review")
    """

    # Required core fields
    id: int
    node_id: str
    actor: GitHubUser
    event: Literal["ready_for_review"]

    # Optional reference fields
    url: Optional[str] = None
    commit_id: Optional[str] = None
    commit_url: Optional[str] = None

    # Optional metadata
    created_at: Optional[Union[str, datetime]] = None
    performed_via_github_app: Optional[str] = None

    def __post_init__(self):
        # Convert string timestamps to datetime objects
        if isinstance(self.created_at, str) and self.created_at:
            self.created_at = datetime.fromisoformat(
                self.created_at.replace("Z", "+00:00")
            )


# Type alias for timeline events
GitHubTimeline = Union[GitHubReviewEvent, GitHubReadyForReviewEvent]
