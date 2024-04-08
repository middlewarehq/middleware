from datetime import datetime, timedelta
from typing import List

import pytz

from dora.service.code.integration import get_code_integration_service
from dora.service.code.sync.etl_code_factory import ProviderETLHandler, CodeETLFactory
from dora.store.models.code import OrgRepo, BookmarkType, Bookmark, PullRequest
from dora.store.repos.code import CodeRepoService
from dora.utils.log import LOG


class CodeETLHandler:
    def __init__(
        self,
        code_repo_service: CodeRepoService,
        etl_service: ProviderETLHandler,
    ):
        self.code_repo_service = code_repo_service
        self.etl_service = etl_service

    def sync_org_repos(self, org_id: str):
        org_repos: List[OrgRepo] = self._sync_org_repos(org_id)
        for org_repo in org_repos:
            try:
                self._sync_repo_pull_requests_data(org_repo)
            except Exception as e:
                LOG.error(
                    f"Error syncing pull requests for repo {org_repo.name}: {str(e)}"
                )
                continue

    def _sync_org_repos(self, org_id: str) -> List[OrgRepo]:
        try:
            org_repos = self.code_repo_service.get_active_org_repos(org_id)
            self.etl_service.get_org_repos(org_repos)
            self.code_repo_service.update_org_repos(org_repos)
            return org_repos
        except Exception as e:
            LOG.error(f"Error syncing org repos for org {org_id}: {str(e)}")
            raise e

    def _sync_repo_pull_requests_data(self, org_repo: OrgRepo) -> None:
        try:
            bookmark: Bookmark = self.__get_org_repo_bookmark(org_repo)
            (
                pull_requests,
                pull_request_commits,
                pull_request_events,
            ) = self.etl_service.get_repo_pull_requests_data(org_repo, bookmark)
            self.code_repo_service.save_pull_requests_data(
                pull_requests, pull_request_commits, pull_request_events
            )
            bookmark.bookmark = (
                pull_requests[-1].state_changed_at.astimezone(tz=pytz.UTC).isoformat()
            )
            self.code_repo_service.update_org_repo_bookmark(bookmark)
            self.__sync_revert_prs_mapping(org_repo, pull_requests)
        except Exception as e:
            LOG.error(f"Error syncing pull requests for repo {org_repo.name}: {str(e)}")
            raise e

    def __sync_revert_prs_mapping(
        self, org_repo: OrgRepo, prs: List[PullRequest]
    ) -> None:
        try:
            revert_prs_mapping = self.etl_service.get_revert_prs_mapping(prs)
            self.code_repo_service.save_revert_pr_mappings(revert_prs_mapping)
        except Exception as e:
            LOG.error(f"Error syncing revert PRs for repo {org_repo.name}: {str(e)}")
            raise e

    def __get_org_repo_bookmark(self, org_repo: OrgRepo, default_sync_days: int = 31):
        bookmark = self.code_repo_service.get_org_repo_bookmark(
            org_repo, BookmarkType.PR
        )
        if not bookmark:
            default_pr_bookmark = datetime.now().astimezone(tz=pytz.UTC) - timedelta(
                days=default_sync_days
            )
            bookmark = Bookmark(
                repo_id=org_repo.id,
                type=BookmarkType.PR.value,
                bookmark=default_pr_bookmark.isoformat(),
            )
            self.code_repo_service.update_org_repo_bookmark(bookmark)
        return bookmark


def sync_code_repos(org_id: str):
    code_integration_service = get_code_integration_service()
    code_repo_service = CodeRepoService()
    etl_factory = CodeETLFactory(org_id)
    for provider in code_integration_service.get_org_providers(org_id):
        try:
            etl_handler = etl_factory(provider)
            code_etl_handler = CodeETLHandler(code_repo_service, etl_handler)
            code_etl_handler.sync_org_repos(org_id)
            LOG.info(f"Synced org repos for provider {provider}")
        except Exception as e:
            LOG.error(f"Error syncing org repos for provider {provider}: {str(e)}")
            continue
    LOG.info(f"Synced all org repos for org {org_id}")
