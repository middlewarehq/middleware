from datetime import datetime
from typing import List

from mhq.exapi.models.git_incidents import RevertPRMap
from mhq.service.settings import SettingsService, get_settings_service
from mhq.store.models import SettingType, EntityType
from mhq.store.models.code import PullRequest, PullRequestRevertPRMapping
from mhq.store.models.incidents import IncidentSource
from mhq.store.repos.code import CodeRepoService


class GitIncidentsAPIService:
    def __init__(
        self, code_repo_service: CodeRepoService, settings_service: SettingsService
    ):
        self.code_repo_service = code_repo_service
        self.settings_service = settings_service

    def is_sync_enabled(self, org_id: str):
        setting = self.settings_service.get_settings(
            setting_type=SettingType.INCIDENT_SOURCES_SETTING,
            entity_type=EntityType.ORG,
            entity_id=org_id,
        )
        if setting:
            incident_sources_setting = setting.specific_settings
        else:
            incident_sources_setting = self.settings_service.get_default_setting(
                SettingType.INCIDENT_SOURCES_SETTING
            )
        incident_sources = incident_sources_setting.incident_sources
        return IncidentSource.GIT_REPO in incident_sources

    def get_org_repos(self, org_id: str):
        return self.code_repo_service.get_active_org_repos(org_id)

    def get_org_repo(self, repo_id: str):
        return self.code_repo_service.get_repo_by_id(repo_id)

    def get_repo_revert_prs_in_interval(
        self, repo_id: str, from_time: datetime, to_time: datetime
    ) -> List[RevertPRMap]:
        revert_pr_mappings: List[PullRequestRevertPRMapping] = (
            self.code_repo_service.get_repo_revert_prs_mappings_updated_in_interval(
                repo_id, from_time, to_time
            )
        )

        revert_pr_ids = [str(pr.pr_id) for pr in revert_pr_mappings]
        original_pr_ids = [str(pr.reverted_pr) for pr in revert_pr_mappings]
        prs: List[PullRequest] = self.code_repo_service.get_prs_by_ids(
            revert_pr_ids + original_pr_ids
        )
        id_to_pr_map = {str(pr.id): pr for pr in prs}

        revert_prs: List[RevertPRMap] = []
        for mapping in revert_pr_mappings:
            revert_pr = id_to_pr_map.get(str(mapping.pr_id))
            original_pr = id_to_pr_map.get(str(mapping.reverted_pr))
            if revert_pr and original_pr:
                revert_prs.append(
                    RevertPRMap(
                        revert_pr=revert_pr,
                        original_pr=original_pr,
                        created_at=mapping.created_at,
                        updated_at=mapping.updated_at,
                    )
                )

        return revert_prs


def get_git_incidents_api_service():
    return GitIncidentsAPIService(CodeRepoService(), get_settings_service())
