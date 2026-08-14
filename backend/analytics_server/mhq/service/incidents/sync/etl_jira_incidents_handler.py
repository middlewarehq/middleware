from datetime import datetime
from typing import Dict, List, Optional, Tuple

from mhq.exapi.jira import JiraApiService
from mhq.service.incidents.sync.etl_provider_handler import IncidentsProviderETLHandler
from mhq.service.settings import SettingsService, get_settings_service
from mhq.service.settings.models import JiraIncidentIssueTypesSetting
from mhq.store.models import UserIdentityProvider
from mhq.store.models.settings import EntityType, SettingType
from mhq.store.models.incidents import (
    Incident,
    IncidentOrgIncidentServiceMap,
    IncidentProvider,
    IncidentSource,
    IncidentStatus,
    IncidentType,
    OrgIncidentService,
    TeamIncidentService,
)
from mhq.store.models.projects import OrgProject, Ticket, TicketState
from mhq.store.repos.core import CoreRepoService
from mhq.store.repos.incidents import IncidentsRepoService
from mhq.store.repos.projects import ProjectRepoService
from mhq.utils.log import LOG
from mhq.utils.string import uuid4_str
from mhq.utils.time import time_now


class JiraIncidentsETLHandler(IncidentsProviderETLHandler):
    """
    Treats Ticket rows of a configured Jira issue type (default: "Bug",
    see JiraIncidentIssueTypesSetting) as incidents for Change Failure
    Rate / MTTR -- see docs/JIRA_INTEGRATION_PROPOSAL.md. Mirrors
    GitIncidentsETLHandler's shape: one OrgIncidentService per active
    Jira project (that file's equivalent of "one per repo"), upserted
    Incidents per ticket.

    Unlike revert-PR incidents (created already-resolved, single-shot),
    a Jira-ticket incident can be open when first synced and resolved on
    a later sync -- status/resolved_date are recomputed from the
    ticket's current state every sync, not fixed at creation.
    """

    def __init__(
        self,
        org_id: str,
        jira_api_service: JiraApiService,
        project_repo_service: ProjectRepoService,
        incidents_repo_service: IncidentsRepoService,
        settings_service: SettingsService,
        site_url: Optional[str],
    ):
        self.org_id = org_id
        self._api = jira_api_service
        self._project_repo_service = project_repo_service
        self._incidents_repo_service = incidents_repo_service
        self._settings_service = settings_service
        self._site_url = site_url

    def check_pat_validity(self) -> bool:
        return self._api.check_pat()

    def get_updated_incident_services(
        self, incident_services: List[OrgIncidentService]
    ) -> List[OrgIncidentService]:
        jira_services = [
            service
            for service in incident_services
            if service.source_type == IncidentSource.JIRA_ISSUE
        ]
        key_to_service_map: Dict[str, OrgIncidentService] = {
            service.key: service for service in jira_services
        }

        active_projects: List[OrgProject] = (
            self._project_repo_service.get_active_org_projects_for_provider(
                self.org_id, UserIdentityProvider.JIRA.value
            )
        )

        return [
            self._adapt_org_incident_service(
                project, key_to_service_map.get(str(project.id))
            )
            for project in active_projects
        ]

    def process_service_incidents(
        self, incident_service: OrgIncidentService, bookmark: datetime
    ) -> Tuple[List[Incident], List[IncidentOrgIncidentServiceMap], datetime]:
        # incident_service.key is the org_project id (see
        # _adapt_org_incident_service) -- link any team that has this
        # project actively selected (MID-3) before syncing its incidents,
        # so a team never has to configure "which Jira project" twice.
        self._ensure_team_links(incident_service)

        issue_types = self._get_issue_types()
        if not issue_types:
            return [], [], bookmark

        from_time = bookmark
        to_time = time_now()

        tickets, ticket_states = (
            self._project_repo_service.get_tickets_by_issue_types_for_project(
                incident_service.key, issue_types, from_time, to_time
            )
        )
        if not tickets:
            LOG.info(
                f"[Jira Incidents Sync] No qualifying tickets for service "
                f"{str(incident_service.id)} in org {self.org_id} since "
                f"{from_time.isoformat()}"
            )
            return [], [], bookmark

        states_by_ticket: Dict[str, List[TicketState]] = {}
        for state in ticket_states:
            states_by_ticket.setdefault(str(state.ticket_id), []).append(state)

        incidents: List[Incident] = []
        incident_service_maps: List[IncidentOrgIncidentServiceMap] = []
        for ticket in tickets:
            incident = self._to_incident(ticket, states_by_ticket.get(str(ticket.id), []))
            incidents.append(incident)
            incident_service_maps.append(
                IncidentOrgIncidentServiceMap(
                    incident_id=incident.id, service_id=incident_service.id
                )
            )

        bookmark = max(bookmark, max(ticket.updated_at for ticket in tickets))
        return incidents, incident_service_maps, bookmark

    def _ensure_team_links(self, incident_service: OrgIncidentService) -> None:
        team_ids = self._project_repo_service.get_team_ids_for_org_project(
            incident_service.key
        )
        if not team_ids:
            return

        existing_links = {
            (str(link.team_id), str(link.service_id))
            for team_id in team_ids
            for link in self._incidents_repo_service.get_team_incident_services(
                _TeamIdOnly(team_id)
            )
        }
        new_links = [
            TeamIncidentService(team_id=team_id, service_id=incident_service.id)
            for team_id in team_ids
            if (team_id, str(incident_service.id)) not in existing_links
        ]
        if new_links:
            self._incidents_repo_service.add_team_incident_services(new_links)

    def _get_issue_types(self) -> List[str]:
        setting: JiraIncidentIssueTypesSetting = (
            self._settings_service.get_or_set_default_settings(
                setting_type=SettingType.JIRA_INCIDENT_ISSUE_TYPES_SETTING,
                entity_type=EntityType.ORG,
                entity_id=self.org_id,
            ).specific_settings
        )
        return setting.issue_types

    def _to_incident(self, ticket: Ticket, states: List[TicketState]) -> Incident:
        # CLUSTOX: org-scoped lookup -- ticket.key ("PROJ-123") is
        # site-local, not globally unique, so two orgs' Jira sites can
        # land on the same key. See
        # get_incident_by_key_type_provider_and_org's own docstring.
        existing_incident: Optional[Incident] = (
            self._incidents_repo_service.get_incident_by_key_type_provider_and_org(
                self.org_id, ticket.key, IncidentType.JIRA_ISSUE, IncidentProvider.JIRA
            )
        )
        incident_id = existing_incident.id if existing_incident else uuid4_str()

        is_resolved = ticket.status_category == "Done"
        resolved_date = self._resolved_date(ticket, states) if is_resolved else None

        return Incident(
            id=incident_id,
            provider=IncidentProvider.JIRA.value,
            key=ticket.key,
            title=ticket.summary,
            status=(
                IncidentStatus.RESOLVED.value
                if is_resolved
                else IncidentStatus.TRIGGERED.value
            ),
            creation_date=ticket.created_at,
            resolved_date=resolved_date,
            assigned_to=ticket.assignee,
            assignees=[ticket.assignee] if ticket.assignee else [],
            url=self._ticket_url(ticket),
            meta={"issue_type": ticket.issue_type, "status": ticket.status},
            created_at=(
                existing_incident.created_at if existing_incident else time_now()
            ),
            updated_at=time_now(),
            incident_type=IncidentType.JIRA_ISSUE,
        )

    @staticmethod
    def _resolved_date(ticket: Ticket, states: List[TicketState]) -> datetime:
        # The ticket's current status is Done-category, so whichever
        # transition most recently landed it there (its own last recorded
        # transition, since states are the ticket's complete history) is
        # when it actually resolved. No states recorded at all (never
        # transitioned since sync started tracking it) falls back to the
        # ticket's own last-updated timestamp -- the same fallback
        # ticket_insights/cycle_time.py's _status_segments uses.
        if not states:
            return ticket.updated_at
        return max(states, key=lambda s: s.changed_at).changed_at

    def _ticket_url(self, ticket: Ticket) -> Optional[str]:
        if not self._site_url:
            return None
        return f"{self._site_url.rstrip('/')}/browse/{ticket.key}"

    @staticmethod
    def _adapt_org_incident_service(
        org_project: OrgProject,
        org_incident_service: Optional[OrgIncidentService],
    ) -> OrgIncidentService:
        return OrgIncidentService(
            id=org_incident_service.id if org_incident_service else uuid4_str(),
            org_id=org_project.org_id,
            provider=IncidentProvider.JIRA.value,
            name=org_project.name,
            # The org_project id, not the Jira project key -- keys aren't
            # guaranteed unique across an org's multiple Jira sites/boards
            # the way this app's own ids are. Also doubles as the
            # org_project_id the ticket-fetch query needs directly.
            key=str(org_project.id),
            meta={},
            created_at=(
                org_incident_service.created_at if org_incident_service else time_now()
            ),
            updated_at=time_now(),
            source_type=IncidentSource.JIRA_ISSUE,
        )


class _TeamIdOnly:
    """Minimal stand-in for Team -- IncidentsRepoService.get_team_incident_services
    only ever reads `.id` off what it's given."""

    def __init__(self, team_id: str):
        self.id = team_id


def get_jira_incidents_etl_handler(org_id: str) -> JiraIncidentsETLHandler:
    core_repo_service = CoreRepoService()
    site_url, email = _get_jira_site_and_email(core_repo_service, org_id)
    api_token = core_repo_service.get_access_token(org_id, UserIdentityProvider.JIRA)

    if not (site_url and email and api_token):
        LOG.error(f"Jira credentials incomplete for org {org_id}")

    return JiraIncidentsETLHandler(
        org_id,
        JiraApiService(email, api_token, site_url),
        ProjectRepoService(),
        IncidentsRepoService(),
        get_settings_service(),
        site_url,
    )


def _get_jira_site_and_email(
    core_repo_service: CoreRepoService, org_id: str
) -> Tuple[Optional[str], Optional[str]]:
    # CLUSTOX: mirrors etl_jira_handler.py's private helper of the same
    # name -- small and self-contained enough that duplicating it here
    # was preferable to reaching into that (separately-owned, already
    # in-review) module for a shared import.
    integrations = core_repo_service.get_org_integrations_for_names(
        org_id, [UserIdentityProvider.JIRA.value]
    )
    provider_meta: Dict = (integrations[0].provider_meta or {}) if integrations else {}
    return provider_meta.get("site_url"), provider_meta.get("email")
