from typing import List

from dora.service.settings import SettingsService, get_settings_service
from dora.service.settings.models import IncidentSourcesSetting
from dora.store.models import Integration, SettingType, EntityType
from dora.store.models.incidents import IncidentProvider, IncidentSource
from dora.store.repos.core import CoreRepoService

GIT_INCIDENT_INTEGRATION_BUCKET = [IncidentProvider.GITHUB.value]


class IncidentsIntegrationService:
    def __init__(
        self, core_repo_service: CoreRepoService, settings_service: SettingsService
    ):
        self.core_repo_service = core_repo_service
        self.settings_service = settings_service

    def get_org_providers(self, org_id: str) -> List[str]:
        integrations: List[
            Integration
        ] = self.core_repo_service.get_org_integrations_for_names(
            org_id, self._get_possible_incident_providers(org_id)
        )
        if not integrations:
            return []
        return [integration.name for integration in integrations]

    def _get_possible_incident_providers(self, org_id: str) -> List[str]:

        valid_integration_types = []

        incident_source_setting: IncidentSourcesSetting = (
            self._get_or_create_incident_source_setting(org_id)
        )

        if IncidentSource.GIT_REPO in incident_source_setting.incident_sources:
            valid_integration_types += GIT_INCIDENT_INTEGRATION_BUCKET

        return valid_integration_types

    def _get_or_create_incident_source_setting(
        self, org_id: str
    ) -> IncidentSourcesSetting:

        settings = self.settings_service.get_settings(
            setting_type=SettingType.INCIDENT_SOURCES_SETTING,
            entity_type=EntityType.ORG,
            entity_id=org_id,
        )

        if not settings:
            settings = self.settings_service.save_settings(
                setting_type=SettingType.INCIDENT_SOURCES_SETTING,
                entity_type=EntityType.ORG,
                entity_id=org_id,
            )
        return settings.specific_settings


def get_incidents_integration_service():
    return IncidentsIntegrationService(
        core_repo_service=CoreRepoService(),
        settings_service=get_settings_service(),
    )
