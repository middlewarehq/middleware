from datetime import datetime
from typing import List

from mhq.store.models.settings.configuration_settings import (
    SettingType,
)
from mhq.store.models.settings.enums import EntityType
from mhq.service.settings.configuration_settings import (
    SettingsService,
    get_settings_service,
)
from mhq.service.incidents.integration import get_incidents_integration_service
from mhq.service.incidents.sync.etl_incidents_factory import IncidentsETLFactory
from mhq.service.incidents.sync.etl_provider_handler import IncidentsProviderETLHandler
from mhq.store.models.incidents import (
    OrgIncidentService,
    IncidentProvider,
)
from mhq.store.repos.incidents import IncidentsRepoService
from mhq.utils.log import LOG
from mhq.service.settings.models import DefaultSyncDaysSetting
from mhq.service.bookmark import BookmarkService, BookmarkType, get_bookmark_service


class IncidentsETLHandler:
    def __init__(
        self,
        provider: IncidentProvider,
        incident_repo_service: IncidentsRepoService,
        etl_service: IncidentsProviderETLHandler,
        settings_service: SettingsService,
        bookmark_service: BookmarkService,
    ):
        self.provider = provider
        self.incident_repo_service = incident_repo_service
        self.etl_service = etl_service
        self.settings_service = settings_service
        self.bookmark_service = bookmark_service

    def sync_org_incident_services(self, org_id: str):
        try:
            incident_services = self.incident_repo_service.get_org_incident_services(
                org_id
            )
            updated_services = self.etl_service.get_updated_incident_services(
                incident_services
            )
            self.incident_repo_service.update_org_incident_services(updated_services)
            for service in updated_services:
                try:
                    self._sync_service_incidents(service)
                except Exception as e:
                    LOG.error(
                        f"Error syncing incidents for service {service.key}: {str(e)}"
                    )
                    continue
        except Exception as e:
            LOG.error(f"Error syncing incident services for org {org_id}: {str(e)}")
            return

    def _sync_service_incidents(self, service: OrgIncidentService):
        try:
            default_sync_days_setting: DefaultSyncDaysSetting = (
                self.settings_service.get_or_set_default_settings(
                    setting_type=SettingType.DEFAULT_SYNC_DAYS_SETTING,
                    entity_type=EntityType.ORG,
                    entity_id=str(service.org_id),
                ).specific_settings
            )
            default_sync_days = default_sync_days_setting.default_sync_days
            bookmark: datetime = self.bookmark_service.get_bookmark(
                str(service.id),
                BookmarkType.INCIDENT_SERVICE_BOOKMARK,
                service.provider,
                default_sync_days,
            )
            (
                incidents,
                incident_org_incident_service_map,
                bookmark,
            ) = self.etl_service.process_service_incidents(service, bookmark)
            self.incident_repo_service.save_incidents_data(
                incidents, incident_org_incident_service_map
            )
            self.bookmark_service.update_bookmark(
                str(service.id),
                BookmarkType.INCIDENT_SERVICE_BOOKMARK,
                service.provider,
                bookmark,
            )

        except Exception as e:
            LOG.error(f"Error syncing incidents for service {service.key}: {str(e)}")
            return


def sync_org_incidents(org_id: str):
    incident_providers: List[str] = (
        get_incidents_integration_service().get_org_providers(org_id)
    )
    if not incident_providers:
        LOG.info(f"No incident providers found for org {org_id}")
        return
    etl_factory = IncidentsETLFactory(org_id)

    for provider in incident_providers:
        try:
            incident_provider = IncidentProvider(provider)
            incidents_etl_handler = IncidentsETLHandler(
                incident_provider,
                IncidentsRepoService(),
                etl_factory(provider),
                get_settings_service(),
                get_bookmark_service(),
            )
            incidents_etl_handler.sync_org_incident_services(org_id)
        except Exception as e:
            LOG.error(
                f"Error syncing incidents for provider {provider}, org {org_id}: {str(e)}"
            )
            continue
    LOG.info(f"Synced incidents for org {org_id}")
