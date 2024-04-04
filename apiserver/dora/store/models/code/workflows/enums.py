from enum import Enum


class RepoWorkflowProviders(Enum):
    GITHUB_ACTIONS = "github"
    CIRCLE_CI = "circle_ci"

    @classmethod
    def get_workflow_providers(cls):
        return [v for v in cls.__members__.values()]

    @classmethod
    def get_workflow_providers_values(cls):
        return [v.value for v in cls.__members__.values()]

    @classmethod
    def get_enum(cls, provider: str):
        for v in cls.__members__.values():
            if provider == v.value:
                return v
        return None


class RepoWorkflowType(Enum):
    DEPLOYMENT = "DEPLOYMENT"


class RepoWorkflowRunsStatus(Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    PENDING = "PENDING"
    CANCELLED = "CANCELLED"
