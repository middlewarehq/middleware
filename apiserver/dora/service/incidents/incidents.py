from typing import List
from dora.service.incidents.incident_filter import apply_incident_filter
from dora.store.models.incidents.filter import IncidentFilter
from dora.store.models.settings import EntityType, SettingType
from dora.utils.time import Interval

from dora.store.models.incidents import Incident
from dora.service.settings.configuration_settings import (
    SettingsService,
    get_settings_service,
)
from dora.store.repos.incidents import IncidentsRepoService


class IncidentService:
    def __init__(
        self,
        incidents_repo_service: IncidentsRepoService,
        settings_service: SettingsService,
    ):
        self._incidents_repo_service = incidents_repo_service
        self._settings_service = settings_service

    def get_resolved_team_incidents(
        self, team_id: str, interval: Interval
    ) -> List[Incident]:
        incident_filter: IncidentFilter = apply_incident_filter(
            entity_type=EntityType.TEAM,
            entity_id=team_id,
            setting_types=[
                SettingType.INCIDENT_SETTING,
                SettingType.INCIDENT_TYPES_SETTING,
            ],
        )
        return self._incidents_repo_service.get_resolved_team_incidents(
            team_id, interval, incident_filter
        )


def get_incident_service():
    return IncidentService(IncidentsRepoService(), get_settings_service())
