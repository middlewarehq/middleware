from mhq.service.project.sync.etl_jira_handler import get_jira_etl_handler
from mhq.service.project.sync.etl_provider_handler import ProjectProviderETLHandler
from mhq.store.models import UserIdentityProvider


class ProjectETLFactory:
    def __init__(self, org_id: str):
        self.org_id = org_id

    def __call__(self, provider: str) -> ProjectProviderETLHandler:
        if provider == UserIdentityProvider.JIRA.value:
            return get_jira_etl_handler(self.org_id)

        raise NotImplementedError(f"Unknown provider - {provider}")
