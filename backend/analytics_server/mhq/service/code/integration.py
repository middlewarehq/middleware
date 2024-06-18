from typing import List

from mhq.store.models import UserIdentityProvider, Integration
from mhq.store.repos.core import CoreRepoService

CODE_INTEGRATION_BUCKET = [
    UserIdentityProvider.GITHUB.value,
]


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


def get_code_integration_service():
    return CodeIntegrationService(core_repo_service=CoreRepoService())
