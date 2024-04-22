from typing import Dict, List
from mhq.service.incidents.models.mean_time_to_recovery import (
    MeanTimeToRecoveryMetrics,
    ChangeFailureRateMetrics,
)
from mhq.api.resources.deployment_resources import adapt_deployment
from mhq.service.deployments.models.models import Deployment
from mhq.store.models.incidents import Incident
from mhq.api.resources.core_resources import adapt_user_info


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


def adapt_deployments_with_related_incidents(
    deployment: Deployment,
    deployment_incidents_map: Dict[Deployment, List[Incident]],
    username_user_map: dict = None,
):
    deployment_response = adapt_deployment(deployment, username_user_map)
    incidents = deployment_incidents_map.get(deployment, [])
    incident_response = list(
        map(lambda incident: adapt_incident(incident, username_user_map), incidents)
    )
    deployment_response["incidents"] = incident_response
    return deployment_response


def adapt_mean_time_to_recovery_metrics(
    mean_time_to_recovery: MeanTimeToRecoveryMetrics,
):
    return {
        "mean_time_to_recovery": mean_time_to_recovery.mean_time_to_recovery,
        "incident_count": mean_time_to_recovery.incident_count,
    }


def adapt_change_failure_rate(change_failure_rate: ChangeFailureRateMetrics):
    return {
        "change_failure_rate": change_failure_rate.change_failure_rate,
        "failed_deployments": change_failure_rate.failed_deployments_count,
        "total_deployments": change_failure_rate.total_deployments_count,
    }
