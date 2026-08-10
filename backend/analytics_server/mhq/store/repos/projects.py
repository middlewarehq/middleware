from typing import List

from sqlalchemy import and_

from mhq.store import db, rollback_on_exc
from mhq.store.models.core import Team
from mhq.store.models.projects import OrgProject, TeamProjects


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
