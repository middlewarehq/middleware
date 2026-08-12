from mhq.service.settings.configuration_settings import SettingsService
from mhq.service.settings.models import JiraIncidentIssueTypesSetting
from mhq.store.models.settings import SettingType


def _service() -> SettingsService:
    # The adapter methods under test are pure -- they never touch
    # self._settings_repo, so a real repo isn't needed here.
    return SettingsService(None)


class TestJiraIncidentIssueTypesSettingAdapters:
    def test_from_json_data(self):
        service = _service()

        setting = service._adapt_jira_incident_issue_types_setting_from_json(
            {"issue_types": ["Bug", "Incident"]}
        )

        assert setting == JiraIncidentIssueTypesSetting(issue_types=["Bug", "Incident"])

    def test_from_json_data_missing_key_defaults_to_empty_list(self):
        service = _service()

        setting = service._adapt_jira_incident_issue_types_setting_from_json({})

        assert setting.issue_types == []

    def test_from_db_setting_data(self):
        service = _service()

        setting = service._adapt_jira_incident_issue_types_setting_from_setting_data(
            {"issue_types": ["Bug"]}
        )

        assert setting == JiraIncidentIssueTypesSetting(issue_types=["Bug"])

    def test_to_db_json_data(self):
        service = _service()

        data = service._adapt_jira_incident_issue_types_setting_json_data(
            JiraIncidentIssueTypesSetting(issue_types=["Bug", "Task"])
        )

        assert data == {"issue_types": ["Bug", "Task"]}

    def test_full_round_trip_from_api_json_to_db_json(self):
        service = _service()

        db_json = service._adapt_specific_setting_data_from_json(
            SettingType.JIRA_INCIDENT_ISSUE_TYPES_SETTING, {"issue_types": ["Bug"]}
        )

        assert db_json == {"issue_types": ["Bug"]}

    def test_dispatches_via_the_generic_setting_type_handlers(self):
        service = _service()

        from_db = service._handle_config_setting_from_db_setting(
            SettingType.JIRA_INCIDENT_ISSUE_TYPES_SETTING, {"issue_types": ["Bug"]}
        )
        assert isinstance(from_db, JiraIncidentIssueTypesSetting)

        to_db = service._handle_config_setting_to_db_setting(
            SettingType.JIRA_INCIDENT_ISSUE_TYPES_SETTING, from_db
        )
        assert to_db == {"issue_types": ["Bug"]}
