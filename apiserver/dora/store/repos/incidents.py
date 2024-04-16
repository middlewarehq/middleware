from typing import List

from sqlalchemy import and_

from dora.store import db
from dora.store.models.incidents import (
    Incident,
    IncidentFilter,
    IncidentOrgIncidentServiceMap,
    TeamIncidentService,
    IncidentStatus,
    IncidentType,
    IncidentProvider,
    OrgIncidentService,
    IncidentsBookmark,
    IncidentBookmarkType,
)
from dora.utils.time import Interval


class IncidentsRepoService:
    def get_org_incident_services(self, org_id: str) -> List[OrgIncidentService]:
        return (
            db.session.query(OrgIncidentService)
            .filter(OrgIncidentService.org_id == org_id)
            .all()
        )

    def update_org_incident_services(self, incident_services: List[OrgIncidentService]):
        [db.session.merge(incident_service) for incident_service in incident_services]
        db.session.commit()

    def get_incidents_bookmark(
        self,
        entity_id: str,
        entity_type: IncidentBookmarkType,
        provider: IncidentProvider,
    ) -> IncidentsBookmark:
        return (
            db.session.query(IncidentsBookmark)
            .filter(
                and_(
                    IncidentsBookmark.entity_id == entity_id,
                    IncidentsBookmark.entity_type == entity_type,
                    IncidentsBookmark.provider == provider.value,
                )
            )
            .one_or_none()
        )

    def save_incidents_bookmark(self, bookmark: IncidentsBookmark):
        db.session.merge(bookmark)
        db.session.commit()

    def save_incidents_data(
        self,
        incidents: List[Incident],
        incident_org_incident_service_map: List[IncidentOrgIncidentServiceMap],
    ):
        [db.session.merge(incident) for incident in incidents]
        [
            db.session.merge(incident_service_map)
            for incident_service_map in incident_org_incident_service_map
        ]
        db.session.commit()

    def get_resolved_team_incidents(
        self, team_id: str, interval: Interval, incident_filter: IncidentFilter = None
    ) -> List[Incident]:
        query = self._get_team_incidents_query(team_id, incident_filter)

        query = query.filter(
            and_(
                Incident.status == IncidentStatus.RESOLVED.value,
                Incident.resolved_date.between(interval.from_time, interval.to_time),
            )
        )

        return query.all()

    def get_team_incidents(
        self, team_id: str, interval: Interval, incident_filter: IncidentFilter = None
    ) -> List[Incident]:
        query = self._get_team_incidents_query(team_id, incident_filter)

        query = query.filter(
            Incident.creation_date.between(interval.from_time, interval.to_time),
        )

        return query.all()

    def get_incident_by_key_type_and_provider(
        self, key: str, incident_type: IncidentType, provider: IncidentProvider
    ) -> Incident:
        return (
            db.session.query(Incident)
            .filter(
                and_(
                    Incident.key == key,
                    Incident.incident_type == incident_type,
                    Incident.provider == provider.value,
                )
            )
            .one_or_none()
        )

    def _get_team_incidents_query(
        self, team_id: str, incident_filter: IncidentFilter = None
    ):
        query = (
            db.session.query(Incident)
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

        return query.order_by(Incident.creation_date.asc())

    def _apply_incident_filter(self, query, incident_filter: IncidentFilter = None):
        if not incident_filter:
            return query
        query = query.filter(*incident_filter.filter_query)
        return query
