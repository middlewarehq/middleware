# CLUSTOX: the Jenkins rows have to survive the provider filter in
# _get_active_repo_workflows, otherwise the whole integration is inert -- the
# mapping is stored, the picker works, and no build is ever synced.
from typing import List

from mhq.service.workflows import integration as integration_module
from mhq.service.workflows.integration import WorkflowsIntegrationsService
from mhq.service.workflows.sync import etl_handler as etl_handler_module
from mhq.service.workflows.sync.etl_handler import WorkflowETLHandler
from mhq.store.models.code import (
    OrgRepo,
    RepoWorkflow,
    RepoWorkflowProviders,
    RepoWorkflowType,
)
from mhq.utils.string import uuid4_str


class FakeIntegration:
    def __init__(self, name: str):
        self.name = name


class FakeCoreRepoService:
    """
    Applies the same name filter the real query does, so a provider missing
    from WORKFLOW_INTEGRATION_BUCKET is invisible to the service.
    """

    def __init__(self, linked_names: List[str]):
        self._linked_names = linked_names

    def get_org_integrations_for_names(self, org_id: str, provider_names: List[str]):
        return [FakeIntegration(n) for n in self._linked_names if n in provider_names]


class FakeCodeIntegrationService:
    @staticmethod
    def get_org_providers(org_id: str) -> List[str]:
        return ["github"]


class FakeCodeRepoService:
    def __init__(self, org_repos: List[OrgRepo]):
        self._org_repos = org_repos

    def get_active_org_repos(self, org_id: str) -> List[OrgRepo]:
        return self._org_repos


class FakeWorkflowRepoService:
    """
    Applies the same provider filter as
    get_active_repo_workflows_by_repo_ids_and_providers, and records the
    provider list it was handed so the test can assert on it directly.
    """

    def __init__(self, repo_workflows: List[RepoWorkflow]):
        self._repo_workflows = repo_workflows
        self.providers_queried: List[RepoWorkflowProviders] = []

    def get_active_repo_workflows_by_repo_ids_and_providers(
        self, repo_ids: List[str], providers: List[RepoWorkflowProviders]
    ) -> List[RepoWorkflow]:
        self.providers_queried = providers
        return [
            workflow
            for workflow in self._repo_workflows
            if str(workflow.org_repo_id) in repo_ids
            and workflow.provider in providers
            and workflow.is_active
        ]


def _org_repo(org_id: str) -> OrgRepo:
    return OrgRepo(id=uuid4_str(), org_id=org_id, name="api", provider="github")


def _repo_workflow(org_repo: OrgRepo, provider: RepoWorkflowProviders) -> RepoWorkflow:
    return RepoWorkflow(
        id=uuid4_str(),
        org_repo_id=str(org_repo.id),
        type=RepoWorkflowType.DEPLOYMENT,
        provider=provider,
        provider_workflow_id="deploy-api",
        is_active=True,
        name="deploy-api",
    )


def _build_handler(
    monkeypatch,
    linked_integration_names: List[str],
    org_repos: List[OrgRepo],
    repo_workflows: List[RepoWorkflow],
):
    workflow_repo_service = FakeWorkflowRepoService(repo_workflows)
    workflows_integrations_service = WorkflowsIntegrationsService(
        FakeCoreRepoService(linked_integration_names)
    )
    monkeypatch.setattr(
        etl_handler_module,
        "get_code_integration_service",
        lambda: FakeCodeIntegrationService(),
    )
    monkeypatch.setattr(
        etl_handler_module,
        "get_workflows_integrations_service",
        lambda: workflows_integrations_service,
    )
    handler = WorkflowETLHandler(
        FakeCodeRepoService(org_repos),
        workflow_repo_service,
        None,
        None,
        None,
    )
    return handler, workflow_repo_service


def test_a_jenkins_only_workspace_syncs_its_jenkins_workflow(monkeypatch):
    org_id = uuid4_str()
    org_repo = _org_repo(org_id)
    jenkins_workflow = _repo_workflow(org_repo, RepoWorkflowProviders.JENKINS)

    handler, workflow_repo_service = _build_handler(
        monkeypatch,
        linked_integration_names=["github", "jenkins"],
        org_repos=[org_repo],
        repo_workflows=[jenkins_workflow],
    )

    active = handler._get_active_repo_workflows(org_id)

    # Before Jenkins was added to WORKFLOW_INTEGRATION_BUCKET this was []:
    # get_org_providers returned nothing, so the function bailed out with
    # "No workflow integrations found".
    assert [workflow.id for _, workflow in active] == [jenkins_workflow.id]
    assert active[0][0].id == org_repo.id
    assert RepoWorkflowProviders.JENKINS in workflow_repo_service.providers_queried


def test_jenkins_survives_the_provider_filter_when_github_is_also_linked(monkeypatch):
    org_id = uuid4_str()
    github_repo = _org_repo(org_id)
    jenkins_repo = _org_repo(org_id)
    github_workflow = _repo_workflow(github_repo, RepoWorkflowProviders.GITHUB_ACTIONS)
    jenkins_workflow = _repo_workflow(jenkins_repo, RepoWorkflowProviders.JENKINS)

    handler, workflow_repo_service = _build_handler(
        monkeypatch,
        linked_integration_names=["github", "jenkins"],
        org_repos=[github_repo, jenkins_repo],
        repo_workflows=[github_workflow, jenkins_workflow],
    )

    active = handler._get_active_repo_workflows(org_id)

    # Both providers must come back. Previously the Jenkins row was dropped by
    # RepoWorkflow.provider.in_(providers) even with GitHub linked.
    assert {workflow.id for _, workflow in active} == {
        github_workflow.id,
        jenkins_workflow.id,
    }
    assert set(workflow_repo_service.providers_queried) == {
        RepoWorkflowProviders.GITHUB_ACTIONS,
        RepoWorkflowProviders.JENKINS,
    }


def test_get_org_providers_reports_jenkins_for_a_jenkins_only_workspace():
    service = WorkflowsIntegrationsService(FakeCoreRepoService(["jenkins"]))

    # This is the exact value sync_org_workflows checks before returning early.
    assert service.get_org_providers(uuid4_str()) == ["jenkins"]


def test_an_unrelated_integration_is_still_not_a_workflow_provider():
    service = WorkflowsIntegrationsService(FakeCoreRepoService(["gitlab"]))

    assert service.get_org_providers(uuid4_str()) == []
    assert "gitlab" not in integration_module.WORKFLOW_INTEGRATION_BUCKET
