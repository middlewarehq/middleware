from datetime import datetime, timezone
from typing import List

from mhq.store.models.core import Team
from mhq.store.models.projects import Sprint
from mhq.store.repos.projects import ProjectRepoService

# CLUSTOX: Jira integration -- the Sprint rollup chart (docs/
# JIRA_INTEGRATION_PROPOSAL.md §6D). "Planned vs. shipped, per sprint" --
# no date-range scoping like ticket_insights/lead_time have, since a
# sprint's own start/end dates are its natural window; the DORA Metrics
# page's selected period doesn't apply here.
DEFAULT_SPRINT_LIMIT = 6


class SprintService:
    def __init__(self, project_repo_service: ProjectRepoService):
        self._project_repo_service = project_repo_service

    def get_team_sprints(
        self, team: Team, limit: int = DEFAULT_SPRINT_LIMIT
    ) -> List[Sprint]:
        org_projects = self._project_repo_service.get_team_projects(str(team.id))
        project_ids = [str(project.id) for project in org_projects]

        # The repo query orders most-recent-first so a `limit` always
        # keeps the N sprints that matter, not an arbitrary N out of
        # however many exist -- re-sorted ascending here since a rollup
        # chart reads left-to-right, oldest to newest.
        sprints = self._project_repo_service.get_sprints_for_projects(
            project_ids, limit
        )
        # tz-aware fallback -- sprint.start_date, when present, is
        # tz-aware (dt_from_iso_time_string always attaches an offset);
        # a naive datetime.max here would raise on comparison against a
        # real, tz-aware sprint date the moment both appear in the same
        # sort.
        undated_sorts_last = datetime.max.replace(tzinfo=timezone.utc)
        return sorted(
            sprints, key=lambda sprint: sprint.start_date or undated_sorts_last
        )


def get_sprint_service() -> SprintService:
    return SprintService(ProjectRepoService())
