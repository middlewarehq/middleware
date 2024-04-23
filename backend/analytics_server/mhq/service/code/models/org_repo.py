from dataclasses import dataclass

from mhq.store.models.code.enums import CodeProvider


@dataclass
class RawOrgRepo:
    provider: CodeProvider
    name: str
    org_name: str
    slug: str
    idempotency_key: str
    default_branch: str
