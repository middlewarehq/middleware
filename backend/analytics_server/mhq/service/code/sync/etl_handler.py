from os import getenv
from datetime import datetime, timedelta
from typing import List

import pytz

from mhq.service.settings.configuration_settings import (
    get_settings_service,
)
from mhq.store.models.settings.configuration_settings import (
    SettingType,
)
from mhq.store.models.settings.enums import EntityType
from mhq.service.code.integration import get_code_integration_service
from mhq.service.code.sync.etl_code_factory import (
    CodeProviderETLHandler,
    CodeETLFactory,
)
from mhq.service.merge_to_deploy_broker import (
    get_merge_to_deploy_broker_utils_service,
    MergeToDeployBrokerUtils,
)
from mhq.store.models.code import OrgRepo, BookmarkType, Bookmark, PullRequest
from mhq.store.repos.code import CodeRepoService
from mhq.utils.log import LOG
from mhq.utils.time import time_now


class CodeETLHandler:

    DEFAULT_SYNC_DAYS = (
        int(getenv("DEFAULT_SYNC_DAYS")) if getenv("DEFAULT_SYNC_DAYS") else 31
    )

    def __init__(
        self,
        code_repo_service: CodeRepoService,
        etl_service: CodeProviderETLHandler,
        mtd_broker: MergeToDeployBrokerUtils,
    ):
        self.code_repo_service = code_repo_service
        self.etl_service = etl_service
        self.mtd_broker = mtd_broker

    def sync_org_repos(self, org_id: str):
        if not self.etl_service.check_pat_validity():
            LOG.error("Invalid PAT for code provider")
            return
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
            org_repos = self.etl_service.get_org_repos(org_repos)
            self.code_repo_service.update_org_repos(org_repos)
            return org_repos
        except Exception as e:
            LOG.error(f"Error syncing org repos for org {org_id}: {str(e)}")
            raise e

    def _sync_repo_pull_requests_data(self, org_repo: OrgRepo) -> None:
        try:
            default_sync_days_setting = get_settings_service().get_settings(
                setting_type=SettingType.DEFAULT_SYNC_DAYS_SETTING,
                entity_type=EntityType.ORG,
                entity_id=str(org_repo.org_id),
            )
            default_sync_days = (
                default_sync_days_setting.specific_settings.default_sync_days
            )
            bookmark: Bookmark = self.__get_org_repo_bookmark(
                org_repo, default_sync_days
            )
            (
                pull_requests,
                pull_request_commits,
                pull_request_events,
            ) = self.etl_service.get_repo_pull_requests_data(org_repo, bookmark)
            self.code_repo_service.save_pull_requests_data(
                pull_requests, pull_request_commits, pull_request_events
            )
            if not pull_requests:
                self.code_repo_service.update_org_repo_bookmark(bookmark)
                return

            pull_requests.sort(key=lambda x: x.updated_at)
            bookmark.bookmark = (
                pull_requests[-1].updated_at.astimezone(tz=pytz.UTC).isoformat()
            )
            bookmark.updated_at = time_now()
            self.code_repo_service.update_org_repo_bookmark(bookmark)
            self.mtd_broker.pushback_merge_to_deploy_bookmark(
                str(org_repo.id), pull_requests
            )
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

    def __get_org_repo_bookmark(
        self, org_repo: OrgRepo, default_sync_days: int = DEFAULT_SYNC_DAYS
    ):

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
        return bookmark


def sync_code_repos(org_id: str):
    code_providers: List[str] = get_code_integration_service().get_org_providers(org_id)
    if not code_providers:
        LOG.info(f"No code integrations found for org {org_id}")
        return
    etl_factory = CodeETLFactory(org_id)

    for provider in code_providers:
        try:
            code_etl_handler = CodeETLHandler(
                CodeRepoService(),
                etl_factory(provider),
                get_merge_to_deploy_broker_utils_service(),
            )
            code_etl_handler.sync_org_repos(org_id)
            LOG.info(f"Synced org repos for provider {provider}")
        except Exception as e:
            LOG.error(f"Error syncing org repos for provider {provider}: {str(e)}")
            continue
    LOG.info(f"Synced all org repos for org {org_id}")
