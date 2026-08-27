from mhq.service.incidents.integration import IncidentsIntegrationService
from mhq.service.settings.models import IncidentSourcesSetting
from mhq.store.models.incidents import IncidentProvider, IncidentSource
from mhq.utils.string import uuid4_str

ORG_ID = uuid4_str()


class FakeSettingsService:
    def __init__(self, incident_sources):
        self._incident_sources = incident_sources
        self.saved = False

    def get_settings(self, **kwargs):
        class _Wrapper:
            specific_settings = IncidentSourcesSetting(
                incident_sources=self._incident_sources
            )

        return _Wrapper() if self._incident_sources is not None else None

    def save_settings(self, **kwargs):
        self.saved = True
        return self.get_settings()


class FakeCoreRepoService:
    def __init__(self, integrations_by_name):
        self._integrations_by_name = integrations_by_name

    def get_org_integrations_for_names(self, org_id, names):
        return [
            self._integrations_by_name[name]
            for name in names
            if name in self._integrations_by_name
        ]


class FakeIntegration:
    def __init__(self, name):
        self.name = name


def _service(incident_sources, linked_providers):
    settings_service = FakeSettingsService(incident_sources)
    core_repo_service = FakeCoreRepoService(
        {name: FakeIntegration(name) for name in linked_providers}
    )
    return IncidentsIntegrationService(core_repo_service, settings_service)


class TestGetOrgProviders:
    def test_jira_issue_source_enabled_and_linked_returns_jira(self):
        service = _service(
            incident_sources=[IncidentSource.JIRA_ISSUE],
            linked_providers=[IncidentProvider.JIRA.value],
        )

        assert service.get_org_providers(ORG_ID) == [IncidentProvider.JIRA.value]

    def test_jira_issue_source_disabled_excludes_jira_even_if_linked(self):
        service = _service(
            incident_sources=[IncidentSource.GIT_REPO],
            linked_providers=[
                IncidentProvider.JIRA.value,
                IncidentProvider.GITHUB.value,
            ],
        )

        # Jira is linked, but the org hasn't opted the source in --
        # get_org_providers must not surface it.
        providers = service.get_org_providers(ORG_ID)
        assert IncidentProvider.JIRA.value not in providers

    def test_jira_issue_source_enabled_but_not_linked_returns_nothing_for_jira(self):
        service = _service(
            incident_sources=[IncidentSource.JIRA_ISSUE],
            linked_providers=[],
        )

        assert service.get_org_providers(ORG_ID) == []

    def test_both_git_repo_and_jira_issue_enabled_returns_both(self):
        service = _service(
            incident_sources=[IncidentSource.GIT_REPO, IncidentSource.JIRA_ISSUE],
            linked_providers=[
                IncidentProvider.JIRA.value,
                IncidentProvider.GITHUB.value,
            ],
        )

        providers = service.get_org_providers(ORG_ID)
        assert IncidentProvider.JIRA.value in providers
        assert IncidentProvider.GITHUB.value in providers
