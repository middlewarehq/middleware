from typing import TypedDict, Optional, Union, List


class UserDict(TypedDict):
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


class AuthorDict(TypedDict):
    name: str
    email: str
    date: str


class TreeDict(TypedDict):
    sha: str
    url: str


class ParentDict(TypedDict):
    sha: str
    url: str
    html_url: str


class VerificationDict(TypedDict):
    verified: bool
    reason: str
    signature: str
    payload: str
    verified_at: str


class CommitEvent(TypedDict):
    sha: str
    node_id: str
    url: str
    html_url: str
    author: AuthorDict
    committer: AuthorDict
    tree: TreeDict
    message: str
    parents: List[ParentDict]
    verification: Optional[VerificationDict]
    event: str


class CommentEvent(TypedDict):
    url: str
    html_url: str
    issue_url: str
    id: int
    node_id: str
    user: UserDict
    created_at: str
    updated_at: str
    author_association: str
    body: str
    event: str
    actor: UserDict


class IssueEvent(TypedDict):
    id: int
    node_id: str
    url: str
    actor: UserDict
    event: str
    commit_id: Optional[str]
    commit_url: Optional[str]
    created_at: str


class ReviewRequestedEvent(IssueEvent):
    review_requester: UserDict
    requested_reviewer: UserDict


class MergedEvent(IssueEvent):
    pass


class ClosedEvent(IssueEvent):
    state_reason: Optional[str]


class LinksDict(TypedDict):
    html: dict
    pull_request: dict


class ReviewEvent(TypedDict):
    id: int
    node_id: str
    user: UserDict
    body: str
    commit_id: str
    submitted_at: str
    state: str
    html_url: str
    pull_request_url: str
    author_association: str
    _links: LinksDict
    event: str


class ReadyForReviewEvent(IssueEvent):
    pass


class SourceDict(TypedDict):
    type: str
    issue: dict


class CrossReferencedEvent(TypedDict):
    actor: UserDict
    created_at: str
    updated_at: str
    source: SourceDict
    event: str


class ConvertToDraftEvent(IssueEvent):
    pass


class HeadRefDeletedEvent(IssueEvent):
    pass


class HeadRefForcePushedEvent(IssueEvent):
    before: str
    after: str


class LabeledEvent(IssueEvent):
    label: dict


class UnlabeledEvent(IssueEvent):
    label: dict


GitHubPullTimelineEvent = Union[
    CommitEvent,
    CommentEvent,
    IssueEvent,
    ReviewRequestedEvent,
    ReadyForReviewEvent,
    MergedEvent,
    ClosedEvent,
    ReviewEvent,
    CrossReferencedEvent,
    ConvertToDraftEvent,
    HeadRefDeletedEvent,
    HeadRefForcePushedEvent,
    LabeledEvent,
    UnlabeledEvent,
]


class GitHubPrTimelineEventsDict(TypedDict):
    event: str
    data: GitHubPullTimelineEvent
