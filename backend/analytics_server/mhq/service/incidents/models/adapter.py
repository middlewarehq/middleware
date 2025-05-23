from mhq.store.models.incidents import Incident
from mhq.store.models.code.pull_requests import PullRequest
from mhq.store.models.incidents.enums import IncidentStatus, IncidentType


def adaptIncidentPR(incident_pr: PullRequest, resolution_pr: PullRequest) -> Incident:
    return Incident(
        id=incident_pr.id,
        provider=incident_pr.provider,
        key=str(incident_pr.id),
        title=incident_pr.title,
        incident_number=int(incident_pr.number),
        status=IncidentStatus.RESOLVED.value,
        creation_date=incident_pr.state_changed_at,
        acknowledged_date=resolution_pr.created_at,
        resolved_date=resolution_pr.state_changed_at,
        assigned_to=resolution_pr.author,
        assignees=[resolution_pr.author],
        url=incident_pr.url,
        meta={},
        incident_type=IncidentType.REVERT_PR,
    )
