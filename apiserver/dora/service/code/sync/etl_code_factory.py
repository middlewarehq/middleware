from abc import ABC, abstractmethod
from typing import List, Tuple

from dora.service.code.sync.etl_github_handler import get_github_etl_handler
from dora.store.models import UserIdentity
from dora.store.models.code import (
    OrgRepo,
    PullRequest,
    PullRequestCommit,
    PullRequestEvent,
    PullRequestRevertPRMapping,
    Bookmark,
)


class ProviderETLHandler(ABC):
    @abstractmethod
    def check_pat_validity(self) -> bool:
        """
        This method checks if the PAT is valid.
        :return: PAT details
        :raises: Exception if PAT is invalid
        """
        pass

    @abstractmethod
    def get_org_repos(self, org_repos: List[OrgRepo]) -> List[OrgRepo]:
        """
        This method returns all repos from provider that are in sync and available for the provider in given access token.
        :return: List of repos as OrgRepo objects
        """
        pass

    @abstractmethod
    def get_repo_pull_requests_data(
        self, org_repo: OrgRepo, bookmark: Bookmark
    ) -> Tuple[List[PullRequest], List[PullRequestCommit], List[PullRequestEvent]]:
        """
        This method returns all pull requests, their Commits and Events of a repo. After the bookmark date.
        :param org_repo: OrgRepo object to get pull requests for
        :param bookmark: Bookmark object to get all pull requests after this date
        :return: Pull requests sorted by state_changed_at date, their commits and events
        """
        pass

    @abstractmethod
    def get_revert_prs_mapping(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        """
        This method processes all PRs and returns the mapping of revert PRs with source PRs.
        :param prs: List of PRs to process
        :return: List of PullRequestRevertPRMapping objects
        """
        pass


class CodeETLFactory:
    def __init__(self, org_id: str):
        self.org_id = org_id

    def __call__(self, provider: str) -> ProviderETLHandler:
        if provider == UserIdentity.GITHUB.value:
            return get_github_etl_handler(self.org_id)
