from datetime import datetime
from unittest.mock import patch, Mock

import pytz
from mhq.service.incidents.incidents import IncidentService, get_incident_service
from mhq.utils.time import Interval
from mhq.service.settings.models import IncidentPRsSetting
from mhq.store.models.settings.configuration_settings import SettingType
from mhq.store.models.code.filter import PRFilter
from mhq.store.models.code import TeamRepos, PullRequest
from mhq.service.settings.models import ConfigurationSettings
from mhq.store.models import EntityType
import pytest


def mock_interval():
    start_time = datetime(2025, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
    end_time = datetime(2025, 3, 31, 0, 0, 0, tzinfo=pytz.UTC)
    return Interval(start_time, end_time)


@pytest.fixture(autouse=True)
def mock_apply_pr_filter():
    with patch("mhq.service.incidents.incidents.apply_pr_filter") as mock:
        mock.return_value = PRFilter()
        yield mock


class FakeSettingsService:
    def get_settings(self, *args, **kwargs):
        filters = [
            {
                "field": "head_branch",
                "value": "^revert-(\\d+)$",
            },
            {
                "field": "title",
                "value": "^Revert PR #(\\d+).*",
            },
        ]
        return ConfigurationSettings(
            entity_id="team_1",
            entity_type=EntityType.TEAM,
            specific_settings=IncidentPRsSetting(
                include_revert_prs=True, filters=filters
            ),
            updated_by="user_1",
            created_at=datetime(2025, 1, 1, 0, 0, 0, tzinfo=pytz.UTC),
            updated_at=datetime(2025, 1, 1, 0, 0, 0, tzinfo=pytz.UTC),
        )

    def get_settings_map(self, *args, **kwargs):
        return {
            SettingType.INCIDENT_PRS_SETTING: self.get_settings(*args, **kwargs),
        }


class FakeCodeRepoService:
    def __init__(self, resolution_prs, prs_using_numbers):
        self._resolution_prs = resolution_prs
        self._prs_using_numbers = prs_using_numbers

    def get_active_team_repos_by_team_id(self, *args, **kwargs):
        return [
            TeamRepos(
                team_id="team_1",
                org_repo_id="repo_1",
            ),
            TeamRepos(
                team_id="team_1",
                org_repo_id="repo_2",
            ),
        ]

    def get_prs_merged_in_interval(self, *args, **kwargs):
        return self._resolution_prs

    def get_prs_merged_in_interval_by_numbers(self, *args, **kwargs):
        return self._prs_using_numbers


class FakeIncidentsRepoService:
    pass


def test_get_team_pr_incidents_no_filters():
    incident_service = get_incident_service()

    mock_settings_service = Mock()
    mock_settings_service.get_settings.return_value.specific_settings = (
        IncidentPRsSetting(include_revert_prs=True, filters=[])
    )
    incident_service._settings_service = mock_settings_service

    result = incident_service.get_team_pr_incidents(
        "team_1",
        mock_interval(),
        PRFilter(),
    )

    assert result == []


def test_get_team_pr_incidents_with_filters():

    resolution_prs = [
        PullRequest(
            id="pr_2_of_repo_1",
            repo_id="repo_1",
            number="2",
            head_branch="revert-1",
        ),
        PullRequest(
            id="pr_4_of_repo_1",
            repo_id="repo_1",
            number="4",
            head_branch="branch_4",
            title="Revert PR #3 due to some reason",
        ),
    ]

    prs_using_numbers = [
        PullRequest(
            id="pr_1_of_repo_1", repo_id="repo_1", number="1", head_branch="branch_1"
        ),
        PullRequest(
            id="pr_3_of_repo_1",
            repo_id="repo_1",
            number="3",
            head_branch="branch_3",
        ),
    ]

    incident_service = IncidentService(
        FakeIncidentsRepoService(),
        FakeSettingsService(),
        FakeCodeRepoService(resolution_prs, prs_using_numbers),
    )

    expected_result_keys = [
        "pr_1_of_repo_1",
        "pr_3_of_repo_1",
    ]

    result = incident_service.get_team_pr_incidents(
        "team_1",
        mock_interval(),
        PRFilter(),
    )

    assert expected_result_keys == [incident.key for incident in result]


def test_get_team_pr_incidents_with_multiple_repos_but_no_incidents():

    resolution_prs = [
        PullRequest(
            id="pr_2_of_repo_1",
            repo_id="repo_1",
            number="2",
            head_branch="revert-1",
        ),
        PullRequest(
            id="pr_2_of_repo_2",
            repo_id="repo_2",
            number="2",
            head_branch="revert-1",
        ),
    ]

    prs_using_numbers = []

    incident_service = IncidentService(
        FakeIncidentsRepoService(),
        FakeSettingsService(),
        FakeCodeRepoService(resolution_prs, prs_using_numbers),
    )

    expected_result_keys = []

    result = incident_service.get_team_pr_incidents(
        "team_1",
        mock_interval(),
        PRFilter(),
    )

    assert expected_result_keys == [incident.key for incident in result]


def test_get_team_pr_incidents_with_multiple_repos_and_incidents():

    resolution_prs = [
        PullRequest(
            id="pr_2_of_repo_1", repo_id="repo_1", number="2", head_branch="revert-1"
        ),
        PullRequest(
            id="pr_2_of_repo_2",
            repo_id="repo_2",
            number="2",
            head_branch="revert-1",
        ),
    ]

    prs_using_numbers = [
        PullRequest(
            id="pr_1_of_repo_1",
            repo_id="repo_1",
            number="1",
            head_branch="branch_1",
        ),
        PullRequest(
            id="pr_1_of_repo_2",
            repo_id="repo_2",
            number="1",
            head_branch="branch_1",
        ),
    ]

    incident_service = IncidentService(
        FakeIncidentsRepoService(),
        FakeSettingsService(),
        FakeCodeRepoService(resolution_prs, prs_using_numbers),
    )

    expected_result_keys = [
        "pr_1_of_repo_1",
        "pr_1_of_repo_2",
    ]

    result = incident_service.get_team_pr_incidents(
        "team_1",
        mock_interval(),
        PRFilter(),
    )

    assert expected_result_keys == [incident.key for incident in result]
