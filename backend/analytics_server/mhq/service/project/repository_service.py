from typing import Dict, List

from mhq.service.project.models.org_project import RawTeamOrgProject
from mhq.store.models.core import Team
from mhq.store.models.projects import OrgProject
from mhq.store.repos.projects import ProjectRepoService, TeamProjects
from mhq.utils.string import uuid4_str


class ProjectService:
    """
    Business layer for a team's selected project-tracking-tool projects
    (Jira, to start). Mirrors RepositoryService's repo/team methods, minus
    the incident-service coupling that's specific to code repos -- see
    docs/JIRA_INTEGRATION_PROPOSAL.md for the phase this belongs to.
    """

    def __init__(self, project_repo_service: ProjectRepoService):
        self._project_repo_service = project_repo_service

    def get_team_projects(self, team: Team) -> List[OrgProject]:
        return self._project_repo_service.get_team_projects(team_id=str(team.id))

    def get_project_id_team_projects_map(
        self, team: Team, org_projects: List[OrgProject]
    ) -> Dict[str, TeamProjects]:
        project_ids = [str(project.id) for project in org_projects]
        team_projects: List[TeamProjects] = (
            self._project_repo_service.get_team_projects_by_project_id_for_team(
                team.id, project_ids
            )
        )
        return {str(tp.org_project_id): tp for tp in team_projects}

    def update_team_projects(
        self, team: Team, raw_org_projects: List[RawTeamOrgProject]
    ) -> List[OrgProject]:
        updated_projects = self._update_org_projects(team.org_id, raw_org_projects)
        self._update_team_projects(team, updated_projects, raw_org_projects)
        self._set_unused_projects_as_inactive(team.org_id)

        return updated_projects

    def _update_org_projects(
        self, org_id: str, raw_org_projects: List[RawTeamOrgProject]
    ) -> List[OrgProject]:
        idempotency_keys = [project.idempotency_key for project in raw_org_projects]

        # One batch lookup for all incoming projects, not one query per
        # project -- avoids the per-item DB round trip this would otherwise
        # cost (see docs/JIRA_INTEGRATION_PROPOSAL.md's review notes).
        existing_org_projects = (
            self._project_repo_service.get_projects_by_idempotency_keys(
                idempotency_keys
            )
        )
        idempotency_key_to_project_map = {
            project.idempotency_key: project for project in existing_org_projects
        }

        updated_org_projects = []
        for raw_project in raw_org_projects:
            existing_project = idempotency_key_to_project_map.get(
                raw_project.idempotency_key
            )
            if existing_project:
                if str(existing_project.org_id) != str(org_id):
                    raise Exception(
                        "Data integrity error, matching idempotency key across "
                        f"orgs. Team OrgId: {str(org_id)}. Existing Project "
                        f"OrgID: {str(existing_project.org_id)}. "
                        f"idempotency_key: {raw_project.idempotency_key}"
                    )

                existing_project.is_active = True
                existing_project.key = raw_project.key
                existing_project.name = raw_project.name
                updated_org_projects.append(existing_project)
            else:
                updated_org_projects.append(
                    OrgProject(
                        id=uuid4_str(),
                        org_id=org_id,
                        key=raw_project.key,
                        name=raw_project.name,
                        provider=raw_project.provider,
                        idempotency_key=raw_project.idempotency_key,
                        # Explicit rather than relying on the column's
                        # SQLAlchemy-level default -- that default only
                        # materializes on this instance once it's actually
                        # flushed through a real DB session, which makes
                        # the object momentarily wrong (is_active=None) to
                        # anything inspecting it beforehand.
                        is_active=True,
                    )
                )

        return self._project_repo_service.update_org_projects(updated_org_projects)

    def _update_team_projects(
        self,
        team: Team,
        updated_org_projects: List[OrgProject],
        raw_projects_data: List[RawTeamOrgProject],
    ):
        existing_team_projects = self._project_repo_service.get_existing_team_projects(
            team
        )
        for team_project in existing_team_projects:
            team_project.is_active = False

        project_id_to_team_project_map = {
            str(tp.org_project_id): tp for tp in existing_team_projects
        }
        idempotency_key_raw_project_map = {
            raw.idempotency_key: raw for raw in raw_projects_data
        }

        updated_team_projects = []
        for project in updated_org_projects:
            team_project = project_id_to_team_project_map.get(str(project.id))
            # Every project in updated_org_projects came from raw_projects_data
            # (see _update_org_projects), so this lookup should never miss --
            # asserting rather than silently defaulting surfaces a broken
            # idempotency_key match instead of writing a mystery row.
            assert idempotency_key_raw_project_map.get(project.idempotency_key)

            if team_project:
                team_project.is_active = True
            else:
                team_project = TeamProjects(
                    team_id=team.id,
                    org_project_id=str(project.id),
                )

            updated_team_projects.append(team_project)

        self._project_repo_service.update_team_projects(updated_team_projects)

    def _set_unused_projects_as_inactive(self, org_id: str) -> List[OrgProject]:
        active_projects = self._project_repo_service.get_active_org_projects(org_id)
        active_projects_used_across_teams = (
            self._project_repo_service.get_org_projects_used_across_teams(org_id)
        )
        active_used_ids = {
            str(project.id) for project in active_projects_used_across_teams
        }

        for project in active_projects:
            if str(project.id) not in active_used_ids:
                project.is_active = False

        return self._project_repo_service.update_org_projects(active_projects)


def get_project_service() -> ProjectService:
    return ProjectService(ProjectRepoService())
