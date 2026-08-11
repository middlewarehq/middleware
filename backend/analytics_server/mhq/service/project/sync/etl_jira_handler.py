from datetime import datetime
from typing import Dict, List, Tuple

from mhq.exapi.jira import JiraApiService
from mhq.exapi.models.jira import JiraChangelogEntry, JiraIssue
from mhq.service.project.sync.etl_provider_handler import ProjectProviderETLHandler
from mhq.store.models import UserIdentityProvider
from mhq.store.models.projects import OrgProject, Ticket, TicketState
from mhq.store.repos.core import CoreRepoService
from mhq.store.repos.projects import ProjectRepoService
from mhq.utils.log import LOG
from mhq.utils.string import uuid4_str


class JiraETLHandler(ProjectProviderETLHandler):
    def __init__(
        self,
        org_id: str,
        jira_api_service: JiraApiService,
        project_repo_service: ProjectRepoService,
    ):
        self.org_id = org_id
        self._api = jira_api_service
        self._project_repo_service = project_repo_service

    def check_pat_validity(self) -> bool:
        return self._api.check_pat()

    def get_project_issues_data(
        self, org_project: OrgProject, bookmark: datetime
    ) -> Tuple[List[Ticket], List[TicketState]]:
        # JQL's own "updated >=" filter does the incremental narrowing
        # server-side (same idea as GitLab's updated_after param) rather
        # than fetching everything and truncating client-side the way the
        # GitHub PR sync has to.
        jql = (
            f'project = "{org_project.key}" '
            f'AND updated >= "{bookmark.strftime("%Y-%m-%d %H:%M")}" '
            f"ORDER BY updated ASC"
        )
        jira_issues = self._api.get_all_issues(jql)
        if not jira_issues:
            return [], []

        tickets = self._to_tickets(org_project, jira_issues)
        ticket_states = self._to_ticket_states(tickets, jira_issues)
        return tickets, ticket_states

    def _to_tickets(
        self, org_project: OrgProject, jira_issues: List[JiraIssue]
    ) -> List[Ticket]:
        idempotency_keys = [
            self._ticket_idempotency_key(issue) for issue in jira_issues
        ]
        # One batch lookup for every ticket in this page, not one query
        # per ticket -- avoids the per-item DB round trip the existing
        # GitHub PR sync pays (get_repo_pr_by_number, called once per PR).
        existing_id_by_key = {
            ticket.idempotency_key: ticket.id
            for ticket in self._project_repo_service.get_tickets_by_idempotency_keys(
                idempotency_keys
            )
        }

        return [
            Ticket(
                id=existing_id_by_key.get(idempotency_key, uuid4_str()),
                org_project_id=org_project.id,
                key=issue.key,
                provider=UserIdentityProvider.JIRA.value,
                status=issue.status,
                status_category=issue.status_category,
                idempotency_key=idempotency_key,
                data=issue.data,
                created_at=issue.created,
                updated_at=issue.updated,
            )
            for issue, idempotency_key in zip(jira_issues, idempotency_keys)
        ]

    def _to_ticket_states(
        self, tickets: List[Ticket], jira_issues: List[JiraIssue]
    ) -> List[TicketState]:
        entries_by_ticket: List[Tuple[Ticket, JiraChangelogEntry]] = [
            (ticket, entry)
            for ticket, issue in zip(tickets, jira_issues)
            for entry in issue.changelog
        ]
        if not entries_by_ticket:
            return []

        idempotency_keys = [
            self._ticket_state_idempotency_key(ticket, entry)
            for ticket, entry in entries_by_ticket
        ]
        existing_id_by_key = {
            state.idempotency_key: state.id
            for state in self._project_repo_service.get_ticket_states_by_idempotency_keys(
                idempotency_keys
            )
        }

        return [
            TicketState(
                id=existing_id_by_key.get(idempotency_key, uuid4_str()),
                ticket_id=ticket.id,
                from_status=entry.from_status,
                to_status=entry.to_status,
                changed_at=entry.changed_at,
                idempotency_key=idempotency_key,
                data=entry.data,
            )
            for (ticket, entry), idempotency_key in zip(
                entries_by_ticket, idempotency_keys
            )
        ]

    def _ticket_idempotency_key(self, issue: JiraIssue) -> str:
        # Scoped by org_id, not the bare Jira issue id -- same reasoning as
        # OrgProject's idempotency_key: each org's Jira site is
        # independent, so two orgs' sites can land on the same id.
        return f"jira:{self.org_id}:{issue.id}"

    def _ticket_state_idempotency_key(
        self, ticket: Ticket, entry: JiraChangelogEntry
    ) -> str:
        return f"{ticket.idempotency_key}:{entry.idempotency_key}"


def get_jira_etl_handler(org_id: str) -> JiraETLHandler:
    core_repo_service = CoreRepoService()
    site_url, email = _get_jira_site_and_email(core_repo_service, org_id)
    api_token = core_repo_service.get_access_token(org_id, UserIdentityProvider.JIRA)

    if not (site_url and email and api_token):
        LOG.error(f"Jira credentials incomplete for org {org_id}")

    return JiraETLHandler(
        org_id,
        JiraApiService(email, api_token, site_url),
        ProjectRepoService(),
    )


def _get_jira_site_and_email(
    core_repo_service: CoreRepoService, org_id: str
) -> Tuple[str, str]:
    integrations = core_repo_service.get_org_integrations_for_names(
        org_id, [UserIdentityProvider.JIRA.value]
    )
    provider_meta: Dict = (integrations[0].provider_meta or {}) if integrations else {}
    return provider_meta.get("site_url"), provider_meta.get("email")
