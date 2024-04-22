from mhq.service.incidents.sync.etl_git_incidents_handler import (
    get_incidents_sync_etl_handler,
)
from mhq.service.incidents.sync.etl_provider_handler import IncidentsProviderETLHandler
from mhq.store.models.incidents import IncidentProvider


class IncidentsETLFactory:
    def __init__(self, org_id: str):
        self.org_id = org_id

    def __call__(self, provider: str) -> IncidentsProviderETLHandler:
        if provider == IncidentProvider.GITHUB.value:
            return get_incidents_sync_etl_handler(self.org_id)
        raise NotImplementedError(f"Unknown provider - {provider}")
