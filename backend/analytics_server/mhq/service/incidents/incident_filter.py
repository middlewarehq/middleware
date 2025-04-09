from typing import Dict, List, Any, Optional
from mhq.store.models.incidents.enums import IncidentType
from mhq.store.models.settings.configuration_settings import SettingType
from mhq.service.settings.configuration_settings import (
    get_settings_service,
    IncidentSettings,
    IncidentTypesSetting,
    IncidentPrsSetting,
)
from mhq.store.models.incidents import IncidentFilter

from mhq.store.models.settings import EntityType


class IncidentFilterService:
    def __init__(
        self,
        raw_incident_filter: Dict = None,
        entity_type: EntityType = None,
        entity_id: str = None,
        setting_types: List[SettingType] = None,
        setting_type_to_settings_map: Dict[SettingType, Any] = None,
    ):
        self.raw_incident_filter: Dict = raw_incident_filter or {}
        self.entity_type: EntityType = entity_type
        self.entity_id = entity_id
        self.setting_types: List[SettingType] = setting_types or []
        self.setting_type_to_settings_map: Dict[SettingType, any] = (
            setting_type_to_settings_map or {}
        )

    def apply(self):
        incident_filter: IncidentFilter = IncidentFilter()
        if self.entity_type and self.entity_id:
            incident_filter = ConfigurationsIncidentFilterProcessor(
                incident_filter,
                self.entity_type,
                self.entity_id,
                self.setting_types,
                self.setting_type_to_settings_map,
            ).apply()
        return incident_filter


def apply_incident_filter(
    incident_filter: Dict = None,
    entity_type: EntityType = None,
    entity_id: str = None,
    setting_types: List[SettingType] = None,
) -> IncidentFilter:
    setting_service = get_settings_service()
    setting_type_to_settings_map = setting_service.get_settings_map(
        entity_id, setting_types, entity_type
    )

    return IncidentFilterService(
        incident_filter,
        entity_type,
        entity_id,
        setting_types,
        setting_type_to_settings_map,
    ).apply()


class ConfigurationsIncidentFilterProcessor:
    def __init__(
        self,
        incident_filter: IncidentFilter,
        entity_type: EntityType,
        entity_id: str,
        setting_types: List[SettingType],
        setting_type_to_settings_map: Dict[SettingType, Any],
    ):
        self.incident_filter = incident_filter or IncidentFilter()
        self.entity_type: EntityType = entity_type
        self.entity_id = entity_id
        self.setting_types: List[SettingType] = setting_types or []
        self.setting_type_to_settings_map = setting_type_to_settings_map

    def apply(self):
        if SettingType.INCIDENT_SETTING in self.setting_types:
            self.incident_filter.title_filter_substrings = (
                self.__incident_title_filter()
            )

        if SettingType.INCIDENT_TYPES_SETTING in self.setting_types:
            self.incident_filter.incident_types = self.__incident_type_setting()

        return self.incident_filter

    def __incident_title_filter(self) -> List[str]:
        setting: Optional[IncidentSettings] = self.setting_type_to_settings_map.get(
            SettingType.INCIDENT_SETTING
        )
        if not setting:
            return []
        title_filters = []
        if setting and isinstance(setting, IncidentSettings):
            title_filters = setting.title_filters
        return title_filters

    def __incident_type_setting(self) -> List[str]:
        setting: Optional[IncidentTypesSetting] = self.setting_type_to_settings_map.get(
            SettingType.INCIDENT_TYPES_SETTING
        )
        if not setting:
            return []
        incident_types = []
        if setting and isinstance(setting, IncidentTypesSetting):
            incident_types = setting.incident_types

        if SettingType.INCIDENT_PRS_SETTING in self.setting_types:
            incident_prs_setting: Optional[IncidentPrsSetting] = (
                self.setting_type_to_settings_map.get(SettingType.INCIDENT_PRS_SETTING)
            )
            if (
                isinstance(incident_prs_setting, IncidentPrsSetting)
                and not incident_prs_setting.include_revert_prs
            ):
                incident_types = [
                    incident_type
                    for incident_type in incident_types
                    if incident_type != IncidentType.REVERT_PR
                ]

        return incident_types
