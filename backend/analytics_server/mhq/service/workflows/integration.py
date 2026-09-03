from typing import List

from mhq.store.models import Integration
from mhq.store.models.code import RepoWorkflowProviders
from mhq.store.repos.core import CoreRepoService

# CLUSTOX: Jenkins is a deployment-detection provider alongside GitHub Actions.
# It has to be in this bucket or the workflow sync never sees it: a Jenkins-only
# workspace gets "No workflow integrations found" and returns early, and a mixed
# workspace has its Jenkins rows filtered out of
# get_active_repo_workflows_by_repo_ids_and_providers.
WORKFLOW_INTEGRATION_BUCKET = [
    RepoWorkflowProviders.GITHUB_ACTIONS.value,
    RepoWorkflowProviders.JENKINS.value,
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
