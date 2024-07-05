from enum import Enum


class CodeProvider(Enum):
    GITHUB = "github"
    GITLAB = "gitlab"


class BookmarkType(Enum):
    PR = "PR"


class TeamReposDeploymentType(Enum):
    WORKFLOW = "WORKFLOW"
    PR_MERGE = "PR_MERGE"


class PullRequestState(Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    MERGED = "MERGED"


class PullRequestEventState(Enum):
    CHANGES_REQUESTED = "CHANGES_REQUESTED"
    APPROVED = "APPROVED"
    COMMENTED = "COMMENTED"


class PullRequestEventType(Enum):
    REVIEW = "REVIEW"


class PullRequestRevertPRMappingActorType(Enum):
    SYSTEM = "SYSTEM"
    USER = "USER"
