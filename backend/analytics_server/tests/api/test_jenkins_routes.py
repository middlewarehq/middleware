from typing import List, Optional
from unittest.mock import MagicMock, patch

import pytest
import requests
from flask import Flask
from sqlalchemy.exc import IntegrityError

from mhq.api import integrations as integrations_module
from mhq.api.integrations import (
    deactivate_deployment_workflows_for_repo,
    reactivate_github_actions_workflows_for_repo,
)
from mhq.store.models.code import RepoWorkflowProviders, RepoWorkflowType
from mhq.utils.string import uuid4_str

ORG_ID = "11111111-1111-4111-8111-111111111111"
OTHER_ORG_ID = "22222222-2222-4222-8222-222222222222"
REPO_ID = "33333333-3333-4333-8333-333333333333"


class FakeWorkflow:
    def __init__(
        self,
        provider,
        is_active=True,
        org_repo_id=REPO_ID,
        provider_workflow_id="deploy-api",
        type=RepoWorkflowType.DEPLOYMENT,
        id=None,
    ):
        self.id = id or uuid4_str()
        self.provider = provider
        self.is_active = is_active
        self.org_repo_id = org_repo_id
        self.provider_workflow_id = provider_workflow_id
        self.type = type
        self.name = provider_workflow_id
        # Matches the column default on RepoWorkflow: a row written before the
        # displaced-workflow record existed carries no dict at all.
        self.meta = None


def test_deactivates_every_active_deployment_workflow_whatever_the_provider():
    workflows = [
        FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS),
        FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS),
        FakeWorkflow(RepoWorkflowProviders.JENKINS),
    ]

    deactivated = deactivate_deployment_workflows_for_repo(workflows)

    # One active deployment source per repo is the invariant. Leaving the
    # Jenkins row active -- as the GitHub-only version did -- lets a repo end
    # up mapped to two Jenkins jobs and count every deploy twice.
    assert deactivated == workflows
    assert [w.is_active for w in workflows] == [False, False, False]


def test_deactivating_is_idempotent():
    workflows = [FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, is_active=False)]

    deactivated = deactivate_deployment_workflows_for_repo(workflows)

    # Already inactive, so nothing changed and nothing is reported -- and,
    # crucially, nothing is recorded as displaced, because it was not.
    assert deactivated == []


def test_reactivates_only_the_inactive_workflows_the_mapping_displaced():
    displaced = FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, is_active=False)
    deselected = FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, is_active=False)
    already_on = FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, is_active=True)
    jenkins = FakeWorkflow(RepoWorkflowProviders.JENKINS, is_active=False)

    reactivated = reactivate_github_actions_workflows_for_repo(
        [displaced, deselected, already_on, jenkins], [displaced.id]
    )

    assert reactivated == [displaced]
    assert displaced.is_active is True
    # Inactive because the admin deselected it in the team config, not because
    # the Jenkins mapping touched it. Turning it on is a deployment the repo
    # never had.
    assert deselected.is_active is False
    assert already_on.is_active is True
    assert jenkins.is_active is False


def test_reactivates_nothing_when_the_mapping_recorded_no_displacement():
    # A mapping created before the displaced-workflow record existed. Restoring
    # nothing is the safe reading: too few active sources under-reports
    # visibly, too many over-reports silently.
    github = FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, is_active=False)

    assert reactivate_github_actions_workflows_for_repo([github], None) == []
    assert github.is_active is False


class FakeOrgRepo:
    def __init__(self, repo_id=REPO_ID, org_id=ORG_ID):
        self.id = repo_id
        self.org_id = org_id


class FakeWorkflowRepoService:
    """
    In-memory stand-in that reproduces the two database behaviours these routes
    depend on: get_repo_workflow_by_repo_ids returns only active rows, and the
    (org_repo_id, provider_workflow_id) pair is uniquely indexed
    (repoworkflow_orgrepoid_provider_workflow_id), so a second insert for a
    pair that already has a row raises IntegrityError.
    """

    def __init__(self, workflows: Optional[List[FakeWorkflow]] = None):
        self.workflows = list(workflows or [])

    def get_repo_workflow_by_repo_ids(self, repo_ids, type) -> List[FakeWorkflow]:
        return [
            w
            for w in self.workflows
            if str(w.org_repo_id) in [str(r) for r in repo_ids]
            and w.type == type
            and w.is_active
        ]

    def get_repo_workflow_by_repo_id_and_provider_workflow_id(
        self, repo_id, provider_workflow_id
    ) -> Optional[FakeWorkflow]:
        # Matches repoworkflow_orgrepoid_provider_workflow_id, which is not
        # scoped by provider -- so neither is this.
        for w in self.workflows:
            if (
                str(w.org_repo_id) == str(repo_id)
                and w.provider_workflow_id == provider_workflow_id
            ):
                return w
        return None

    def get_repo_workflows_by_repo_id_and_provider(
        self, repo_id, provider, type
    ) -> List[FakeWorkflow]:
        return [
            w
            for w in self.workflows
            if str(w.org_repo_id) == str(repo_id)
            and w.provider == provider
            and w.type == type
        ]

    def get_repo_workflow_by_id(self, repo_workflow_id) -> Optional[FakeWorkflow]:
        for w in self.workflows:
            if str(w.id) == str(repo_workflow_id):
                return w
        return None

    def create_jenkins_repo_workflow(self, jenkins_workflow, workflows_to_deactivate):
        if jenkins_workflow not in self.workflows:
            for w in self.workflows:
                if (
                    str(w.org_repo_id) == str(jenkins_workflow.org_repo_id)
                    and w.provider_workflow_id == jenkins_workflow.provider_workflow_id
                ):
                    raise IntegrityError(
                        'duplicate key value violates unique constraint "'
                        'repoworkflow_orgrepoid_provider_workflow_id"',
                        None,
                        Exception(),
                    )
            # The database assigns the primary key on insert.
            if getattr(jenkins_workflow, "id", None) is None:
                jenkins_workflow.id = uuid4_str()
            self.workflows.append(jenkins_workflow)
        return jenkins_workflow

    def deactivate_repo_workflow(self, repo_workflow, workflows_to_reactivate=None):
        repo_workflow.is_active = False
        return repo_workflow

    @property
    def active_deployment_workflows(self) -> List[FakeWorkflow]:
        return [w for w in self.workflows if w.is_active]


def _build_client():
    app = Flask(__name__)
    app.register_blueprint(integrations_module.app)
    return app.test_client()


@pytest.fixture
def routes(request):
    """
    Wires the two Jenkins mapping routes to in-memory services. The repo lookup
    resolves REPO_ID into ORG_ID unless the test overrides it.
    """
    workflow_repo_service = FakeWorkflowRepoService(getattr(request, "param", None))
    code_repo_service = MagicMock()
    code_repo_service.get_repo_by_id.side_effect = lambda repo_id: (
        FakeOrgRepo(repo_id=repo_id) if str(repo_id) == REPO_ID else None
    )

    with patch.object(
        integrations_module, "get_query_validator", return_value=MagicMock()
    ), patch.object(
        integrations_module, "CodeRepoService", return_value=code_repo_service
    ), patch.object(
        integrations_module, "WorkflowRepoService", return_value=workflow_repo_service
    ):
        yield _build_client(), workflow_repo_service


def _map(client, job_full_name, org_id=ORG_ID, repo_id=REPO_ID):
    return client.post(
        f"/orgs/{org_id}/integrations/jenkins/mappings",
        json={"org_repo_id": repo_id, "job_full_name": job_full_name},
    )


def _unmap(client, repo_workflow_id, org_id=ORG_ID):
    return client.delete(
        f"/orgs/{org_id}/integrations/jenkins/mappings",
        json={"repo_workflow_id": str(repo_workflow_id)},
    )


def test_mapping_a_second_job_leaves_exactly_one_active_deployment_source(routes):
    client, service = routes

    assert _map(client, "deploy-api").status_code == 200
    # The wrong job first, then the right one -- two clicks, no warning in the
    # UI the second time round.
    assert _map(client, "deploy-api-v2").status_code == 200

    active = service.active_deployment_workflows
    assert [w.provider_workflow_id for w in active] == ["deploy-api-v2"]


@pytest.mark.parametrize(
    "routes",
    [[FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, provider_workflow_id="9931")]],
    indirect=True,
)
def test_mapping_deactivates_the_repos_github_actions_workflow(routes):
    client, service = routes

    response = _map(client, "deploy-api")

    assert response.status_code == 200
    assert response.json["deactivated_workflows"] == 1
    active = service.active_deployment_workflows
    assert [w.provider for w in active] == [RepoWorkflowProviders.JENKINS]


@pytest.mark.parametrize(
    "routes",
    [[FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, provider_workflow_id="9931")]],
    indirect=True,
)
def test_unmapping_restores_the_github_actions_workflow(routes):
    client, service = routes
    _map(client, "deploy-api")
    jenkins_workflow = service.get_repo_workflow_by_repo_id_and_provider_workflow_id(
        REPO_ID, "deploy-api"
    )

    response = _unmap(client, jenkins_workflow.id)

    assert response.status_code == 200
    assert response.json["reactivated_github_workflows"] == 1
    # The repo is back to exactly one active deployment source: the GitHub
    # Actions workflow the mapping displaced. Without this the repo has none,
    # and its Deployment Frequency stays at zero.
    active = service.active_deployment_workflows
    assert [w.provider for w in active] == [RepoWorkflowProviders.GITHUB_ACTIONS]


@pytest.mark.parametrize(
    "routes",
    [
        [
            FakeWorkflow(
                RepoWorkflowProviders.GITHUB_ACTIONS, provider_workflow_id="9931"
            ),
        ]
        + [
            FakeWorkflow(
                RepoWorkflowProviders.GITHUB_ACTIONS,
                provider_workflow_id=str(9932 + offset),
                is_active=False,
            )
            for offset in range(4)
        ]
    ],
    indirect=True,
)
def test_unmapping_leaves_deselected_github_actions_workflows_inactive(routes):
    """
    One selected GitHub Actions deployment workflow and four the admin
    deselected. teams/v2.ts deactivates all of a repo's deployment workflows
    and re-enables only the selected ones, so those four sit inactive for a
    reason that has nothing to do with Jenkins. Mapping switches off exactly
    one row, so unmapping must switch on exactly one row -- restoring all five
    gives the repo five active deployment sources and inflates Deployment
    Frequency fivefold, which is the double-counting the invariant exists to
    prevent, reached through the GitHub path instead of the Jenkins one.
    """
    client, service = routes
    selected = service.workflows[0]
    deselected = service.workflows[1:]

    assert _map(client, "deploy-api").json["deactivated_workflows"] == 1
    jenkins_workflow = service.get_repo_workflow_by_repo_id_and_provider_workflow_id(
        REPO_ID, "deploy-api"
    )
    # Only the row the mapping actually switched off is recorded as displaced.
    assert jenkins_workflow.meta["jenkins_displaced_workflow_ids"] == [str(selected.id)]

    response = _unmap(client, jenkins_workflow.id)

    assert response.status_code == 200
    assert response.json["reactivated_github_workflows"] == 1
    assert selected.is_active is True
    assert [w.is_active for w in deselected] == [False, False, False, False]
    active = service.active_deployment_workflows
    assert [w.provider_workflow_id for w in active] == ["9931"]


@pytest.mark.parametrize(
    "routes",
    [
        [
            FakeWorkflow(
                RepoWorkflowProviders.JENKINS, provider_workflow_id="deploy-api"
            ),
            FakeWorkflow(
                RepoWorkflowProviders.GITHUB_ACTIONS,
                provider_workflow_id="9931",
                is_active=False,
            ),
        ]
    ],
    indirect=True,
)
def test_unmapping_a_mapping_with_no_displacement_record_restores_nothing(routes):
    # A mapping written before the record existed. There is no way to tell
    # which rows it displaced, and guessing "all the inactive ones" is how the
    # over-restore happened in the first place.
    client, service = routes
    jenkins_workflow, github_workflow = service.workflows
    assert jenkins_workflow.meta is None

    response = _unmap(client, jenkins_workflow.id)

    assert response.status_code == 200
    assert response.json["reactivated_github_workflows"] == 0
    assert github_workflow.is_active is False


def test_remapping_the_same_job_after_unmapping_does_not_hit_the_unique_index(routes):
    client, service = routes
    assert _map(client, "deploy-api").status_code == 200
    jenkins_workflow = service.get_repo_workflow_by_repo_id_and_provider_workflow_id(
        REPO_ID, "deploy-api"
    )
    assert _unmap(client, jenkins_workflow.id).status_code == 200

    # This used to insert a second row for the same
    # (org_repo_id, provider_workflow_id) pair, raising IntegrityError -> 500.
    response = _map(client, "deploy-api")

    assert response.status_code == 200
    assert len(service.workflows) == 1
    assert service.workflows[0].is_active is True


@pytest.mark.parametrize(
    "routes",
    [
        [
            FakeWorkflow(
                RepoWorkflowProviders.GITHUB_ACTIONS, provider_workflow_id="deploy-api"
            )
        ]
    ],
    indirect=True,
)
def test_mapping_a_job_whose_name_collides_with_another_provider_is_409(routes):
    # repoworkflow_orgrepoid_provider_workflow_id is on
    # (org_repo_id, provider_workflow_id), with no provider in it. A lookup
    # narrower than the index reported "no row here" and the insert then hit
    # the constraint -> IntegrityError -> 500. Reusing the row instead would be
    # worse: a GitHub Actions workflow, its runs and its history silently
    # become a Jenkins mapping.
    client, service = routes
    github_workflow = service.workflows[0]

    response = _map(client, "deploy-api")

    assert response.status_code == 409
    assert "deploy-api" in response.json["error"]
    assert len(service.workflows) == 1
    assert github_workflow.provider == RepoWorkflowProviders.GITHUB_ACTIONS
    assert github_workflow.is_active is True


@pytest.mark.parametrize(
    "routes",
    [[FakeWorkflow(RepoWorkflowProviders.GITHUB_ACTIONS, provider_workflow_id="9931")]],
    indirect=True,
)
def test_deleting_a_github_actions_workflow_through_the_jenkins_route_is_404(routes):
    client, service = routes
    github_workflow = service.workflows[0]

    response = _unmap(client, github_workflow.id)

    assert response.status_code == 404
    # Untouched: the Jenkins route must not be a way to disable a GitHub
    # Actions deployment workflow.
    assert github_workflow.is_active is True


@pytest.mark.parametrize(
    "routes",
    [[FakeWorkflow(RepoWorkflowProviders.JENKINS, org_repo_id="nope")]],
    indirect=True,
)
def test_deleting_a_workflow_from_another_workspace_is_404(routes):
    client, service = routes
    foreign_workflow = service.workflows[0]

    response = _unmap(client, foreign_workflow.id, org_id=OTHER_ORG_ID)

    assert response.status_code == 404
    assert foreign_workflow.is_active is True


def test_deleting_an_unknown_workflow_is_404(routes):
    client, _ = routes

    assert _unmap(client, uuid4_str()).status_code == 404


def test_mapping_a_repo_from_another_workspace_is_404(routes):
    client, service = routes

    response = _map(client, "deploy-api", repo_id=uuid4_str())

    assert response.status_code == 404
    assert service.workflows == []


def _jobs_route(get_jobs_result):
    """Drives GET .../jenkins/jobs against a fully configured workspace."""
    client = _build_client()
    api_service = MagicMock()
    if isinstance(get_jobs_result, Exception):
        api_service.get_jobs.side_effect = get_jobs_result
    else:
        api_service.get_jobs.return_value = get_jobs_result

    with patch.object(
        integrations_module, "get_query_validator", return_value=MagicMock()
    ), patch("mhq.store.repos.core.CoreRepoService") as core_repo_service_cls, patch(
        "mhq.utils.jenkins.get_jenkins_config",
        return_value=("https://jenkins.example.com", "user"),
    ), patch(
        "mhq.exapi.jenkins.JenkinsApiService", return_value=api_service
    ):
        core_repo_service_cls.return_value.get_access_token.return_value = "token"
        return client.get(f"/orgs/{ORG_ID}/integrations/jenkins/jobs")


def test_an_unreachable_jenkins_is_a_502_not_a_500():
    response = _jobs_route(requests.ConnectionError("connection refused"))

    # A 500 reached the setup form as "check your credentials", which sends the
    # admin looking in entirely the wrong place.
    assert response.status_code == 502
    assert "Could not reach Jenkins" in response.json["error"]


def test_a_reachable_jenkins_returns_its_jobs():
    response = _jobs_route([{"name": "deploy-api", "full_name": "deploy-api"}])

    assert response.status_code == 200
    assert response.json[0]["full_name"] == "deploy-api"
