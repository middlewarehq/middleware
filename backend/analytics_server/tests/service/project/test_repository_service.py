from unittest.mock import MagicMock

import pytest

from mhq.service.project.models.org_project import RawTeamOrgProject
from mhq.service.project.repository_service import ProjectService
from mhq.store.models.projects import OrgProject, TeamProjects

# CLUSTOX: Jira integration, Phase 2 (project selection). Mirrors this
# repo's existing service-layer test style (fake/mock collaborators, no
# real DB -- see tests/service/code/test_lead_time_service.py) since this
# codebase has no DB-backed test fixture to hook a store-layer integration
# test into. See docs/JIRA_INTEGRATION_PROPOSAL.md.


class FakeTeam:
    def __init__(self, id="team-1", org_id="org-1"):
        self.id = id
        self.org_id = org_id


def _raw(
    team_id="team-1",
    key="PAY",
    name="Payments",
    idempotency_key="jira:org-1:10001",
    provider="jira",
) -> RawTeamOrgProject:
    return RawTeamOrgProject(
        team_id=team_id,
        provider=provider,
        key=key,
        name=name,
        idempotency_key=idempotency_key,
    )


def _service(project_repo_service=None) -> ProjectService:
    return ProjectService(project_repo_service or MagicMock())


def test_creates_a_new_org_project_for_an_unseen_idempotency_key():
    repo = MagicMock()
    repo.get_projects_by_idempotency_keys.return_value = []
    repo.update_org_projects.side_effect = lambda projects: projects
    repo.get_existing_team_projects.return_value = []
    repo.get_active_org_projects.return_value = []
    repo.get_org_projects_used_across_teams.return_value = []

    team = FakeTeam()
    raw = _raw()

    result = _service(repo).update_team_projects(team, [raw])

    assert len(result) == 1
    created = result[0]
    assert str(created.org_id) == team.org_id
    assert created.key == raw.key
    assert created.name == raw.name
    assert created.idempotency_key == raw.idempotency_key
    assert created.is_active is True


def test_reuses_and_reactivates_an_existing_org_project_matched_by_idempotency_key():
    # Previously unselected by every team (is_active=False) and, per the
    # incoming payload, renamed/rekeyed in Jira since we last saw it.
    existing = OrgProject(
        id="proj-1",
        org_id="org-1",
        key="OLD-KEY",
        name="Old Name",
        provider="jira",
        idempotency_key="jira:org-1:10001",
        is_active=False,
    )
    repo = MagicMock()
    repo.get_projects_by_idempotency_keys.return_value = [existing]
    repo.update_org_projects.side_effect = lambda projects: projects
    repo.get_existing_team_projects.return_value = []
    repo.get_active_org_projects.return_value = [existing]
    repo.get_org_projects_used_across_teams.return_value = [existing]

    team = FakeTeam()
    raw = _raw(key="PAY", name="Payments")

    result = _service(repo).update_team_projects(team, [raw])

    # Reused, not duplicated into a second OrgProject row.
    assert result == [existing]
    assert existing.key == "PAY"
    assert existing.name == "Payments"
    assert existing.is_active is True


def test_raises_if_the_same_idempotency_key_already_belongs_to_a_different_org():
    # Same construction as OrgRepo's cross-org idempotency-key guard --
    # this should never happen in practice (idempotency_key is scoped by
    # org_id, see the migration comment), but a match across orgs means
    # something is badly wrong and must fail loudly, not silently adopt
    # another org's project row.
    existing = OrgProject(
        id="proj-1",
        org_id="some-other-org",
        key="PAY",
        name="Payments",
        provider="jira",
        idempotency_key="jira:org-1:10001",
        is_active=True,
    )
    repo = MagicMock()
    repo.get_projects_by_idempotency_keys.return_value = [existing]

    team = FakeTeam(org_id="org-1")

    with pytest.raises(Exception):
        _service(repo).update_team_projects(team, [_raw()])


def test_deselecting_every_project_deactivates_the_teams_link_and_the_org_catalog_row():
    org_project = OrgProject(
        id="proj-1",
        org_id="org-1",
        key="PAY",
        name="Payments",
        provider="jira",
        idempotency_key="jira:org-1:10001",
        is_active=True,
    )
    existing_team_project = TeamProjects(
        team_id="team-1", org_project_id="proj-1", is_active=True
    )
    repo = MagicMock()
    repo.get_projects_by_idempotency_keys.return_value = []
    repo.update_org_projects.side_effect = lambda projects: projects
    repo.get_existing_team_projects.return_value = [existing_team_project]
    repo.get_active_org_projects.return_value = [org_project]
    # Not used by any team anymore -- this was the only one.
    repo.get_org_projects_used_across_teams.return_value = []

    team = FakeTeam()

    result = _service(repo).update_team_projects(team, [])

    assert result == []
    # The deactivation itself is what matters -- *not* which exact list
    # object gets passed to update_team_projects. existing_team_project
    # came back from get_existing_team_projects already attached to the
    # store's session (same as CodeRepoService.get_existing_team_repos),
    # so mutating it here is enough for the next real commit to persist
    # it regardless of whether it's also in this particular call's list --
    # mirrors RepositoryService._update_team_repos exactly.
    assert existing_team_project.is_active is False
    repo.update_team_projects.assert_called_once()
    # Nothing points at it anymore, so the org-level catalog row itself is
    # retired too, not just this team's link to it -- mirrors
    # CodeRepoService.set_unused_repos_as_inactive.
    assert org_project.is_active is False


def test_a_second_team_selecting_an_already_active_project_does_not_touch_the_first_teams_link():
    org_project = OrgProject(
        id="proj-1",
        org_id="org-1",
        key="PAY",
        name="Payments",
        provider="jira",
        idempotency_key="jira:org-1:10001",
        is_active=True,
    )
    repo = MagicMock()
    repo.get_projects_by_idempotency_keys.return_value = [org_project]
    repo.update_org_projects.side_effect = lambda projects: projects
    # This team (team-2) has no existing rows of its own yet.
    repo.get_existing_team_projects.return_value = []
    repo.get_active_org_projects.return_value = [org_project]
    repo.get_org_projects_used_across_teams.return_value = [org_project]

    team_two = FakeTeam(id="team-2", org_id="org-1")

    _service(repo).update_team_projects(team_two, [_raw()])

    created_team_projects = repo.update_team_projects.call_args[0][0]
    assert len(created_team_projects) == 1
    assert str(created_team_projects[0].team_id) == "team-2"
    assert str(created_team_projects[0].org_project_id) == "proj-1"
