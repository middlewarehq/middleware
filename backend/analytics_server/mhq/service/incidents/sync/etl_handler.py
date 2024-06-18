from os import getenv
from datetime import timedelta
from typing import List

from mhq.service.incidents.integration import get_incidents_integration_service
from mhq.service.incidents.sync.etl_incidents_factory import IncidentsETLFactory
from mhq.service.incidents.sync.etl_provider_handler import IncidentsProviderETLHandler
from mhq.store.models.incidents import (
    OrgIncidentService,
    IncidentBookmarkType,
    IncidentProvider,
    IncidentsBookmark,
)
from mhq.store.repos.incidents import IncidentsRepoService
from mhq.utils.log import LOG
from mhq.utils.string import uuid4_str
from mhq.utils.time import time_now


class IncidentsETLHandler:

    DEFAULT_SYNC_DAYS = (
        int(getenv("DEFAULT_SYNC_DAYS")) if getenv("DEFAULT_SYNC_DAYS") else 31
    )

    def __init__(
        self,
        provider: IncidentProvider,
        incident_repo_service: IncidentsRepoService,
        etl_service: IncidentsProviderETLHandler,
    ):
        self.provider = provider
        self.incident_repo_service = incident_repo_service
        self.etl_service = etl_service

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
            bookmark: IncidentsBookmark = self.__get_incidents_bookmark(service)
            (
                incidents,
                incident_org_incident_service_map,
                bookmark,
            ) = self.etl_service.process_service_incidents(service, bookmark)
            self.incident_repo_service.save_incidents_data(
                incidents, incident_org_incident_service_map
            )
            bookmark.updated_at = time_now()
            self.incident_repo_service.save_incidents_bookmark(bookmark)

        except Exception as e:
            LOG.error(f"Error syncing incidents for service {service.key}: {str(e)}")
            return

    def __get_incidents_bookmark(
        self, service: OrgIncidentService, default_sync_days: int = DEFAULT_SYNC_DAYS
    ) -> IncidentsBookmark:
        bookmark = self.incident_repo_service.get_incidents_bookmark(
            str(service.id), IncidentBookmarkType.SERVICE, self.provider
        )
        if not bookmark:
            default_pr_bookmark = time_now() - timedelta(days=default_sync_days)
            bookmark = IncidentsBookmark(
                id=uuid4_str(),
                entity_id=str(service.id),
                entity_type=IncidentBookmarkType.SERVICE,
                provider=self.provider.value,
                bookmark=default_pr_bookmark,
            )
        return bookmark


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
                incident_provider, IncidentsRepoService(), etl_factory(provider)
            )
            incidents_etl_handler.sync_org_incident_services(org_id)
        except Exception as e:
            LOG.error(
                f"Error syncing incidents for provider {provider}, org {org_id}: {str(e)}"
            )
            continue
    LOG.info(f"Synced incidents for org {org_id}")
