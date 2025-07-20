from typing import Dict, List, Optional
from github import GithubException
from github.Organization import Organization as GithubOrganization

from mhq.exapi.models.gitlab import GitlabRepo, GitlabUser
from mhq.exapi.models.bitbucket import BitbucketRepo
from mhq.exapi.gitlab import GitlabApiService
from mhq.exapi.bitbucket import BitbucketApiService
from mhq.utils.log import LOG
from mhq.exapi.github import GithubApiService
from mhq.store.models import UserIdentityProvider
from mhq.store.repos.core import CoreRepoService

PAGE_SIZE = 100


class ExternalIntegrationsService:
    def __init__(
        self,
        org_id: str,
        user_identity_provider: UserIdentityProvider,
        access_token: str,
        custom_domain: Optional[str] = None,
    ):
        self.org_id = org_id
        self.user_identity_provider = user_identity_provider
        self.access_token = access_token
        self.custom_domain = custom_domain

    def get_github_organizations(self):
        github_api_service = GithubApiService(self.access_token)
        try:
            orgs: [GithubOrganization] = github_api_service.get_org_list()
        except GithubException as e:
            raise e
        return orgs

    def get_github_org_repos(self, org_login: str, page_size: int, page: int):
        github_api_service = GithubApiService(self.access_token)
        try:
            return github_api_service.get_repos_raw(org_login, page_size, page)
        except GithubException as e:
            raise e

    def get_github_personal_repos(self, page_size: int, page: int):
        github_api_service = GithubApiService(self.access_token)
        try:
            return github_api_service.get_user_repos_raw(page_size, page)
        except GithubException as e:
            raise e

    def get_repo_workflows(self, gh_org_name: str, gh_org_repo_name: str):
        github_api_service = GithubApiService(self.access_token)
        try:
            workflows = github_api_service.get_repo_workflows(
                gh_org_name, gh_org_repo_name
            )
            workflows_list = []
            for page in range(0, workflows.totalCount // PAGE_SIZE + 1, 1):
                workflows = workflows.get_page(page)
                if not workflows:
                    break
                workflows_list += workflows
            return workflows_list
        except GithubException as e:
            raise e

    def get_gitlab_groups(self) -> List[Dict]:
        gitlab_api_service = GitlabApiService(self.access_token, self.custom_domain)
        try:
            groups: List[Dict] = gitlab_api_service.get_groups()
        except Exception as e:
            raise e

        return groups

    def get_gitlab_group_projects(
        self, group_id: str, page_size: int, page: int
    ) -> List[GitlabRepo]:
        gitlab_api_service = GitlabApiService(self.access_token, self.custom_domain)
        try:
            projects: List[Dict] = gitlab_api_service.get_group_projects(
                group_id, page_size, page
            )
        except Exception as e:
            raise e

        return projects

    def get_gitlab_user_projects(self, page_size: int, page: int) -> List[GitlabRepo]:
        gitlab_api_service = GitlabApiService(self.access_token, self.custom_domain)
        try:
            user: GitlabUser = gitlab_api_service.get_authenticated_user()
            user_id: str = user.meta.get("id")
            projects: List[GitlabRepo] = gitlab_api_service.get_user_projects(
                user_id, page, page_size
            )
        except Exception as e:
            raise e

        return projects

    def get_bitbucket_workspace_repo(
        self, workspace: str, repo_slug: str
    ) -> BitbucketRepo:
        bitbucket_api_service = BitbucketApiService(self.access_token)
        try:
            repo: BitbucketRepo = bitbucket_api_service.get_workspace_repos(
                workspace, repo_slug
            )
        except Exception as e:
            raise e
        return repo

    def get_bitbucket_workspaces(self) -> List[Dict]:
        bitbucket_api_service = BitbucketApiService(self.access_token)
        try:
            workspaces: List[Dict] = bitbucket_api_service.get_user_workspaces()
        except Exception as e:
            raise e
        return workspaces

    def get_bitbucket_workspace_repositories(
        self, workspace: str, page_size: int = 50
    ) -> List[BitbucketRepo]:
        bitbucket_api_service = BitbucketApiService(self.access_token)
        try:
            repositories: List[BitbucketRepo] = bitbucket_api_service.get_workspace_repositories(
                workspace, page_size
            )
        except Exception as e:
            raise e
        return repositories


def get_external_integrations_service(
    org_id: str, user_identity_provider: UserIdentityProvider
):
    def _get_custom_gitlab_domain() -> Optional[str]:
        DEFAULT_DOMAIN = "https://gitlab.com"

        core_repo_service = CoreRepoService()
        integrations = core_repo_service.get_org_integrations_for_names(
            org_id, [UserIdentityProvider.GITLAB.value]
        )

        gitlab_domain = (
            integrations[0].provider_meta.get("custom_domain")
            if integrations[0].provider_meta
            else None
        )

        if not gitlab_domain:
            LOG.warn(
                f"Custom domain not found for intergration for org {org_id} and provider {UserIdentityProvider.GITLAB.value}"
            )
            return DEFAULT_DOMAIN

        return gitlab_domain

    def _get_access_token() -> str:
        access_token = CoreRepoService().get_access_token(
            org_id, user_identity_provider
        )
        if not access_token:
            raise Exception(
                f"Access token not found for org {org_id} and provider {user_identity_provider.value}"
            )
        return access_token

    custom_domain_name = None
    if user_identity_provider == UserIdentityProvider.GITLAB:
        custom_domain_name = _get_custom_gitlab_domain()

    return ExternalIntegrationsService(
        org_id,
        user_identity_provider,
        _get_access_token(),
        custom_domain_name,
    )
