from typing import TypedDict, Dict, Optional, Union, Literal


class GitHubUserDict(TypedDict):
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


class GitHubReviewEventDict(TypedDict):
    id: int
    node_id: str
    user: GitHubUserDict
    body: str
    commit_id: str
    submitted_at: str
    state: str
    html_url: str
    pull_request_url: str
    author_association: str
    _links: Dict
    event: Literal["reviewed"]


class GitHubEventBaseDict(TypedDict):
    id: int
    node_id: str
    url: str
    actor: GitHubUserDict
    event: str
    commit_id: Optional[str]
    commit_url: Optional[str]
    created_at: str
    performed_via_github_app: Optional[str]


class GitHubReadyForReviewEventDict(GitHubEventBaseDict):
    event: Literal["ready_for_review"]


GitHubTimelineItemDict = Union[
    GitHubReviewEventDict,
    GitHubReadyForReviewEventDict,
]
