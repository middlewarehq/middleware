from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_

from mhq.store import db, rollback_on_exc
from mhq.store.models.core import Team
from mhq.store.models.projects import (
    OrgProject,
    ProjectIssuesBookmark,
    Sprint,
    TeamProjects,
    Ticket,
    TicketState,
)


class ProjectRepoService:
    """
    Store layer for Jira (and, later, other project-tracking tools') org
    project catalog + team selection. Mirrors CodeRepoService's repo/team
    methods -- see docs/JIRA_INTEGRATION_PROPOSAL.md.
    """

    def __init__(self):
        self._db = db

    @rollback_on_exc
    def get_active_org_projects(self, org_id: str) -> List[OrgProject]:
        return (
            self._db.session.query(OrgProject)
            .filter(OrgProject.org_id == org_id, OrgProject.is_active.is_(True))
            .all()
        )

    @rollback_on_exc
    def get_projects_by_idempotency_keys(
        self, idempotency_keys: List[str]
    ) -> List[OrgProject]:
        if not idempotency_keys:
            return []

        return (
            self._db.session.query(OrgProject)
            .filter(OrgProject.idempotency_key.in_(idempotency_keys))
            .all()
        )

    @rollback_on_exc
    def get_projects_by_ids(self, ids: List[str]) -> List[OrgProject]:
        if not ids:
            return []

        return self._db.session.query(OrgProject).filter(OrgProject.id.in_(ids)).all()

    @rollback_on_exc
    def update_org_projects(self, org_projects: List[OrgProject]) -> List[OrgProject]:
        [self._db.session.merge(org_project) for org_project in org_projects]
        self._db.session.commit()
        return self.get_projects_by_ids([str(project.id) for project in org_projects])

    @rollback_on_exc
    def get_existing_team_projects(self, team: Team) -> List[TeamProjects]:
        return (
            self._db.session.query(TeamProjects)
            .filter(TeamProjects.team_id == team.id)
            .all()
        )

    @rollback_on_exc
    def get_team_projects_by_project_id_for_team(
        self, team_id: str, project_ids: List[str]
    ) -> List[TeamProjects]:
        if not project_ids:
            return []

        return (
            self._db.session.query(TeamProjects)
            .filter(
                TeamProjects.team_id == team_id,
                TeamProjects.org_project_id.in_(project_ids),
            )
            .all()
        )

    @rollback_on_exc
    def update_team_projects(self, updated_team_projects: List[TeamProjects]):
        for team_project in updated_team_projects:
            self._db.session.merge(team_project)

        self._db.session.commit()

    @rollback_on_exc
    def get_team_projects_by_team_id(self, team_id: str) -> List[TeamProjects]:
        return (
            self._db.session.query(TeamProjects)
            .filter(
                and_(
                    TeamProjects.team_id == team_id,
                    TeamProjects.is_active == True,  # noqa E712
                )
            )
            .all()
        )

    @rollback_on_exc
    def get_team_projects(self, team_id: str) -> List[OrgProject]:
        team_projects = self.get_team_projects_by_team_id(team_id)
        if not team_projects:
            return []

        project_ids = [tp.org_project_id for tp in team_projects]
        return self.get_projects_by_ids(project_ids)

    @rollback_on_exc
    def get_org_projects_used_across_teams(self, org_id: str) -> List[OrgProject]:
        """
        Active org projects that are also actively selected by at least one
        non-deleted team -- mirrors
        CodeRepoService.get_org_repos_used_across_teams, used to retire
        catalog rows nothing points at anymore.
        """
        return (
            self._db.session.query(OrgProject)
            .join(TeamProjects, TeamProjects.org_project_id == OrgProject.id)
            .join(Team, TeamProjects.team_id == Team.id)
            .filter(
                OrgProject.org_id == org_id,
                OrgProject.is_active.is_(True),
                TeamProjects.is_active.is_(True),
                Team.is_deleted.is_(False),
            )
            .all()
        )

    @rollback_on_exc
    def get_active_org_projects_for_provider(
        self, org_id: str, provider: str
    ) -> List[OrgProject]:
        return (
            self._db.session.query(OrgProject)
            .filter(
                OrgProject.org_id == org_id,
                OrgProject.is_active.is_(True),
                OrgProject.provider == provider,
            )
            .all()
        )

    # -- Tickets ------------------------------------------------------

    @rollback_on_exc
    def get_tickets_by_idempotency_keys(
        self, idempotency_keys: List[str]
    ) -> List[Ticket]:
        if not idempotency_keys:
            return []

        return (
            self._db.session.query(Ticket)
            .filter(Ticket.idempotency_key.in_(idempotency_keys))
            .all()
        )

    @rollback_on_exc
    def get_ticket_states_by_idempotency_keys(
        self, idempotency_keys: List[str]
    ) -> List[TicketState]:
        if not idempotency_keys:
            return []

        return (
            self._db.session.query(TicketState)
            .filter(TicketState.idempotency_key.in_(idempotency_keys))
            .all()
        )

    @rollback_on_exc
    def save_tickets_data(
        self, tickets: List[Ticket], ticket_states: List[TicketState]
    ):
        # One merge loop per table, one commit -- mirrors
        # CodeRepoService.save_pull_requests_data. Callers are responsible
        # for id reconciliation (reusing an existing row's id when its
        # idempotency_key already exists) before this is called -- see
        # JiraETLHandler, which does that via a single batch lookup per
        # table rather than a per-ticket query.
        [self._db.session.merge(ticket) for ticket in tickets]
        [self._db.session.merge(ticket_state) for ticket_state in ticket_states]
        self._db.session.commit()

    # -- Issue-sync bookmark -------------------------------------------

    @rollback_on_exc
    def get_project_issues_bookmark(
        self, org_project_id: str, provider: str
    ) -> Optional[ProjectIssuesBookmark]:
        return (
            self._db.session.query(ProjectIssuesBookmark)
            .filter(
                and_(
                    ProjectIssuesBookmark.org_project_id == org_project_id,
                    ProjectIssuesBookmark.provider == provider,
                )
            )
            .one_or_none()
        )

    @rollback_on_exc
    def update_project_issues_bookmark(self, bookmark: ProjectIssuesBookmark):
        self._db.session.merge(bookmark)
        self._db.session.commit()

    @rollback_on_exc
    def get_all_org_project_issues_bookmarks(
        self, org_id: str
    ) -> List[ProjectIssuesBookmark]:
        return (
            self._db.session.query(ProjectIssuesBookmark)
            .join(OrgProject, OrgProject.id == ProjectIssuesBookmark.org_project_id)
            .filter(OrgProject.org_id == org_id)
            .all()
        )

    @rollback_on_exc
    def update_project_issues_bookmarks(
        self, bookmarks: List[ProjectIssuesBookmark]
    ):
        for bookmark in bookmarks:
            self._db.session.merge(bookmark)
        self._db.session.commit()

    # -- Ticket cycle time (Phase 4, §6C) ------------------------------

    @rollback_on_exc
    def get_tickets_with_states_for_projects(
        self,
        org_project_ids: List[str],
        from_time: datetime,
        to_time: datetime,
    ) -> Tuple[List[Ticket], List[TicketState]]:
        """
        Completed tickets (status_category == "Done" -- Jira Cloud's 3
        category names are fixed, not customizable per workflow, unlike
        individual status names) updated within [from_time, to_time] for
        the given projects, plus every TicketState for those tickets (not
        clipped to the window -- a ticket's full status history is needed
        to compute its time-in-status correctly). Two queries total
        regardless of how many tickets/states exist, not one per ticket.

        Only completed tickets: an open ticket has no bounded end time,
        and including it would let a single item sitting untouched in a
        backlog for months dominate a cycle-time average with a duration
        that has nothing to do with how long finished work actually took
        -- see compute_cycle_time_by_project's own docstring for the
        concrete case that surfaced this.
        """
        if not org_project_ids:
            return [], []

        tickets = (
            self._db.session.query(Ticket)
            .filter(
                Ticket.org_project_id.in_(org_project_ids),
                Ticket.status_category == "Done",
                Ticket.updated_at.between(from_time, to_time),
            )
            .all()
        )
        if not tickets:
            return [], []

        ticket_ids = [ticket.id for ticket in tickets]
        ticket_states = (
            self._db.session.query(TicketState)
            .filter(TicketState.ticket_id.in_(ticket_ids))
            .order_by(TicketState.changed_at.asc())
            .all()
        )
        return tickets, ticket_states

    # -- Sprints (§6D) --------------------------------------------------

    @rollback_on_exc
    def get_sprints_by_idempotency_keys(
        self, idempotency_keys: List[str]
    ) -> List[Sprint]:
        if not idempotency_keys:
            return []

        return (
            self._db.session.query(Sprint)
            .filter(Sprint.idempotency_key.in_(idempotency_keys))
            .all()
        )

    @rollback_on_exc
    def save_sprints(self, sprints: List[Sprint]):
        for sprint in sprints:
            self._db.session.merge(sprint)
        self._db.session.commit()

    @rollback_on_exc
    def get_sprints_for_projects(
        self, org_project_ids: List[str], limit: int
    ) -> List[Sprint]:
        """
        Most recent `limit` sprints (by start_date, nulls last -- a
        sprint that somehow synced with no start_date shouldn't crowd
        out real, dated ones) across the given projects, for the Sprint
        rollup chart. Most-recent-first at the query level so a caller
        capping to "last N" always gets the N that actually matter, not
        an arbitrary N out of however many exist.
        """
        if not org_project_ids:
            return []

        return (
            self._db.session.query(Sprint)
            .filter(Sprint.org_project_id.in_(org_project_ids))
            .order_by(Sprint.start_date.desc().nullslast())
            .limit(limit)
            .all()
        )
