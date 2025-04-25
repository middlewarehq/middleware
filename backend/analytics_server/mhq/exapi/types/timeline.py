from typing import TypedDict, Dict, Union, Literal


class GitHubUserDict(TypedDict):
    """GitHub user information as a dictionary."""

    # Required fields
    login: str
    id: int
    node_id: str
    type: str


class GitHubUserOptionalDict(TypedDict, total=False):
    """Optional fields for GitHub users."""

    # URL fields
    avatar_url: str
    html_url: str
    url: str
    gravatar_id: str

    # Relation URLs
    followers_url: str
    following_url: str
    gists_url: str
    starred_url: str
    subscriptions_url: str
    organizations_url: str
    repos_url: str
    events_url: str
    received_events_url: str


class GitHubUserFullDict(GitHubUserDict, GitHubUserOptionalDict):
    """Complete GitHub user dictionary with both required and optional fields."""


# Review event required fields
class GitHubReviewEventDict(TypedDict):
    """GitHub review event information."""

    # Required fields
    id: int
    node_id: str
    user: GitHubUserFullDict
    event: Literal["reviewed"]
    submitted_at: str
    state: str
    html_url: str
    pull_request_url: str


# Review event optional fields
class GitHubReviewEventOptionalDict(TypedDict, total=False):
    """Optional fields for GitHub review events."""

    body: str
    commit_id: str
    author_association: str
    _links: Dict


# Combined GitHub review event with both required and optional fields
class GitHubReviewEventFullDict(GitHubReviewEventDict, GitHubReviewEventOptionalDict):
    """Complete GitHub review event dictionary."""


# Base event required fields
class GitHubEventBaseDict(TypedDict):
    """Base GitHub event information."""

    id: int
    node_id: str
    url: str
    created_at: str
    event: str


# Base event optional fields
class GitHubEventBaseOptionalDict(TypedDict, total=False):
    """Optional fields for base GitHub events."""

    actor: GitHubUserFullDict
    commit_id: str
    commit_url: str
    performed_via_github_app: str


# Combined base event with both required and optional fields
class GitHubEventBaseFullDict(GitHubEventBaseDict, GitHubEventBaseOptionalDict):
    """Complete base GitHub event dictionary."""


# Ready for review event
class GitHubReadyForReviewEventDict(GitHubEventBaseFullDict):
    """GitHub ready for review event information."""

    event: Literal["ready_for_review"]


# Timeline item union type
GitHubTimelineItemDict = Union[
    GitHubReviewEventFullDict,
    GitHubReadyForReviewEventDict,
]
