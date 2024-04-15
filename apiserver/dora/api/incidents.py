import json
from typing import Dict, List

from datetime import datetime

from flask import Blueprint
from voluptuous import Required, Schema, Coerce, All, Optional
from dora.service.code.pr_filter import apply_pr_filter
from dora.store.models.code.filter import PRFilter
from dora.store.models.settings import SettingType, EntityType
from dora.service.incidents.models.mean_time_to_recovery import ChangeFailureRateMetrics
from dora.service.deployments.deployment_service import (
    get_deployments_service,
)
from dora.service.deployments.models.models import Deployment
from dora.store.models.code.workflows.filter import WorkflowFilter
from dora.utils.time import Interval
from dora.service.incidents.incidents import get_incident_service
from dora.api.resources.incident_resources import (
    adapt_change_failure_rate,
    adapt_deployments_with_related_incidents,
    adapt_incident,
    adapt_mean_time_to_recovery_metrics,
)
from dora.store.models.incidents import Incident

from dora.api.request_utils import coerce_workflow_filter, queryschema
from dora.service.query_validator import get_query_validator

app = Blueprint("incidents", __name__)


@app.route("/teams/<team_id>/resolved_incidents", methods={"GET"})
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
        }
    ),
)
def get_resolved_incidents(team_id: str, from_time: datetime, to_time: datetime):

    query_validator = get_query_validator()
    interval = query_validator.interval_validator(from_time, to_time)
    query_validator.team_validator(team_id)

    incident_service = get_incident_service()

    resolved_incidents: List[Incident] = incident_service.get_resolved_team_incidents(
        team_id, interval
    )

    # ToDo: Generate a user map

    return [adapt_incident(incident) for incident in resolved_incidents]


@app.route("/teams/<team_id>/deployments_with_related_incidents", methods=["GET"])
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
            Optional("workflow_filter"): All(str, Coerce(coerce_workflow_filter)),
        }
    ),
)
def get_deployments_with_related_incidents(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: dict = None,
    workflow_filter: WorkflowFilter = None,
):
    query_validator = get_query_validator()
    interval = Interval(from_time, to_time)
    query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )

    deployments: List[
        Deployment
    ] = get_deployments_service().get_team_all_deployments_in_interval(
        team_id, interval, pr_filter, workflow_filter
    )

    incident_service = get_incident_service()

    incidents: List[Incident] = incident_service.get_team_incidents(team_id, interval)

    deployment_incidents_map: Dict[
        Deployment, List[Incident]
    ] = incident_service.get_deployment_incidents_map(deployments, incidents)

    return list(
        map(
            lambda deployment: adapt_deployments_with_related_incidents(
                deployment, deployment_incidents_map
            ),
            deployments,
        )
    )


@app.route("/teams/<team_id>/mean_time_to_recovery", methods=["GET"])
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
        }
    ),
)
def get_team_mttr(team_id: str, from_time: datetime, to_time: datetime):
    query_validator = get_query_validator()
    interval = query_validator.interval_validator(from_time, to_time)
    query_validator.team_validator(team_id)

    incident_service = get_incident_service()

    team_mean_time_to_recovery_metrics = (
        incident_service.get_team_mean_time_to_recovery(team_id, interval)
    )

    return adapt_mean_time_to_recovery_metrics(team_mean_time_to_recovery_metrics)


@app.route("/teams/<team_id>/mean_time_to_recovery/trends", methods=["GET"])
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
        }
    ),
)
def get_team_mttr_trends(team_id: str, from_time: datetime, to_time: datetime):
    query_validator = get_query_validator()
    interval = query_validator.interval_validator(from_time, to_time)
    query_validator.team_validator(team_id)

    incident_service = get_incident_service()

    weekly_mean_time_to_recovery_metrics = (
        incident_service.get_team_mean_time_to_recovery_trends(team_id, interval)
    )

    return {
        week.isoformat(): adapt_mean_time_to_recovery_metrics(
            mean_time_to_recovery_metrics
        )
        for week, mean_time_to_recovery_metrics in weekly_mean_time_to_recovery_metrics.items()
    }


@app.route("/teams/<team_id>/change_failure_rate", methods=["GET"])
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
            Optional("workflow_filter"): All(str, Coerce(coerce_workflow_filter)),
        }
    ),
)
def get_team_cfr(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: dict = None,
    workflow_filter: WorkflowFilter = None,
):

    query_validator = get_query_validator()
    interval = Interval(from_time, to_time)
    query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )

    deployments: List[
        Deployment
    ] = get_deployments_service().get_team_all_deployments_in_interval(
        team_id, interval, pr_filter, workflow_filter
    )

    incident_service = get_incident_service()

    incidents: List[Incident] = incident_service.get_team_incidents(team_id, interval)

    team_change_failure_rate: ChangeFailureRateMetrics = (
        incident_service.get_change_failure_rate_metrics(deployments, incidents)
    )

    return adapt_change_failure_rate(team_change_failure_rate)


@app.route("/teams/<team_id>/change_failure_rate/trends", methods=["GET"])
@queryschema(
    Schema(
        {
            Required("from_time"): All(str, Coerce(datetime.fromisoformat)),
            Required("to_time"): All(str, Coerce(datetime.fromisoformat)),
            Optional("pr_filter"): All(str, Coerce(json.loads)),
            Optional("workflow_filter"): All(str, Coerce(coerce_workflow_filter)),
        }
    ),
)
def get_team_cfr_trends(
    team_id: str,
    from_time: datetime,
    to_time: datetime,
    pr_filter: dict = None,
    workflow_filter: WorkflowFilter = None,
):

    query_validator = get_query_validator()
    interval = Interval(from_time, to_time)
    query_validator.team_validator(team_id)

    pr_filter: PRFilter = apply_pr_filter(
        pr_filter, EntityType.TEAM, team_id, [SettingType.EXCLUDED_PRS_SETTING]
    )

    deployments: List[
        Deployment
    ] = get_deployments_service().get_team_all_deployments_in_interval(
        team_id, interval, pr_filter, workflow_filter
    )

    incident_service = get_incident_service()

    incidents: List[Incident] = incident_service.get_team_incidents(team_id, interval)

    team_weekly_change_failure_rate: Dict[
        datetime, ChangeFailureRateMetrics
    ] = incident_service.get_weekly_change_failure_rate(
        interval, deployments, incidents
    )

    return {
        week.isoformat(): adapt_change_failure_rate(change_failure_rate)
        for week, change_failure_rate in team_weekly_change_failure_rate.items()
    }
