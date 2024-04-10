from datetime import datetime
from typing import List

from voluptuous import default_factory

from dora.store.models.incidents import IncidentType, OrgIncidentService
from dora.store.models.incidents.incidents import (
    Incident,
    IncidentOrgIncidentServiceMap,
)
from dora.utils.string import uuid4_str
from dora.utils.time import time_now


def get_incident(
    id: str = uuid4_str(),
    provider: str = "provider",
    key: str = "key",
    title: str = "title",
    status: str = "status",
    incident_number: int = 0,
    incident_type: IncidentType = IncidentType("INCIDENT"),
    creation_date: datetime = time_now(),
    created_at: datetime = time_now(),
    updated_at: datetime = time_now(),
    resolved_date: datetime = time_now(),
    acknowledged_date: datetime = time_now(),
    assigned_to: str = "assigned_to",
    assignees: List[str] = default_factory(list),
    meta: dict = default_factory(dict),
) -> Incident:
    return Incident(
        id=id,
        provider=provider,
        key=key,
        title=title,
        status=status,
        incident_number=incident_number,
        incident_type=incident_type,
        created_at=created_at,
        updated_at=updated_at,
        creation_date=creation_date,
        resolved_date=resolved_date,
        assigned_to=assigned_to,
        assignees=assignees,
        acknowledged_date=acknowledged_date,
        meta=meta,
    )


def get_org_incident_service(
    service_id: str,
    org_id: str = uuid4_str(),
    name: str = "Service",
    provider: str = "PagerDuty",
    key: str = "service_key",
    auto_resolve_timeout: int = 0,
    acknowledgement_timeout: int = 0,
    created_by: str = "user",
    provider_team_keys=default_factory(list),
    status: str = "active",
    meta: dict = default_factory(dict),
):
    return OrgIncidentService(
        id=service_id if service_id else uuid4_str(),
        org_id=org_id if org_id else uuid4_str(),
        name=name,
        provider=provider,
        key=key,
        auto_resolve_timeout=auto_resolve_timeout,
        acknowledgement_timeout=acknowledgement_timeout,
        created_by=created_by,
        provider_team_keys=provider_team_keys,
        status=status,
        meta=meta,
        created_at=time_now(),
        updated_at=time_now(),
    )


def get_incident_org_incident_map(
    incident_id: str = uuid4_str(), service_id: str = uuid4_str()
):
    return IncidentOrgIncidentServiceMap(incident_id=incident_id, service_id=service_id)
