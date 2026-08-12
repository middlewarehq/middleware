from mhq.service.settings.default_settings_data import get_default_setting_data
from mhq.store.models.incidents import IncidentSource
from mhq.store.models.settings import SettingType


def test_incident_sources_default_does_not_include_jira_issue():
    # Regression test: this default used to be `list(IncidentSource)`,
    # computed live -- adding IncidentSource.JIRA_ISSUE to the enum would
    # have silently opted every org with no saved setting into it. It's
    # now an explicit, pinned list so JIRA_ISSUE stays opt-in only.
    data = get_default_setting_data(SettingType.INCIDENT_SOURCES_SETTING)

    assert IncidentSource.JIRA_ISSUE.value not in data["incident_sources"]
    assert set(data["incident_sources"]) == {
        IncidentSource.INCIDENT_SERVICE.value,
        IncidentSource.INCIDENT_TEAM.value,
        IncidentSource.GIT_REPO.value,
    }


def test_jira_incident_issue_types_default_is_bug_only():
    data = get_default_setting_data(SettingType.JIRA_INCIDENT_ISSUE_TYPES_SETTING)

    assert data == {"issue_types": ["Bug"]}
