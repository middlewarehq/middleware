from mhq.service.settings.default_settings_data import get_default_setting_data
from mhq.store.models.incidents import IncidentSource
from mhq.store.models.settings import SettingType


def test_incident_sources_default_is_explicit_not_computed_live():
    # Regression test: this default used to be `list(IncidentSource)`,
    # computed live -- adding a new value to the enum would silently opt
    # every org with no saved setting into it, sight-unseen. It's an
    # explicit, pinned list instead, so a new source added to the enum
    # in the future has to be a deliberate addition here too.
    data = get_default_setting_data(SettingType.INCIDENT_SOURCES_SETTING)

    assert set(data["incident_sources"]) == {
        IncidentSource.INCIDENT_SERVICE.value,
        IncidentSource.INCIDENT_TEAM.value,
        IncidentSource.GIT_REPO.value,
        IncidentSource.JIRA_ISSUE.value,
    }


def test_incident_sources_default_includes_jira_issue_unconditionally():
    # JIRA_ISSUE used to be the one opt-in exception in this list -- now on
    # by default, same as GIT_REPO, since a reopened ticket is the same
    # kind of "the fix didn't hold" signal a revert PR already is. The
    # admin-facing toggle to turn it back off still exists
    # (ConfigureJiraIncidentSourceModalBody); only this default changed.
    data = get_default_setting_data(SettingType.INCIDENT_SOURCES_SETTING)

    assert IncidentSource.JIRA_ISSUE.value in data["incident_sources"]


def test_jira_incident_issue_types_default_is_bug_only():
    data = get_default_setting_data(SettingType.JIRA_INCIDENT_ISSUE_TYPES_SETTING)

    assert data == {"issue_types": ["Bug"]}
