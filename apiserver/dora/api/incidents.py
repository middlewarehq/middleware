from typing import Dict, List
from datetime import datetime

from flask import Blueprint
from voluptuous import Required, Schema, Coerce, All
from dora.service.incidents.incidents import get_incident_service
from dora.api.resources.incident_resources import adapt_incident
from dora.store.models.incidents import Incident

from dora.api.request_utils import queryschema
from dora.service.query_validator import get_query_validator
from dora.store.models import Users

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
