from typing import List
from dora.store.models.incidents.enums import IncidentType
from dora.store import rollback_on_exc, session
from dora.store.models.incidents import (
    Incident,
    IncidentFilter,
    IncidentOrgIncidentServiceMap,
    TeamIncidentService,
)
from dora.utils.time import Interval


class IncidentsRepoService:
    def _apply_incident_filter(self, query, incident_filter: IncidentFilter = None):
        if not incident_filter:
            return query
        query = query.filter(*incident_filter.filter_query)
        return query

    @rollback_on_exc
    def get_resolved_team_incidents(
        self, team_id: str, interval: Interval, incident_filter: IncidentFilter = None
    ) -> List[Incident]:
        query = (
            session.query(Incident)
            .join(
                IncidentOrgIncidentServiceMap,
                Incident.id == IncidentOrgIncidentServiceMap.incident_id,
            )
            .join(
                TeamIncidentService,
                IncidentOrgIncidentServiceMap.service_id
                == TeamIncidentService.service_id,
            )
            .filter(
                TeamIncidentService.team_id == team_id,
            )
        )

        query = self._apply_incident_filter(query, incident_filter)
        query = query.filter(Incident.incident_type == IncidentType.ALERT)
        query = query.filter(
            Incident.resolved_date.between(interval.from_time, interval.to_time),
        )

        return query.order_by(Incident.creation_date.asc()).all()
