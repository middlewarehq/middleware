from dataclasses import dataclass

from mhq.store.models.code.enums import CodeProvider, TeamReposDeploymentType


@dataclass
class RawTeamOrgRepo:
    team_id: str
    provider: CodeProvider
    name: str
    org_name: str
    slug: str
    idempotency_key: str
    default_branch: str
    deployment_type: TeamReposDeploymentType
