from mhq.service.workflows.sync.etl_github_actions_handler import (
    GithubActionsETLHandler,
)
from mhq.store.models.code import RepoWorkflowRunsStatus
from mhq.utils.string import uuid4_str
from tests.factories.models import get_repo_workflow_run
from tests.factories.models.exapi.github import get_github_workflow_run_dict
from tests.utilities import compare_objects_as_dicts


def test__adapt_github_workflows_to_workflow_runs_given_new_workflow_run_return_new_run():
    class WorkflowRepoService:
        def get_repo_workflow_run_by_provider_workflow_run_id(self, *args):
            return None

    github_workflow_run = get_github_workflow_run_dict()
    org_id = uuid4_str()
    repo_id = uuid4_str()
    gh_actions_etl_handler = GithubActionsETLHandler(org_id, None, WorkflowRepoService)
    actual_workflow_run = (
        gh_actions_etl_handler._adapt_github_workflows_to_workflow_runs(
            repo_id, github_workflow_run
        )
    )

    expected_workflow_run = get_repo_workflow_run(
        repo_workflow_id=repo_id,
        provider_workflow_run_id=str(github_workflow_run["id"]),
        event_actor=github_workflow_run["actor"]["login"],
        head_branch=github_workflow_run["head_branch"],
        status=RepoWorkflowRunsStatus.SUCCESS,
        conducted_at=gh_actions_etl_handler._get_datetime_from_gh_datetime(
            github_workflow_run["run_started_at"]
        ),
        duration=gh_actions_etl_handler._get_repo_workflow_run_duration(
            github_workflow_run
        ),
        meta=github_workflow_run,
        html_url=github_workflow_run["html_url"],
    )

    assert compare_objects_as_dicts(
        actual_workflow_run, expected_workflow_run, ["id", "created_at", "updated_at"]
    )


def test__adapt_github_workflows_to_workflow_runs_given_already_synced_workflow_run_returns_updated_run():
    github_workflow_run = get_github_workflow_run_dict()
    org_id = uuid4_str()
    repo_id = uuid4_str()

    repo_workflow_run_in_db = get_repo_workflow_run(
        repo_workflow_id=repo_id,
        provider_workflow_run_id=str(github_workflow_run["id"]),
    )

    class WorkflowRepoService:
        def get_repo_workflow_run_by_provider_workflow_run_id(self, *args):
            return repo_workflow_run_in_db

    gh_actions_etl_handler = GithubActionsETLHandler(org_id, None, WorkflowRepoService)
    actual_workflow_run = (
        gh_actions_etl_handler._adapt_github_workflows_to_workflow_runs(
            repo_id, github_workflow_run
        )
    )

    expected_workflow_run = get_repo_workflow_run(
        id=repo_workflow_run_in_db.id,
        repo_workflow_id=repo_id,
        provider_workflow_run_id=str(github_workflow_run["id"]),
        event_actor=github_workflow_run["actor"]["login"],
        head_branch=github_workflow_run["head_branch"],
        status=RepoWorkflowRunsStatus.SUCCESS,
        conducted_at=gh_actions_etl_handler._get_datetime_from_gh_datetime(
            github_workflow_run["run_started_at"]
        ),
        duration=gh_actions_etl_handler._get_repo_workflow_run_duration(
            github_workflow_run
        ),
        meta=github_workflow_run,
        html_url=github_workflow_run["html_url"],
    )

    assert compare_objects_as_dicts(
        actual_workflow_run, expected_workflow_run, ["created_at", "updated_at"]
    )


def test__get_repo_workflow_run_duration_given_workflow_run_with_timings_returns_correct_duration():
    repo_workflow_run = get_github_workflow_run_dict(
        run_started_at="2021-06-01T12:00:00Z", updated_at="2021-06-01T12:11:00Z"
    )
    org_id = uuid4_str()
    expected_duration = 660
    gh_actions_etl_handler = GithubActionsETLHandler(org_id, None, None)
    actual_duration = gh_actions_etl_handler._get_repo_workflow_run_duration(
        repo_workflow_run
    )
    assert actual_duration == expected_duration


def test__get_repo_workflow_run_duration_given_workflow_run_without_timings_returns_none():
    repo_workflow_run = get_github_workflow_run_dict(run_started_at="", updated_at="")
    org_id = uuid4_str()
    gh_actions_etl_handler = GithubActionsETLHandler(org_id, None, None)
    actual_duration = gh_actions_etl_handler._get_repo_workflow_run_duration(
        repo_workflow_run
    )
    assert actual_duration is None
