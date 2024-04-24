from typing import List

from sqlalchemy import and_
from mhq.store.models.core.teams import Team
from mhq.store.models.incidents.enums import IncidentSource

from mhq.store import db, rollback_on_exc
from mhq.store.models.incidents import (
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
from mhq.utils.time import Interval


class IncidentsRepoService:
    def __init__(self):
        self._db = db

    @rollback_on_exc
    def get_org_incident_services(
        self, org_id: str, source_type: IncidentSource = None, keys: List[str] = None
    ) -> List[OrgIncidentService]:

        query = self._db.session.query(OrgIncidentService).filter(
            OrgIncidentService.org_id == org_id
        )

        if source_type:
            query = query.filter(OrgIncidentService.source_type == source_type)

        if keys:
            query = query.filter(OrgIncidentService.key.in_(keys))

        return query.all()

    @rollback_on_exc
    def get_org_incident_services_by_ids(
        self, ids: List[str]
    ) -> List[OrgIncidentService]:

        return (
            self._db.session.query(OrgIncidentService)
            .filter(OrgIncidentService.id.in_(ids))
            .all()
        )

    @rollback_on_exc
    def update_org_incident_services(self, incident_services: List[OrgIncidentService]):
        [
            self._db.session.merge(incident_service)
            for incident_service in incident_services
        ]
        self._db.session.commit()
        return self.get_org_incident_services_by_ids(
            [incident_service.id for incident_service in incident_services]
        )

    @rollback_on_exc
    def get_team_incident_services(self, team: Team) -> List[TeamIncidentService]:

        return (
            self._db.session.query(TeamIncidentService)
            .filter(and_(TeamIncidentService.team_id == team.id))
            .all()
        )

    @rollback_on_exc
    def add_team_incident_services(self, services: List[TeamIncidentService]):
        for service in services:
            self._db.session.merge(service)
        self._db.session.commit()

    @rollback_on_exc
    def delete_team_incident_services(self, services: List[TeamIncidentService]):
        for service in services:
            self._db.session.delete(service)
        self._db.session.commit()

    @rollback_on_exc
    def get_incidents_bookmark(
        self,
        entity_id: str,
        entity_type: IncidentBookmarkType,
        provider: IncidentProvider,
    ) -> IncidentsBookmark:
        return (
            self._db.session.query(IncidentsBookmark)
            .filter(
                and_(
                    IncidentsBookmark.entity_id == entity_id,
                    IncidentsBookmark.entity_type == entity_type,
                    IncidentsBookmark.provider == provider.value,
                )
            )
            .one_or_none()
        )

    @rollback_on_exc
    def save_incidents_bookmark(self, bookmark: IncidentsBookmark):
        self._db.session.merge(bookmark)
        self._db.session.commit()

    @rollback_on_exc
    def save_incidents_data(
        self,
        incidents: List[Incident],
        incident_org_incident_service_map: List[IncidentOrgIncidentServiceMap],
    ):
        [self._db.session.merge(incident) for incident in incidents]
        [
            self._db.session.merge(incident_service_map)
            for incident_service_map in incident_org_incident_service_map
        ]
        self._db.session.commit()

    @rollback_on_exc
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

    @rollback_on_exc
    def get_team_incidents(
        self, team_id: str, interval: Interval, incident_filter: IncidentFilter = None
    ) -> List[Incident]:
        query = self._get_team_incidents_query(team_id, incident_filter)

        query = query.filter(
            Incident.creation_date.between(interval.from_time, interval.to_time),
        )

        return query.all()

    @rollback_on_exc
    def get_incident_by_key_type_and_provider(
        self, key: str, incident_type: IncidentType, provider: IncidentProvider
    ) -> Incident:
        return (
            self._db.session.query(Incident)
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
            self._db.session.query(Incident)
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
