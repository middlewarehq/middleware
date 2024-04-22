from github.Organization import Organization as GithubOrganization

from mhq.exapi.github import GithubApiService, GithubRateLimitExceeded
from mhq.store.models import UserIdentityProvider
from mhq.store.repos.core import CoreRepoService

PAGE_SIZE = 100


class ExternalIntegrationsService:
    def __init__(
        self,
        org_id: str,
        user_identity_provider: UserIdentityProvider,
        access_token: str,
    ):
        self.org_id = org_id
        self.user_identity_provider = user_identity_provider
        self.access_token = access_token

    def get_github_organizations(self):
        github_api_service = GithubApiService(self.access_token)
        try:
            orgs: [GithubOrganization] = github_api_service.get_org_list()
        except GithubRateLimitExceeded as e:
            raise Exception(e)
        return orgs

    def get_github_org_repos(self, org_login: str, page_size: int, page: int):
        github_api_service = GithubApiService(self.access_token)
        try:
            return github_api_service.get_repos_raw(org_login, page_size, page)
        except Exception as e:
            raise Exception(e)

    def get_repo_workflows(self, gh_org_name: str, gh_org_repo_name: str):
        github_api_service = GithubApiService(self.access_token)
        workflows = github_api_service.get_repo_workflows(gh_org_name, gh_org_repo_name)
        workflows_list = []
        for page in range(0, workflows.totalCount // PAGE_SIZE + 1, 1):
            workflows = workflows.get_page(page)
            if not workflows:
                break
            workflows_list += workflows
        return workflows_list


def get_external_integrations_service(
    org_id: str, user_identity_provider: UserIdentityProvider
):
    def _get_access_token() -> str:
        access_token = CoreRepoService().get_access_token(
            org_id, user_identity_provider
        )
        if not access_token:
            raise Exception(
                f"Access token not found for org {org_id} and provider {user_identity_provider.value}"
            )
        return access_token

    return ExternalIntegrationsService(
        org_id, user_identity_provider, _get_access_token()
    )
