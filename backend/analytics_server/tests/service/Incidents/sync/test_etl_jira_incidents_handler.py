from datetime import datetime, timezone

from mhq.service.incidents.sync.etl_jira_incidents_handler import (
    JiraIncidentsETLHandler,
)
from mhq.service.settings.models import JiraIncidentIssueTypesSetting
from mhq.store.models.incidents import (
    IncidentProvider,
    IncidentSource,
    IncidentStatus,
    IncidentType,
    TeamIncidentService,
)
from mhq.store.models.projects import OrgProject, Ticket, TicketState
from mhq.utils.string import uuid4_str
from tests.factories.models.incidents import get_org_incident_service
from tests.utilities import compare_objects_as_dicts

ORG_ID = uuid4_str()
PROJECT_ID = uuid4_str()
SITE_URL = "https://clustox.atlassian.net"


def _org_project(project_id=PROJECT_ID, org_id=ORG_ID, name="Middleware"):
    return OrgProject(id=project_id, org_id=org_id, name=name, provider="jira")


def _ticket(
    ticket_id="t1",
    key="MID-1",
    project_id=PROJECT_ID,
    status="Done",
    status_category="Done",
    issue_type="Bug",
    summary="Something broke",
    assignee=None,
    created_at=None,
    updated_at=None,
):
    return Ticket(
        id=ticket_id,
        key=key,
        org_project_id=project_id,
        status=status,
        status_category=status_category,
        data={"issue_type": issue_type, "summary": summary, "assignee": assignee},
        created_at=created_at or datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=updated_at or datetime(2026, 1, 10, tzinfo=timezone.utc),
    )


def _state(ticket_id, to_status, changed_at):
    return TicketState(ticket_id=ticket_id, to_status=to_status, changed_at=changed_at)


class FakeProjectRepoService:
    def __init__(
        self,
        active_projects=None,
        tickets_and_states=(None, None),
        team_ids_by_project=None,
    ):
        self._active_projects = active_projects or []
        self._tickets, self._states = tickets_and_states
        self._team_ids_by_project = team_ids_by_project or {}
        self.fetched_with = None

    def get_active_org_projects_for_provider(self, org_id, provider):
        return self._active_projects

    def get_tickets_by_issue_types_for_project(
        self, org_project_id, issue_types, from_time, to_time
    ):
        self.fetched_with = (org_project_id, issue_types, from_time, to_time)
        if self._tickets is None:
            return [], []
        return self._tickets, self._states

    def get_team_ids_for_org_project(self, org_project_id):
        return self._team_ids_by_project.get(org_project_id, [])


class FakeIncidentsRepoService:
    def __init__(self, existing_incident=None, existing_team_links=None):
        self._existing_incident = existing_incident
        self._existing_team_links = existing_team_links or []
        self.added_team_links = []
        self.looked_up_with = None

    def get_incident_by_key_type_provider_and_org(self, *args, **kwargs):
        self.looked_up_with = args
        return self._existing_incident

    def get_team_incident_services(self, team):
        return [
            link for link in self._existing_team_links if str(link.team_id) == team.id
        ]

    def add_team_incident_services(self, services):
        self.added_team_links.extend(services)


class FakeSettingsService:
    def __init__(self, issue_types=("Bug",)):
        self._issue_types = list(issue_types)

    def get_or_set_default_settings(self, **kwargs):
        class _Wrapper:
            specific_settings = JiraIncidentIssueTypesSetting(
                issue_types=self._issue_types
            )

        return _Wrapper()


def _handler(
    project_repo_service=None,
    incidents_repo_service=None,
    settings_service=None,
):
    return JiraIncidentsETLHandler(
        ORG_ID,
        None,
        project_repo_service or FakeProjectRepoService(),
        incidents_repo_service or FakeIncidentsRepoService(),
        settings_service or FakeSettingsService(),
        SITE_URL,
    )


class TestGetUpdatedIncidentServices:
    def test_creates_one_service_per_active_jira_project(self):
        project = _org_project()
        handler = _handler(
            project_repo_service=FakeProjectRepoService(active_projects=[project])
        )

        services = handler.get_updated_incident_services([])

        assert len(services) == 1
        service = services[0]
        assert service.key == str(PROJECT_ID)
        assert service.org_id == ORG_ID
        assert service.provider == IncidentProvider.JIRA.value
        assert service.source_type == IncidentSource.JIRA_ISSUE
        assert service.name == "Middleware"

    def test_reuses_existing_service_id_for_the_same_project(self):
        project = _org_project()
        existing = get_org_incident_service(
            service_id="existing-id", key=str(PROJECT_ID)
        )
        existing.source_type = IncidentSource.JIRA_ISSUE
        handler = _handler(
            project_repo_service=FakeProjectRepoService(active_projects=[project])
        )

        services = handler.get_updated_incident_services([existing])

        assert services[0].id == "existing-id"

    def test_ignores_non_jira_incident_services(self):
        project = _org_project()
        github_service = get_org_incident_service(service_id="gh-1", key="some-repo")
        handler = _handler(
            project_repo_service=FakeProjectRepoService(active_projects=[project])
        )

        services = handler.get_updated_incident_services([github_service])

        # A new id was minted -- the github service was never considered a match.
        assert services[0].id != "gh-1"


class TestToIncident:
    def test_open_ticket_becomes_a_triggered_unresolved_incident(self):
        ticket = _ticket(status="In Progress", status_category="In Progress")
        handler = _handler()

        incident = handler._to_incident(ticket, states=[])

        assert incident.status == IncidentStatus.TRIGGERED.value
        assert incident.resolved_date is None
        assert incident.creation_date == ticket.created_at
        assert incident.key == "MID-1"
        assert incident.incident_type == IncidentType.JIRA_ISSUE
        assert incident.provider == IncidentProvider.JIRA.value
        assert incident.url == f"{SITE_URL}/browse/MID-1"

    def test_done_ticket_with_states_resolves_at_its_last_transition(self):
        ticket = _ticket(status="Done", status_category="Done")
        states = [
            _state(ticket.id, "In Progress", datetime(2026, 1, 2, tzinfo=timezone.utc)),
            _state(ticket.id, "Done", datetime(2026, 1, 5, tzinfo=timezone.utc)),
        ]
        handler = _handler()

        incident = handler._to_incident(ticket, states)

        assert incident.status == IncidentStatus.RESOLVED.value
        assert incident.resolved_date == datetime(2026, 1, 5, tzinfo=timezone.utc)

    def test_done_ticket_with_no_states_falls_back_to_updated_at(self):
        ticket = _ticket(status="Done", status_category="Done")
        handler = _handler()

        incident = handler._to_incident(ticket, states=[])

        assert incident.resolved_date == ticket.updated_at

    def test_looks_up_the_existing_incident_scoped_to_this_org(self):
        # Cross-tenant collision regression: ticket.key ("MID-1") is
        # site-local, not globally unique -- two orgs' Jira sites can
        # land on the same key, so the lookup must be scoped by org_id,
        # not just (key, incident_type, provider).
        ticket = _ticket(key="MID-1")
        incidents_repo_service = FakeIncidentsRepoService()
        handler = _handler(incidents_repo_service=incidents_repo_service)

        handler._to_incident(ticket, states=[])

        assert incidents_repo_service.looked_up_with == (
            ORG_ID,
            "MID-1",
            IncidentType.JIRA_ISSUE,
            IncidentProvider.JIRA,
        )

    def test_upsert_reuses_existing_incident_id_and_created_at(self):
        existing = get_org_incident_service(service_id=uuid4_str())  # unrelated fixture
        from tests.factories.models import get_incident

        existing_incident = get_incident(
            id="existing-incident-id", created_at=datetime(2020, 1, 1, tzinfo=timezone.utc)
        )
        ticket = _ticket()
        handler = _handler(
            incidents_repo_service=FakeIncidentsRepoService(
                existing_incident=existing_incident
            )
        )

        incident = handler._to_incident(ticket, states=[])

        assert incident.id == "existing-incident-id"
        assert incident.created_at == datetime(2020, 1, 1, tzinfo=timezone.utc)

    def test_assignee_is_carried_through_when_present(self):
        ticket = _ticket(assignee="jdoe")
        handler = _handler()

        incident = handler._to_incident(ticket, states=[])

        assert incident.assigned_to == "jdoe"
        assert incident.assignees == ["jdoe"]

    def test_no_site_url_means_no_ticket_url(self):
        ticket = _ticket()
        handler = JiraIncidentsETLHandler(
            ORG_ID, None, FakeProjectRepoService(), FakeIncidentsRepoService(),
            FakeSettingsService(), None,
        )

        incident = handler._to_incident(ticket, states=[])

        assert incident.url is None


class TestProcessServiceIncidents:
    def test_no_configured_issue_types_short_circuits_without_querying(self):
        project_repo = FakeProjectRepoService(tickets_and_states=([], []))
        handler = _handler(
            project_repo_service=project_repo,
            settings_service=FakeSettingsService(issue_types=[]),
        )
        service = get_org_incident_service(service_id=uuid4_str(), key=str(PROJECT_ID))
        bookmark = datetime(2026, 1, 1, tzinfo=timezone.utc)

        incidents, maps, new_bookmark = handler.process_service_incidents(
            service, bookmark
        )

        assert incidents == []
        assert maps == []
        assert new_bookmark == bookmark
        assert project_repo.fetched_with is None

    def test_no_qualifying_tickets_returns_empty_and_keeps_bookmark(self):
        project_repo = FakeProjectRepoService(tickets_and_states=([], []))
        handler = _handler(project_repo_service=project_repo)
        service = get_org_incident_service(service_id=uuid4_str(), key=str(PROJECT_ID))
        bookmark = datetime(2026, 1, 1, tzinfo=timezone.utc)

        incidents, maps, new_bookmark = handler.process_service_incidents(
            service, bookmark
        )

        assert incidents == []
        assert maps == []
        assert new_bookmark == bookmark

    def test_qualifying_tickets_become_incidents_and_advance_the_bookmark(self):
        ticket = _ticket(
            ticket_id="t1",
            key="MID-1",
            updated_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
        )
        project_repo = FakeProjectRepoService(tickets_and_states=([ticket], []))
        handler = _handler(project_repo_service=project_repo)
        service = get_org_incident_service(service_id=uuid4_str(), key=str(PROJECT_ID))
        bookmark = datetime(2026, 1, 1, tzinfo=timezone.utc)

        incidents, maps, new_bookmark = handler.process_service_incidents(
            service, bookmark
        )

        assert len(incidents) == 1
        assert incidents[0].key == "MID-1"
        assert len(maps) == 1
        assert maps[0].incident_id == incidents[0].id
        assert maps[0].service_id == service.id
        assert new_bookmark == datetime(2026, 2, 1, tzinfo=timezone.utc)

    def test_passes_the_configured_issue_types_to_the_ticket_query(self):
        project_repo = FakeProjectRepoService(tickets_and_states=([], []))
        handler = _handler(
            project_repo_service=project_repo,
            settings_service=FakeSettingsService(issue_types=["Bug", "Incident"]),
        )
        service = get_org_incident_service(service_id=uuid4_str(), key=str(PROJECT_ID))

        handler.process_service_incidents(
            service, datetime(2026, 1, 1, tzinfo=timezone.utc)
        )

        fetched_project_id, fetched_issue_types, _, _ = project_repo.fetched_with
        assert fetched_project_id == str(PROJECT_ID)
        assert fetched_issue_types == ["Bug", "Incident"]


class TestEnsureTeamLinks:
    def test_links_teams_with_the_project_actively_selected(self):
        team_id = uuid4_str()
        project_repo = FakeProjectRepoService(
            tickets_and_states=([], []),
            team_ids_by_project={str(PROJECT_ID): [team_id]},
        )
        incidents_repo = FakeIncidentsRepoService()
        handler = _handler(
            project_repo_service=project_repo, incidents_repo_service=incidents_repo
        )
        service = get_org_incident_service(service_id=uuid4_str(), key=str(PROJECT_ID))

        handler.process_service_incidents(
            service, datetime(2026, 1, 1, tzinfo=timezone.utc)
        )

        assert len(incidents_repo.added_team_links) == 1
        link = incidents_repo.added_team_links[0]
        assert link.team_id == team_id
        assert link.service_id == service.id

    def test_does_not_duplicate_an_existing_link(self):
        team_id = uuid4_str()
        service_id = uuid4_str()
        project_repo = FakeProjectRepoService(
            tickets_and_states=([], []),
            team_ids_by_project={str(PROJECT_ID): [team_id]},
        )
        incidents_repo = FakeIncidentsRepoService(
            existing_team_links=[
                TeamIncidentService(team_id=team_id, service_id=service_id)
            ]
        )
        handler = _handler(
            project_repo_service=project_repo, incidents_repo_service=incidents_repo
        )
        service = get_org_incident_service(service_id=service_id, key=str(PROJECT_ID))

        handler.process_service_incidents(
            service, datetime(2026, 1, 1, tzinfo=timezone.utc)
        )

        assert incidents_repo.added_team_links == []

    def test_no_teams_selected_the_project_links_nothing(self):
        project_repo = FakeProjectRepoService(tickets_and_states=([], []))
        incidents_repo = FakeIncidentsRepoService()
        handler = _handler(
            project_repo_service=project_repo, incidents_repo_service=incidents_repo
        )
        service = get_org_incident_service(service_id=uuid4_str(), key=str(PROJECT_ID))

        handler.process_service_incidents(
            service, datetime(2026, 1, 1, tzinfo=timezone.utc)
        )

        assert incidents_repo.added_team_links == []
