from datetime import timedelta
from typing import Any, Dict, Optional, List

from mhq.service.settings.default_settings_data import get_default_setting_data
from mhq.service.settings.models import (
    ConfigurationSettings,
    ExcludedPRsSetting,
    IncidentSettings,
    IncidentSourcesSetting,
    IncidentTypesSetting,
    DefaultSyncDaysSetting,
    IncidentPrsSetting,
)
from mhq.store.models.core.users import Users
from mhq.store.models.incidents import IncidentSource, IncidentType
from mhq.store.models.settings import SettingType, Settings, EntityType
from mhq.store.repos.settings import SettingsRepoService
from mhq.utils.time import time_now
from mhq.service.bookmark.bookmark import get_bookmark_service


class SettingsService:
    def __init__(self, _settings_repo):
        self._settings_repo: SettingsRepoService = _settings_repo

    def _adapt_specific_incident_setting_from_setting_data(self, data: Dict[str, any]):
        """
        Adapts the json data in Settings.data to IncidentSettings
        """

        return IncidentSettings(title_filters=data.get("title_filters", []))

    def _adapt_excluded_prs_setting_from_setting_data(self, data: Dict[str, any]):
        """
        Adapts the json data in Setting.data for SettingType EXCLUDED_PRS_SETTING to ExcludedPRsSetting
        """
        return ExcludedPRsSetting(excluded_pr_ids=data.get("excluded_pr_ids", []))

    def _adapt_incident_source_setting_from_setting_data(
        self, data: Dict[str, any]
    ) -> IncidentSourcesSetting:
        """
        Adapts the json data in Settings.data to IncidentSourcesSetting
        """
        return IncidentSourcesSetting(
            incident_sources=[
                IncidentSource(source) for source in data.get("incident_sources") or []
            ]
        )

    def _adapt_incident_types_setting_from_setting_data(
        self, data: Dict[str, any]
    ) -> IncidentTypesSetting:
        """
        Adapts the json data in Settings.data to IncidentTypesSetting
        """

        return IncidentTypesSetting(
            incident_types=[
                IncidentType(incident_type)
                for incident_type in data.get("incident_types") or []
            ]
        )

    def _adapt_default_sync_days_setting_from_setting_data(self, data: Dict[str, any]):
        return DefaultSyncDaysSetting(
            default_sync_days=data.get("default_sync_days", None)
        )

    def _adapt_incident_prs_setting_setting_from_setting_data(
        self, data: Dict[str, any]
    ):
        return IncidentPrsSetting(
            include_revert_prs=data.get("include_revert_prs", True),
            title_filters=data.get("title_filters", []),
            head_branch_filters=data.get("head_branch_filters", []),
        )

    # ADD NEW DICT TO DATACLASS ADAPTERS HERE

    def _handle_config_setting_from_db_setting(
        self, setting_type: SettingType, setting_data
    ):
        # Add if statements and adapters for new setting types

        if setting_type == SettingType.INCIDENT_SETTING:
            return self._adapt_specific_incident_setting_from_setting_data(setting_data)

        if setting_type == SettingType.EXCLUDED_PRS_SETTING:
            return self._adapt_excluded_prs_setting_from_setting_data(setting_data)

        if setting_type == SettingType.INCIDENT_TYPES_SETTING:
            return self._adapt_incident_types_setting_from_setting_data(setting_data)

        if setting_type == SettingType.INCIDENT_SOURCES_SETTING:
            return self._adapt_incident_source_setting_from_setting_data(setting_data)

        if setting_type == SettingType.DEFAULT_SYNC_DAYS_SETTING:
            return self._adapt_default_sync_days_setting_from_setting_data(setting_data)

        if setting_type == SettingType.INCIDENT_PRS_SETTING:
            return self._adapt_incident_prs_setting_setting_from_setting_data(
                setting_data
            )

        # ADD NEW HANDLE FROM DB SETTINGS HERE

        raise Exception(f"Invalid Setting Type: {setting_type}")

    def _adapt_config_setting_from_db_setting(self, setting: Settings):
        specific_setting = self._handle_config_setting_from_db_setting(
            setting.setting_type, setting.data
        )

        return ConfigurationSettings(
            entity_id=setting.entity_id,
            entity_type=setting.entity_type,
            updated_by=setting.updated_by,
            created_at=setting.created_at,
            updated_at=setting.updated_at,
            specific_settings=specific_setting,
        )

    def get_settings(
        self, setting_type: SettingType, entity_type: EntityType, entity_id: str
    ) -> Optional[ConfigurationSettings]:

        setting = self._settings_repo.get_setting(
            entity_id=entity_id,
            entity_type=entity_type,
            setting_type=setting_type,
        )
        if not setting:
            return None

        return self._adapt_config_setting_from_db_setting(setting)

    def get_or_set_default_settings(
        self, setting_type: SettingType, entity_type: EntityType, entity_id: str
    ) -> ConfigurationSettings:
        """
        This method fetches the setting if it exists.
        If setting does not exist, we set default value and return the update setting.
        """

        setting = self.get_settings(setting_type, entity_type, entity_id)

        if not setting:
            try:
                setting = self.save_settings(setting_type, entity_type, entity_id)
            except Exception as e:
                if "UniqueViolation" in str(e) and "Settings_pkey" in str(e):
                    # If another concurrent request already created the settings, fetch that settings
                    setting = self.get_settings(setting_type, entity_type, entity_id)
                else:
                    raise e

        return setting

    def _adapt_specific_incident_setting_from_json(
        self, data: Dict[str, any]
    ) -> IncidentSettings:
        """
        Adapts the json data from API to IncidentSettings
        """

        return IncidentSettings(title_filters=data.get("title_includes", []))

    def _adapt_excluded_prs_setting_from_json(self, data: Dict[str, any]):
        """
        Adapts the json data from API for SettingType EXCLUDED_PRS_SETTING to ExcludedPrsSetting
        """
        return ExcludedPRsSetting(excluded_pr_ids=data.get("excluded_pr_ids", []))

    def _adapt_incident_source_setting_from_json(
        self, data: Dict[str, any]
    ) -> IncidentSourcesSetting:
        """
        Adapts the json data from API to IncidentSourcesSetting
        """

        return IncidentSourcesSetting(
            incident_sources=[
                IncidentSource(source) for source in data.get("incident_sources") or []
            ]
        )

    def _adapt_incident_types_setting_from_json(
        self, data: Dict[str, any]
    ) -> IncidentTypesSetting:
        """
        Adapts the json data from API to IncidentTypesSetting
        """

        return IncidentTypesSetting(
            incident_types=[
                IncidentType(incident_type)
                for incident_type in data.get("incident_types") or []
            ]
        )

    def _adapt_default_sync_days_setting_from_json(self, data: Dict[str, any]):
        return DefaultSyncDaysSetting(
            default_sync_days=data.get("default_sync_days", None)
        )

    def _adapt_incident_prs_setting_setting_from_json(self, data: Dict[str, any]):
        return IncidentPrsSetting(
            include_revert_prs=data.get("include_revert_prs", True),
            title_filters=data.get("title_filters", []),
            head_branch_filters=data.get("head_branch_filters", []),
        )

    # ADD NEW DICT TO API ADAPTERS HERE

    def _handle_config_setting_from_json_data(
        self, setting_type: SettingType, setting_data
    ):
        # Add if statements and adapters for new setting types

        if setting_type == SettingType.INCIDENT_SETTING:
            return self._adapt_specific_incident_setting_from_json(setting_data)

        if setting_type == SettingType.EXCLUDED_PRS_SETTING:
            return self._adapt_excluded_prs_setting_from_json(setting_data)

        if setting_type == SettingType.INCIDENT_SOURCES_SETTING:
            return self._adapt_incident_source_setting_from_json(setting_data)

        if setting_type == SettingType.INCIDENT_TYPES_SETTING:
            return self._adapt_incident_types_setting_from_json(setting_data)

        if setting_type == SettingType.DEFAULT_SYNC_DAYS_SETTING:
            return self._adapt_default_sync_days_setting_from_json(setting_data)

        if setting_type == SettingType.INCIDENT_PRS_SETTING:
            return self._adapt_incident_prs_setting_setting_from_json(setting_data)

        # ADD NEW HANDLE FROM JSON DATA HERE

        raise Exception(f"Invalid Setting Type: {setting_type}")

    def _adapt_incident_setting_json_data(
        self,
        specific_setting: IncidentSettings,
    ):
        return {"title_filters": specific_setting.title_filters}

    def _adapt_excluded_prs_setting_json_data(
        self, specific_setting: ExcludedPRsSetting
    ):
        return {"excluded_pr_ids": specific_setting.excluded_pr_ids}

    def _adapt_incident_source_setting_json_data(
        self, specific_setting: IncidentSourcesSetting
    ) -> Dict:
        return {
            "incident_sources": [
                source.value for source in specific_setting.incident_sources
            ]
        }

    def _adapt_incident_types_setting_json_data(
        self, specific_setting: IncidentTypesSetting
    ) -> Dict:
        return {
            "incident_types": [
                incident_type.value for incident_type in specific_setting.incident_types
            ]
        }

    def _adapt_default_sync_days_setting_json_data(
        self, specific_setting: DefaultSyncDaysSetting
    ):
        return {"default_sync_days": specific_setting.default_sync_days}

    def _adapt_incident_prs_setting_setting_json_data(
        self, specific_setting: IncidentPrsSetting
    ):
        return {
            "include_revert_prs": specific_setting.include_revert_prs,
            "title_filters": specific_setting.title_filters,
            "head_branch_filters": specific_setting.head_branch_filters,
        }

    # ADD NEW DATACLASS TO JSON DATA ADAPTERS HERE

    def _handle_config_setting_to_db_setting(
        self, setting_type: SettingType, specific_setting
    ):
        # Add if statements and adapters to get data for new setting types

        if setting_type == SettingType.INCIDENT_SETTING and isinstance(
            specific_setting, IncidentSettings
        ):
            return self._adapt_incident_setting_json_data(specific_setting)
        if setting_type == SettingType.EXCLUDED_PRS_SETTING and isinstance(
            specific_setting, ExcludedPRsSetting
        ):
            return self._adapt_excluded_prs_setting_json_data(specific_setting)

        if setting_type == SettingType.INCIDENT_TYPES_SETTING and isinstance(
            specific_setting, IncidentTypesSetting
        ):
            return self._adapt_incident_types_setting_json_data(specific_setting)

        if setting_type == SettingType.INCIDENT_SOURCES_SETTING and isinstance(
            specific_setting, IncidentSourcesSetting
        ):
            return self._adapt_incident_source_setting_json_data(specific_setting)

        if setting_type == SettingType.DEFAULT_SYNC_DAYS_SETTING and isinstance(
            specific_setting, DefaultSyncDaysSetting
        ):
            return self._adapt_default_sync_days_setting_json_data(specific_setting)

        if setting_type == SettingType.INCIDENT_PRS_SETTING and isinstance(
            specific_setting, IncidentPrsSetting
        ):
            return self._adapt_incident_prs_setting_setting_json_data(specific_setting)

        # ADD NEW HANDLE TO DB SETTINGS HERE

        raise Exception(f"Invalid Setting Type: {setting_type}")

    def _adapt_specific_setting_data_from_json(
        self, setting_type: SettingType, setting_data: dict
    ):
        """
        This function is getting json data (setting_data) and adapting it to the data class as per the setting type.
        This then again converts the class data into a dictionary and returns it.

        The process has been done in order to just maintain the data sanctity and to avoid any un-formatted data being stored in the DB.
        """

        specific_setting = self._handle_config_setting_from_json_data(
            setting_type, setting_data
        )

        return self._handle_config_setting_to_db_setting(setting_type, specific_setting)

    def save_settings(
        self,
        setting_type: SettingType,
        entity_type: EntityType,
        entity_id: str,
        setter: Users = None,
        setting_data: Dict = None,
    ) -> ConfigurationSettings:

        if setting_data:
            data = self._adapt_specific_setting_data_from_json(
                setting_type, setting_data
            )
        else:
            data = get_default_setting_data(setting_type)

        existing_setting = self.get_settings(setting_type, entity_type, entity_id)

        setting = Settings(
            entity_id=entity_id,
            entity_type=entity_type,
            setting_type=setting_type,
            updated_by=setter.id if setter else None,
            data=data,
            created_at=existing_setting.created_at if existing_setting else time_now(),
            updated_at=time_now(),
            is_deleted=False,
        )

        saved_setting = self._settings_repo.save_setting(setting)
        saved_config_setting = self._adapt_config_setting_from_db_setting(saved_setting)
        self._handle_settings_update_side_effect(
            setting_type, saved_config_setting, existing_setting
        )

        return saved_config_setting

    def delete_settings(
        self,
        setting_type: SettingType,
        entity_type: EntityType,
        deleted_by: Users,
        entity_id: str,
    ) -> ConfigurationSettings:

        return self._adapt_config_setting_from_db_setting(
            self._settings_repo.delete_setting(
                setting_type=setting_type,
                entity_id=entity_id,
                entity_type=entity_type,
                deleted_by=deleted_by,
            )
        )

    def get_settings_map(
        self,
        entity_id: str,
        setting_types: List[SettingType],
        entity_type: EntityType,
        ignore_default_setting_type: List[SettingType] = None,
    ) -> Dict[SettingType, any]:

        if not ignore_default_setting_type:
            ignore_default_setting_type = []

        settings: List[Settings] = self._settings_repo.get_settings(
            entity_id=entity_id, setting_types=setting_types, entity_type=entity_type
        )
        setting_type_to_setting_map: Dict[SettingType, Any] = (
            self._get_setting_type_to_setting_map(
                setting_types, settings, ignore_default_setting_type
            )
        )

        return setting_type_to_setting_map

    def _get_setting_type_to_setting_map(
        self,
        setting_types: List[SettingType],
        settings: List[Settings],
        ignore_default_setting_type: List[SettingType] = None,
    ) -> Dict[SettingType, Any]:

        if not ignore_default_setting_type:
            ignore_default_setting_type = []

        setting_type_to_setting_map: Dict[SettingType, Any] = {}
        for setting in settings:
            setting_type_to_setting_map[setting.setting_type] = (
                self._adapt_config_setting_from_db_setting(setting).specific_settings
            )

        for setting_type in setting_types:
            if (setting_type not in setting_type_to_setting_map) and (
                setting_type not in ignore_default_setting_type
            ):
                setting_type_to_setting_map[setting_type] = self.get_default_setting(
                    setting_type
                )
        return setting_type_to_setting_map

    def get_default_setting(self, setting_type: SettingType):
        return self._handle_config_setting_from_db_setting(
            setting_type, get_default_setting_data(setting_type)
        )

    def _handle_settings_update_side_effect(
        self,
        setting_type: SettingType,
        updated_setting: ConfigurationSettings,
        previous_setting: Optional[ConfigurationSettings] = None,
    ):
        """
        Setting updations might have other side-effect across the codebase. This should not be common but useful whenever needed.
        Ex: Default Sync Days updation, should allow users to reset the existing bookmark. Since bookmarks are an underlying system detail, their updation can be a side effect till they are introduced in the product.
        """

        if setting_type == SettingType.DEFAULT_SYNC_DAYS_SETTING:
            self._handle_default_sync_days_setting_side_effect(
                updated_setting, previous_setting
            )

    def _handle_default_sync_days_setting_side_effect(
        self,
        updated_setting: ConfigurationSettings,
        previous_setting: ConfigurationSettings = None,
    ):

        updated_default_sync_days_setting: DefaultSyncDaysSetting = (
            updated_setting.specific_settings
        )
        if updated_setting.entity_type != EntityType.ORG:
            return

        org_id = updated_setting.entity_id
        new_bookmark_timestamp = time_now() - timedelta(
            days=updated_default_sync_days_setting.default_sync_days
        )

        try:
            get_bookmark_service().reset_org_bookmarks(org_id, new_bookmark_timestamp)
        except Exception as e:

            data = get_default_setting_data(SettingType.DEFAULT_SYNC_DAYS_SETTING)
            if previous_setting:
                data = self._handle_config_setting_to_db_setting(
                    SettingType.DEFAULT_SYNC_DAYS_SETTING,
                    previous_setting.specific_settings,
                )

            setting = Settings(
                entity_id=org_id,
                entity_type=EntityType.ORG,
                setting_type=SettingType.DEFAULT_SYNC_DAYS_SETTING,
                updated_by=updated_setting.updated_by,
                data=data,
                created_at=updated_setting.created_at,
                updated_at=time_now(),
                is_deleted=False,
            )

            self._settings_repo.save_setting(setting)
            raise e


def get_settings_service():
    return SettingsService(SettingsRepoService())
