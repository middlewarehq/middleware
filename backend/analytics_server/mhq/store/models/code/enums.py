from enum import Enum


class CodeProvider(Enum):
    GITHUB = "github"
    GITLAB = "gitlab"


class CodeBookmarkType(Enum):
    PR = "PR"


class TeamReposDeploymentType(Enum):
    WORKFLOW = "WORKFLOW"
    PR_MERGE = "PR_MERGE"


class PullRequestState(Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    MERGED = "MERGED"


class PullRequestEventState(Enum):
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"
    COMMENTED = "commented"


class PullRequestEventType(Enum):
    ASSIGNED = "ASSIGNED"
    CLOSED = "CLOSED"
    COMMENTED = "COMMENTED"
    COMMITTED = "COMMITTED"
    CONVERT_TO_DRAFT = "CONVERT_TO_DRAFT"
    HEAD_REF_DELETED = "HEAD_REF_DELETED"
    HEAD_REF_FORCE_PUSHED = "HEAD_REF_FORCE_PUSHED"
    LABELED = "LABELED"
    LOCKED = "LOCKED"
    MERGED = "MERGED"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    REFERENCED = "REFERENCED"
    REOPENED = "REOPENED"
    REVIEW_DISMISSED = "REVIEW_DISMISSED"
    REVIEW_REQUESTED = "REVIEW_REQUESTED"
    REVIEW_REQUEST_REMOVED = "REVIEW_REQUEST_REMOVED"
    REVIEW = "REVIEW"
    UNASSIGNED = "UNASSIGNED"
    UNLABELED = "UNLABELED"
    UNLOCKED = "UNLOCKED"
    UNKNOWN = "UNKNOWN"


class PullRequestRevertPRMappingActorType(Enum):
    SYSTEM = "SYSTEM"
    USER = "USER"
