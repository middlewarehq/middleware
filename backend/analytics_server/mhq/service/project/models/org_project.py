from dataclasses import dataclass


@dataclass
class RawTeamOrgProject:
    team_id: str
    provider: str
    key: str
    name: str
    idempotency_key: str
