from typing import Dict, List

from mhq.store.models import UserIdentityProvider, Integration
from mhq.store.repos.core import CoreRepoService

CODE_INTEGRATION_BUCKET = [
    UserIdentityProvider.GITHUB.value,
    UserIdentityProvider.GITLAB.value,
]

PROVIDER_TO_DEFAULT_DOMAIN_URL_MAP: Dict[str, str] = {
    UserIdentityProvider.GITHUB.value: "https://github.com",
    UserIdentityProvider.GITLAB.value: "https://gitlab.com",
}


class CodeIntegrationService:
    def __init__(self, core_repo_service: CoreRepoService):
        self.core_repo_service = core_repo_service

    def get_org_providers(self, org_id: str) -> List[str]:
        integrations: List[Integration] = (
            self.core_repo_service.get_org_integrations_for_names(
                org_id, CODE_INTEGRATION_BUCKET
            )
        )
        if not integrations:
            return []
        return [integration.name for integration in integrations]

    def get_domain_url_to_provider_map(self, org_id: str) -> Dict[str, str]:
        domain_url_to_provider_map: Dict[str, str] = {}
        integrations: List[Integration] = (
            self.core_repo_service.get_org_integrations_for_names(
                org_id, CODE_INTEGRATION_BUCKET
            )
        )

        for integration in integrations:
            web_url = (
                integration.provider_meta.get("custom_domain")
                if integration.provider_meta
                else None
            )
            if not web_url:
                web_url = PROVIDER_TO_DEFAULT_DOMAIN_URL_MAP.get(integration.name)
            domain_url_to_provider_map[web_url] = integration.name

        return domain_url_to_provider_map


def get_code_integration_service():
    return CodeIntegrationService(core_repo_service=CoreRepoService())
