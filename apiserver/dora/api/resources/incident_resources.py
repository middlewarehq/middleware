from dora.store.models.incidents import Incident
from dora.api.resources.core_resources import adapt_user_info


def adapt_incident(
    incident: Incident,
    username_user_map: dict = None,
):
    return {
        "id": str(incident.id),
        "title": incident.title,
        "key": incident.key,
        "incident_number": incident.incident_number,
        "provider": incident.provider,
        "status": incident.status,
        "creation_date": incident.creation_date.isoformat(),
        "resolved_date": incident.resolved_date.isoformat()
        if incident.resolved_date
        else None,
        "acknowledged_date": incident.acknowledged_date.isoformat()
        if incident.acknowledged_date
        else None,
        "assigned_to": adapt_user_info(incident.assigned_to, username_user_map),
        "assignees": list(
            map(
                lambda assignee: adapt_user_info(assignee, username_user_map),
                incident.assignees or [],
            )
        ),
        "url": None,  # ToDo: Add URL to incidents
        "summary": incident.meta.get("summary"),
        "incident_type": incident.incident_type.value,
    }
