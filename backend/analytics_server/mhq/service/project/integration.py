from typing import List

from mhq.store.models import Integration, UserIdentityProvider
from mhq.store.repos.core import CoreRepoService

# CLUSTOX: Jira integration, Phase 2 (issue sync). Mirrors
# mhq/service/code/integration.py's CODE_INTEGRATION_BUCKET -- one entry
# today, but kept as a bucket (not a single value) for the same reason
# that one is: room for another project-tracking tool later without
# reshaping this service.
PROJECT_INTEGRATION_BUCKET = [
    UserIdentityProvider.JIRA.value,
]


class ProjectIntegrationService:
    def __init__(self, core_repo_service: CoreRepoService):
        self.core_repo_service = core_repo_service

    def get_org_providers(self, org_id: str) -> List[str]:
        integrations: List[Integration] = (
            self.core_repo_service.get_org_integrations_for_names(
                org_id, PROJECT_INTEGRATION_BUCKET
            )
        )
        if not integrations:
            return []
        return [integration.name for integration in integrations]


def get_project_integration_service():
    return ProjectIntegrationService(core_repo_service=CoreRepoService())
