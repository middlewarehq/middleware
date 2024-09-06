from datetime import datetime
from typing import List

import pytz

from mhq.store.models.code.enums import CodeProvider
from mhq.service.settings.configuration_settings import (
    get_settings_service,
    SettingsService,
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
from mhq.store.models.code import OrgRepo, PullRequest
from mhq.store.repos.code import CodeRepoService
from mhq.utils.log import LOG
from mhq.service.settings.models import DefaultSyncDaysSetting
from mhq.service.bookmark import BookmarkService, BookmarkType, get_bookmark_service


class CodeETLHandler:
    def __init__(
        self,
        code_repo_service: CodeRepoService,
        etl_service: CodeProviderETLHandler,
        mtd_broker: MergeToDeployBrokerUtils,
        bookmark_service: BookmarkService,
        settings_service: SettingsService,
    ):
        self.code_repo_service = code_repo_service
        self.etl_service = etl_service
        self.mtd_broker = mtd_broker
        self.bookmark_service = bookmark_service
        self.settings_service = settings_service

    def sync_org_repos(self, org_id: str, provider: CodeProvider):
        if not self.etl_service.check_pat_validity():
            LOG.error("Invalid PAT for code provider")
            return
        org_repos: List[OrgRepo] = self._sync_org_repos(org_id, provider)
        for org_repo in org_repos:
            try:
                self._sync_repo_pull_requests_data(org_repo)
            except Exception as e:
                LOG.error(
                    f"Error syncing pull requests for repo {org_repo.name}: {str(e)}"
                )
                continue

    def _sync_org_repos(self, org_id: str, provider: CodeProvider) -> List[OrgRepo]:
        try:
            org_repos = self.code_repo_service.get_active_org_repos_for_provider(
                org_id, provider
            )
            org_repos = self.etl_service.get_org_repos(org_repos)
            self.code_repo_service.update_org_repos(org_repos)
            return org_repos
        except Exception as e:
            LOG.error(f"Error syncing org repos for org {org_id}: {str(e)}")
            raise e

    def _sync_repo_pull_requests_data(self, org_repo: OrgRepo) -> None:
        try:
            default_sync_days_setting: DefaultSyncDaysSetting = (
                self.settings_service.get_or_set_default_settings(
                    setting_type=SettingType.DEFAULT_SYNC_DAYS_SETTING,
                    entity_type=EntityType.ORG,
                    entity_id=str(org_repo.org_id),
                ).specific_settings
            )

            default_sync_days = default_sync_days_setting.default_sync_days
            bookmark: datetime = self.bookmark_service.get_bookmark(
                str(org_repo.id),
                BookmarkType.ORG_REPO_BOOKMARK,
                org_repo.provider,
                default_sync_days,
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
                self.bookmark_service.update_bookmark(
                    str(org_repo.id),
                    BookmarkType.ORG_REPO_BOOKMARK,
                    org_repo.provider,
                    bookmark,
                )
                return

            pull_requests.sort(key=lambda x: x.updated_at)
            bookmark = pull_requests[-1].updated_at.astimezone(tz=pytz.UTC)
            self.bookmark_service.update_bookmark(
                str(org_repo.id),
                BookmarkType.ORG_REPO_BOOKMARK,
                org_repo.provider,
                bookmark,
            )
            self.mtd_broker.pushback_merge_to_deploy_bookmark(org_repo, pull_requests)
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
                get_bookmark_service(),
                get_settings_service(),
            )
            code_etl_handler.sync_org_repos(org_id, CodeProvider(provider))
            LOG.info(f"Synced org repos for provider {provider}")
        except Exception as e:
            LOG.error(f"Error syncing org repos for provider {provider}: {str(e)}")
            continue
    LOG.info(f"Synced all org repos for org {org_id}")
