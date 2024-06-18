from typing import List

from mhq.store.models import Integration
from mhq.store.models.code import RepoWorkflowProviders
from mhq.store.repos.core import CoreRepoService

WORKFLOW_INTEGRATION_BUCKET = [
    RepoWorkflowProviders.GITHUB_ACTIONS.value,
]


class WorkflowsIntegrationsService:
    def __init__(self, core_repo_service: CoreRepoService):
        self.core_repo_service = core_repo_service

    def get_org_providers(self, org_id: str) -> List[str]:
        integrations: List[Integration] = (
            self.core_repo_service.get_org_integrations_for_names(
                org_id, WORKFLOW_INTEGRATION_BUCKET
            )
        )
        if not integrations:
            return []
        return [integration.name for integration in integrations]


def get_workflows_integrations_service() -> WorkflowsIntegrationsService:
    return WorkflowsIntegrationsService(CoreRepoService())
