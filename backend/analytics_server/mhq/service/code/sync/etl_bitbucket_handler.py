import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Set

import pytz

from mhq.exapi.models.bitbucket import BitbucketRepo
from mhq.exapi.bitbucket import BitbucketApiService
from mhq.exapi.github import GithubApiService
from mhq.service.code.sync.etl_code_analytics import CodeETLAnalyticsService
from mhq.service.code.sync.etl_provider_handler import CodeProviderETLHandler
from mhq.store.models import UserIdentityProvider
from mhq.store.models.code import (
    OrgRepo,
    PullRequestState,
    PullRequest,
    PullRequestCommit,
    PullRequestEvent,
    PullRequestEventType,
    PullRequestRevertPRMapping,
    CodeProvider,
)
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.core import CoreRepoService
from mhq.utils.log import LOG
from mhq.utils.time import time_now, ISO_8601_DATE_FORMAT

PR_PROCESSING_CHUNK_SIZE = 100


class BitbucketETLHandler(CodeProviderETLHandler):
    """Handler for Bitbucket ETL operations."""
    
    def __init__(
        self,
        org_id: str,
        bitbucket_api_service: BitbucketApiService,
        code_repo_service: CodeRepoService,
        code_etl_analytics_service: CodeETLAnalyticsService,
        # bitbucket_revert_pr_sync_handler: RevertPRsGitHubSyncHandler,
    ):
        self.org_id = org_id
        self._api = bitbucket_api_service
        self.code_repo_service = code_repo_service
        self.code_etl_analytics_service : CodeETLAnalyticsService = (
            code_etl_analytics_service
        )
        self.provider = CodeProvider.BITBUCKET.value
        # self.bitbucket_revert_pr_sync_handler: RevertPRsGitHubSyncHandler = (
        #     github_revert_pr_sync_handler
        # )

    def check_pat_validity(self) -> bool:
        """Check if the Bitbucket Personal Access Token is valid.
        
        Returns:
            bool: True if the PAT is valid.
            
        Raises:
            Exception: If the Bitbucket credentials are invalid.
        """
        is_valid = self._api.check_pat()
        if not is_valid:
            raise Exception("Bitbucket credentials are invalid. Please check username or password.")
        return is_valid
    
    def get_org_repos(self, org_repos: List[OrgRepo]) -> List[OrgRepo]:
        """Get organization repositories from Bitbucket API.
        
        Args:
            org_repos: List of organization repositories to fetch.
            
        Returns:
            List of processed OrgRepo objects.
        """
        bitbucket_repos: List[BitbucketRepo] = []
        for org_repo in org_repos:
            workspace = org_repo.org_name
            repo_slug = org_repo.name
            try:
                bitbucket_repo = self._api.get_workspace_repos(workspace, repo_slug)
                bitbucket_repos.append(bitbucket_repo)
            except Exception as e:
                LOG.error(f"Error getting Bitbucket repository {workspace}/{repo_slug}: {e}")
                continue
        repo_idempotency_key_org_repo_map = {
            org_repo.idempotency_key: org_repo for org_repo in org_repos
        }
        
        return [
            self._process_bitbucket_repo(
                repo_idempotency_key_org_repo_map.get(str(bitbucket_repo.idempotency_key)),
                bitbucket_repo
            )
            for bitbucket_repo in bitbucket_repos
            if repo_idempotency_key_org_repo_map.get(str(bitbucket_repo.idempotency_key))
        ]

    def _process_bitbucket_repo(
        self, org_repo: OrgRepo, bitbucket_repo: BitbucketRepo
    ) -> OrgRepo:
        """Process a Bitbucket repository into an OrgRepo object.
        
        Args:
            org_repo: Original organization repository.
            bitbucket_repo: Bitbucket repository data.
            
        Returns:
            Processed OrgRepo object.
        """
        return OrgRepo(
            id=org_repo.id,
            org_id=self.org_id,
            name=bitbucket_repo.name,
            provider=self.provider,
            org_name=bitbucket_repo.org_name,
            default_branch=bitbucket_repo.default_branch,
            language=bitbucket_repo.languages,
            contributors=self._api.get_repo_contributors(
                bitbucket_repo.org_name, bitbucket_repo.name
            ),
            idempotency_key=str(bitbucket_repo.idempotency_key),
            slug=bitbucket_repo.name,
            updated_at=time_now(),
        )



def _get_access_token(org_id: str) -> Optional[str]:
    """Retrieve access token for the given organization."""
    core_repo_service = CoreRepoService()
    access_token = core_repo_service.get_access_token(
        org_id, UserIdentityProvider.BITBUCKET
    )
    
    if not access_token:
        LOG.error(
            f"Access token not found for org {org_id} and provider "
            f"{UserIdentityProvider.BITBUCKET.value}"
        )
    
    return access_token


def get_bitbucket_etl_handler(org_id: str) -> BitbucketETLHandler:
    """Factory function to create a BitbucketETLHandler instance."""
    access_token = _get_access_token(org_id)
    
    return BitbucketETLHandler(
        org_id=org_id,
        bitbucket_api_service=BitbucketApiService(access_token),
        code_repo_service=CodeRepoService(),
        code_etl_analytics_service=CodeETLAnalyticsService(),
    )