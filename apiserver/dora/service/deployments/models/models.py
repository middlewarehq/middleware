from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from voluptuous import default_factory


class DeploymentType(Enum):
    WORKFLOW = "WORKFLOW"
    PR_MERGE = "PR_MERGE"


class DeploymentStatus(Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    PENDING = "PENDING"
    CANCELLED = "CANCELLED"


@dataclass
class Deployment:
    deployment_type: DeploymentType
    repo_id: str
    entity_id: str
    provider: str
    actor: str
    head_branch: str
    conducted_at: datetime
    duration: int
    status: DeploymentStatus
    html_url: str
    meta: dict = default_factory(dict)

    def __hash__(self):
        return hash(self.deployment_type.value + "|" + str(self.entity_id))

    @property
    def id(self):
        return self.deployment_type.value + "|" + str(self.entity_id)
