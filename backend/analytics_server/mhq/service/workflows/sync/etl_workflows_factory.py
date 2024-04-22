from mhq.service.workflows.sync.etl_github_actions_handler import (
    get_github_actions_etl_handler,
)
from mhq.service.workflows.sync.etl_provider_handler import WorkflowProviderETLHandler
from mhq.store.models.code import RepoWorkflowProviders


class WorkflowETLFactory:
    def __init__(self, org_id: str):
        self.org_id = org_id

    def __call__(self, provider: str) -> WorkflowProviderETLHandler:
        if provider == RepoWorkflowProviders.GITHUB_ACTIONS.name:
            return get_github_actions_etl_handler(self.org_id)
        raise NotImplementedError(f"Unknown provider - {provider}")
