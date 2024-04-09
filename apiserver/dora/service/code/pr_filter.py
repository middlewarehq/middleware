from dataclasses import dataclass
from typing import List, Dict, Any

from sqlalchemy import and_, or_
from sqlalchemy.dialects.postgresql import Any
from dora.service.settings.configuration_settings import get_settings_service
from dora.service.settings.models import ExcludedPRsSetting

from dora.store.models.code import PRFilter
from dora.store.models.settings.configuration_settings import SettingType
from dora.store.models.settings.enums import EntityType
from dora.utils.regex import regex_list


def apply_pr_filter(
    pr_filter: Dict = None,
    entity_type: EntityType = None,
    entity_id: str = None,
    setting_types: List[SettingType] = None,
) -> PRFilter:
    processed_pr_filter: PRFilter = ParsePRFilterProcessor(pr_filter).apply()
    setting_service = get_settings_service()
    setting_type_to_settings_map: Dict[SettingType, Any] = {}

    if entity_type and entity_id and setting_types:
        setting_type_to_settings_map = setting_service.get_settings_map(
            entity_id, setting_types, entity_type
        )

    if entity_type and entity_id and setting_types:
        processed_pr_filter = ConfigurationsPRFilterProcessor(
            entity_type,
            entity_id,
            processed_pr_filter,
            setting_types,
            setting_type_to_settings_map,
        ).apply()
    return processed_pr_filter


class ParsePRFilterProcessor:
    def __init__(self, pr_filter: Dict = None):
        self.pr_filter = pr_filter or {}

    def apply(self) -> PRFilter:
        authors: List[str] = self.__parse_pr_authors()
        base_branches: List[str] = self.__parse_pr_base_branches()
        repo_filters: Dict[str, Dict] = self.__parse_repo_filters()

        return PRFilter(
            authors=authors,
            base_branches=base_branches,
            repo_filters=repo_filters,
        )

    def __parse_pr_authors(self) -> List[str]:
        return self.pr_filter.get("authors")

    def __parse_pr_base_branches(self) -> List[str]:
        base_branches: List[str] = self.pr_filter.get("base_branches")
        if base_branches:
            base_branches: List[str] = regex_list(base_branches)
        return base_branches

    def __parse_repo_filters(self) -> Dict[str, Dict]:
        repo_filters: Dict[str, Dict] = self.pr_filter.get("repo_filters")
        if repo_filters:
            for repo_id, repo_filter in repo_filters.items():
                repo_base_branches: List[str] = self.__parse_repo_base_branches(
                    repo_filter
                )
                repo_filters[repo_id]["base_branches"] = repo_base_branches
        return repo_filters

    def __parse_repo_base_branches(self, repo_filter: Dict[str, any]) -> List[str]:
        repo_base_branches: List[str] = repo_filter.get("base_branches")
        if not repo_base_branches:
            return []
        repo_base_branches: List[str] = regex_list(repo_base_branches)
        return repo_base_branches


class ConfigurationsPRFilterProcessor:
    def __init__(
        self,
        entity_type: EntityType,
        entity_id: str,
        pr_filter: PRFilter,
        setting_types: List[SettingType],
        setting_type_to_settings_map: Dict[SettingType, Any] = None,
        team_member_usernames: List[str] = None,
    ):
        self.pr_filter = pr_filter or PRFilter()
        self.entity_type: EntityType = entity_type
        self.entity_id = entity_id
        self.setting_types: List[SettingType] = setting_types or []
        self.setting_type_to_settings_map: Dict[SettingType, Any] = (
            setting_type_to_settings_map or {}
        )
        self._setting_service = get_settings_service()
        self.team_member_usernames = team_member_usernames or []

    def apply(self) -> PRFilter:
        for setting_type in self.setting_types:
            setting = self.setting_type_to_settings_map.get(
                setting_type, self._setting_service.get_default_setting(setting_type)
            )
            if setting_type == SettingType.EXCLUDED_PRS_SETTING:
                self._apply_excluded_pr_ids_setting(setting=setting)

        return self.pr_filter

    def _apply_excluded_pr_ids_setting(self, setting: ExcludedPRsSetting):

        self.pr_filter.excluded_pr_ids = (
            self.pr_filter.excluded_pr_ids or []
        ) + setting.excluded_pr_ids
