from typing import List
from datetime import datetime
from dora.store.models.incidents.incidents import Incident
from dora.utils.string import uuid4_str

from dora.utils.time import time_now


def get_incident(
    id: str = uuid4_str(),
    provider: str = "provider",
    key: str = "key",
    title: str = "title",
    status: str = "status",
    incident_number: int = 0,
    creation_date: datetime = time_now(),
    created_at: datetime = time_now(),
    updated_at: datetime = time_now(),
    resolved_date: datetime = time_now(),
    acknowledged_date: datetime = time_now(),
    assigned_to: str = "assigned_to",
    assignees: List[str] = [],
    meta: dict = {},
) -> Incident:
    return Incident(
        id=id,
        provider=provider,
        key=key,
        title=title,
        status=status,
        incident_number=incident_number,
        created_at=created_at,
        updated_at=updated_at,
        creation_date=creation_date,
        resolved_date=resolved_date,
        assigned_to=assigned_to,
        assignees=assignees,
        acknowledged_date=acknowledged_date,
        meta=meta,
    )
