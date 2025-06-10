from typing import TypedDict, Optional, Union, List


class GithubUserDict(TypedDict):
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


class GitHubAuthorDict(TypedDict):
    name: str
    email: str
    date: str


class GitHubTreeDict(TypedDict):
    sha: str
    url: str


class GitHubParentDict(TypedDict):
    sha: str
    url: str
    html_url: str


class GitHubVerificationDict(TypedDict):
    verified: bool
    reason: str
    signature: str
    payload: str
    verified_at: str


class GitHubCommitEvent(TypedDict):
    sha: str
    node_id: str
    url: str
    html_url: str
    author: GitHubAuthorDict
    committer: GitHubAuthorDict
    tree: GitHubTreeDict
    message: str
    parents: List[GitHubParentDict]
    verification: Optional[GitHubVerificationDict]
    event: str


class GitHubCommentEvent(TypedDict):
    url: str
    html_url: str
    issue_url: str
    id: int
    node_id: str
    user: GithubUserDict
    created_at: str
    updated_at: str
    author_association: str
    body: str
    event: str
    actor: GithubUserDict


class GitHubIssueEvent(TypedDict):
    id: int
    node_id: str
    url: str
    actor: GithubUserDict
    event: str
    commit_id: Optional[str]
    commit_url: Optional[str]
    created_at: str


class GitHubReviewRequestedEvent(GitHubIssueEvent):
    review_requester: GithubUserDict
    requested_reviewer: GithubUserDict


class GitHubMergedEvent(GitHubIssueEvent):
    pass


class GitHubClosedEvent(GitHubIssueEvent):
    state_reason: Optional[str]


class GitHubLinksDict(TypedDict):
    html: dict
    pull_request: dict


class GitHubReviewEvent(TypedDict):
    id: int
    node_id: str
    user: GithubUserDict
    body: str
    commit_id: str
    submitted_at: str
    state: str
    html_url: str
    pull_request_url: str
    author_association: str
    _links: GitHubLinksDict
    event: str


class GitHubReadyForReviewEvent(GitHubIssueEvent):
    pass


class GitHubSourceDict(TypedDict):
    type: str
    issue: dict


class GitHubCrossReferencedEvent(TypedDict):
    actor: GithubUserDict
    created_at: str
    updated_at: str
    source: GitHubSourceDict
    event: str


class GitHubConvertToDraftEvent(GitHubIssueEvent):
    pass


class GitHubHeadRefDeletedEvent(GitHubIssueEvent):
    pass


class GitHubHeadRefForcePushedEvent(GitHubIssueEvent):
    before: str
    after: str


class GitHubLabeledEvent(GitHubIssueEvent):
    label: dict


class GitHubUnlabeledEvent(GitHubIssueEvent):
    label: dict


GitHubPullTimelineEvent = Union[
    GitHubCommitEvent,
    GitHubCommentEvent,
    GitHubIssueEvent,
    GitHubReviewRequestedEvent,
    GitHubReadyForReviewEvent,
    GitHubMergedEvent,
    GitHubClosedEvent,
    GitHubReviewEvent,
    GitHubCrossReferencedEvent,
    GitHubConvertToDraftEvent,
    GitHubHeadRefDeletedEvent,
    GitHubHeadRefForcePushedEvent,
    GitHubLabeledEvent,
    GitHubUnlabeledEvent,
]


class GitHubPrTimelineEventsDict(TypedDict):
    event: str
    data: GitHubPullTimelineEvent
