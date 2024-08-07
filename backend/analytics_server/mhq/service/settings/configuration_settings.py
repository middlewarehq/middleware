from typing import Any, Dict, Optional, List

from mhq.service.settings.default_settings_data import get_default_setting_data
from mhq.service.settings.models import (
    ConfigurationSettings,
    DefaultSyncDaysSetting,
    ExcludedPRsSetting,
    IncidentSettings,
    IncidentSourcesSetting,
    IncidentTypesSetting,
)
from mhq.store.models.core.users import Users
from mhq.store.models.incidents import IncidentSource, IncidentType
from mhq.store.models.settings import SettingType, Settings, EntityType
from mhq.store.repos.settings import SettingsRepoService
from mhq.utils.time import time_now


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

        setting = Settings(
            entity_id=entity_id,
            entity_type=entity_type,
            setting_type=setting_type,
            updated_by=setter.id if setter else None,
            data=data,
            created_at=time_now(),
            updated_at=time_now(),
            is_deleted=False,
        )

        saved_setting = self._settings_repo.save_setting(setting)

        return self._adapt_config_setting_from_db_setting(saved_setting)

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


def get_settings_service():
    return SettingsService(SettingsRepoService())
