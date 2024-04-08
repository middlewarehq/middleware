from dora.service.code.sync.etl_github_handler import get_github_etl_handler
from dora.service.code.sync.etl_provider_handler import ProviderETLHandler
from dora.store.models import UserIdentity


class CodeETLFactory:
    def __init__(self, org_id: str):
        self.org_id = org_id

    def __call__(self, provider: str) -> ProviderETLHandler:
        if provider == UserIdentity.GITHUB.value:
            return get_github_etl_handler(self.org_id)
