from mhq.service.incidents.incident_filter import ConfigurationsIncidentFilterProcessor
from mhq.store.models.incidents import IncidentFilter
from mhq.store.models.settings.configuration_settings import SettingType
from mhq.service.settings.configuration_settings import (
    IncidentTypesSetting,
    IncidentPrsSetting,
)
from mhq.store.models.incidents.enums import IncidentType
from mhq.store.models.settings import EntityType


def test_get_incident_types_when_only_types_setting_present():
    setting_types = [SettingType.INCIDENT_TYPES_SETTING]
    setting_type_to_settings_map = {
        SettingType.INCIDENT_TYPES_SETTING: IncidentTypesSetting(
            incident_types=[
                IncidentType.INCIDENT,
                IncidentType.ALERT,
                IncidentType.REVERT_PR,
            ]
        )
    }

    incident_filter = ConfigurationsIncidentFilterProcessor(
        incident_filter=IncidentFilter(),
        entity_type=EntityType.TEAM,
        entity_id="team_id",
        setting_types=setting_types,
        setting_type_to_settings_map=setting_type_to_settings_map,
    ).apply()

    expected_incident_types = [
        IncidentType.INCIDENT,
        IncidentType.ALERT,
        IncidentType.REVERT_PR,
    ]

    assert incident_filter.incident_types == expected_incident_types


def test_get_incident_types_when_types_setting_is_empty():
    setting_types = [SettingType.INCIDENT_TYPES_SETTING]
    setting_type_to_settings_map = {
        SettingType.INCIDENT_TYPES_SETTING: IncidentTypesSetting(incident_types=[])
    }

    incident_filter = ConfigurationsIncidentFilterProcessor(
        incident_filter=IncidentFilter(),
        entity_type=EntityType.TEAM,
        entity_id="dummy_id",
        setting_types=setting_types,
        setting_type_to_settings_map=setting_type_to_settings_map,
    ).apply()

    assert incident_filter.incident_types == []


def test_get_incident_types_when_only_prs_setting_present_returns_empty_list():
    setting_types = [SettingType.INCIDENT_PRS_SETTING]
    incident_prs_setting = IncidentPrsSetting(
        include_revert_prs=True,
        title_filters=[],
        head_branch_filters=[],
        pr_mapping_field="",
        pr_mapping_pattern="",
    )
    setting_type_to_settings_map = {
        SettingType.INCIDENT_PRS_SETTING: incident_prs_setting
    }

    incident_filter = ConfigurationsIncidentFilterProcessor(
        incident_filter=IncidentFilter(),
        entity_type=EntityType.TEAM,
        entity_id="team_id",
        setting_types=setting_types,
        setting_type_to_settings_map=setting_type_to_settings_map,
    ).apply()

    assert incident_filter.incident_types is None


def test_get_incident_types_when_both_types_and_prs_settings_present_and_includes_revert_prs():
    setting_types = [
        SettingType.INCIDENT_TYPES_SETTING,
        SettingType.INCIDENT_PRS_SETTING,
    ]
    incident_prs_setting = IncidentPrsSetting(
        include_revert_prs=True,
        title_filters=[],
        head_branch_filters=[],
        pr_mapping_field="",
        pr_mapping_pattern="",
    )
    setting_type_to_settings_map = {
        SettingType.INCIDENT_TYPES_SETTING: IncidentTypesSetting(
            incident_types=[IncidentType.INCIDENT, IncidentType.REVERT_PR]
        ),
        SettingType.INCIDENT_PRS_SETTING: incident_prs_setting,
    }

    incident_filter = ConfigurationsIncidentFilterProcessor(
        incident_filter=IncidentFilter(),
        entity_type=EntityType.TEAM,
        entity_id="team_id",
        setting_types=setting_types,
        setting_type_to_settings_map=setting_type_to_settings_map,
    ).apply()

    expected_incident_types = [IncidentType.INCIDENT, IncidentType.REVERT_PR]

    assert incident_filter.incident_types == expected_incident_types


def test_get_incident_types_when_both_settings_present_and_not_includes_revert_prs():
    setting_types = [
        SettingType.INCIDENT_TYPES_SETTING,
        SettingType.INCIDENT_PRS_SETTING,
    ]
    incident_prs_setting = IncidentPrsSetting(
        include_revert_prs=False,
        title_filters=[],
        head_branch_filters=[],
        pr_mapping_field="",
        pr_mapping_pattern="",
    )
    setting_type_to_settings_map = {
        SettingType.INCIDENT_TYPES_SETTING: IncidentTypesSetting(
            incident_types=[IncidentType.INCIDENT, IncidentType.REVERT_PR]
        ),
        SettingType.INCIDENT_PRS_SETTING: incident_prs_setting,
    }

    incident_filter = ConfigurationsIncidentFilterProcessor(
        incident_filter=IncidentFilter(),
        entity_type=EntityType.TEAM,
        entity_id="team_id",
        setting_types=setting_types,
        setting_type_to_settings_map=setting_type_to_settings_map,
    ).apply()

    expected_incident_types = [IncidentType.INCIDENT]

    assert incident_filter.incident_types == expected_incident_types
