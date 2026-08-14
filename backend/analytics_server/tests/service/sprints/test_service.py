from datetime import datetime, timezone
from unittest.mock import MagicMock

from mhq.service.sprints.service import SprintService
from mhq.store.models.core import Team

# tz-aware, matching real Jira dates (dt_from_iso_time_string always
# attaches an offset) -- a naive datetime here wouldn't have caught the
# real "datetime.max has no tzinfo" bug this file's tests found.
_UTC = timezone.utc

# CLUSTOX: Jira integration -- the Sprint rollup chart. See
# docs/JIRA_INTEGRATION_PROPOSAL.md §6D.


def _sprint(name, start_date):
    sprint = MagicMock()
    sprint.name = name
    sprint.start_date = start_date
    return sprint


def _service(repo=None) -> SprintService:
    return SprintService(repo or MagicMock())


class TestGetTeamSprints:
    def test_scopes_the_lookup_to_the_teams_tracked_projects(self):
        repo = MagicMock()
        repo.get_team_projects.return_value = [
            MagicMock(id="proj-1"),
            MagicMock(id="proj-2"),
        ]
        repo.get_sprints_for_projects.return_value = []

        _service(repo).get_team_sprints(Team(id="team-1"))

        looked_up_project_ids = repo.get_sprints_for_projects.call_args[0][0]
        assert set(looked_up_project_ids) == {"proj-1", "proj-2"}

    def test_passes_the_limit_through_to_the_repo_query(self):
        repo = MagicMock()
        repo.get_team_projects.return_value = []
        repo.get_sprints_for_projects.return_value = []

        _service(repo).get_team_sprints(Team(id="team-1"), limit=3)

        assert repo.get_sprints_for_projects.call_args[0][1] == 3

    def test_returns_sprints_oldest_first_for_a_left_to_right_chart(self):
        repo = MagicMock()
        repo.get_team_projects.return_value = []
        repo.get_sprints_for_projects.return_value = [
            _sprint("Sprint 3", datetime(2024, 3, 1, tzinfo=_UTC)),
            _sprint("Sprint 1", datetime(2024, 1, 1, tzinfo=_UTC)),
            _sprint("Sprint 2", datetime(2024, 2, 1, tzinfo=_UTC)),
        ]

        sprints = _service(repo).get_team_sprints(Team(id="team-1"))

        assert [s.name for s in sprints] == ["Sprint 1", "Sprint 2", "Sprint 3"]

    def test_a_sprint_with_no_start_date_sorts_last_rather_than_erroring(self):
        # Real sprint dates are tz-aware -- a naive fallback for the
        # undated sprint would raise here, not just sort wrong, the
        # moment it's compared against a real one.
        repo = MagicMock()
        repo.get_team_projects.return_value = []
        repo.get_sprints_for_projects.return_value = [
            _sprint("Dated", datetime(2024, 1, 1, tzinfo=_UTC)),
            _sprint("Undated", None),
        ]

        sprints = _service(repo).get_team_sprints(Team(id="team-1"))

        assert [s.name for s in sprints] == ["Dated", "Undated"]
