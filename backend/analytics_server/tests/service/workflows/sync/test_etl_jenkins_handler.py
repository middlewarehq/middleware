import re
from datetime import datetime

import pytest
import pytz

from mhq.service.workflows.sync.etl_jenkins_handler import JenkinsETLHandler
from mhq.store.models.code import RepoWorkflowRunsStatus
from mhq.utils.string import uuid4_str
from tests.factories.models.exapi.jenkins import (
    get_jenkins_build_dict,
    get_jenkins_build_dict_without_git_plugin,
)


def _epoch_start() -> datetime:
    return datetime.fromtimestamp(0, tz=pytz.UTC)


class FakeWorkflowRepoService:
    def get_repo_workflow_run_by_provider_workflow_run_id(self, *args):
        return None


def _handler():
    return JenkinsETLHandler(uuid4_str(), None, FakeWorkflowRepoService())


def test_success_maps_to_success():
    build = get_jenkins_build_dict(result="SUCCESS")
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.SUCCESS
    )


def test_failure_maps_to_failure():
    build = get_jenkins_build_dict(result="FAILURE")
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.FAILURE
    )


def test_aborted_maps_to_cancelled():
    build = get_jenkins_build_dict(result="ABORTED")
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.CANCELLED
    )


def test_unstable_maps_to_failure_so_it_is_not_counted_as_a_deployment():
    build = get_jenkins_build_dict(result="UNSTABLE")
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.FAILURE
    )


def test_a_running_build_maps_to_pending():
    build = get_jenkins_build_dict(result=None, building=True)
    assert (
        JenkinsETLHandler._get_repo_workflow_status(build)
        == RepoWorkflowRunsStatus.PENDING
    )


def test_adapt_maps_every_field():
    build = get_jenkins_build_dict()
    repo_workflow_id = uuid4_str()

    run = _handler()._adapt_jenkins_build_to_workflow_run(repo_workflow_id, build)

    assert run.repo_workflow_id == repo_workflow_id
    assert run.provider_workflow_run_id == "42"
    assert run.status == RepoWorkflowRunsStatus.SUCCESS
    assert run.event_actor == "hamad"
    # Jenkins reports "origin/main"; what gets stored has to be "main", or the
    # prod-branch regex '^main$' excludes the run from every DORA metric.
    assert run.head_branch == "main"
    assert run.html_url == build["url"]
    # Jenkins reports milliseconds; RepoWorkflowRuns.duration is seconds.
    assert run.duration == 125
    assert run.conducted_at.isoformat() == "2025-08-10T12:00:00+00:00"


@pytest.mark.parametrize(
    "reported,stored",
    [
        # What the git plugin actually reports for a checkout of main.
        ("origin/main", "main"),
        ("refs/remotes/origin/main", "main"),
        ("refs/heads/main", "main"),
        ("main", "main"),
        # A non-default remote name, still unambiguous after refs/remotes/.
        ("refs/remotes/deploy-target/release", "release"),
        ("upstream/main", "main"),
        # Slash-containing branch names must survive untouched: the first
        # segment here is part of the branch, not a remote.
        ("feature/origin-story", "feature/origin-story"),
        ("release/2.0", "release/2.0"),
        ("refs/heads/feature/origin-story", "feature/origin-story"),
        ("origin/feature/origin-story", "feature/origin-story"),
    ],
)
def test_branch_is_normalised_to_what_the_prod_branch_regex_expects(reported, stored):
    build = get_jenkins_build_dict(branch_name=reported)

    run = _handler()._adapt_jenkins_build_to_workflow_run(uuid4_str(), build)

    assert run.head_branch == stored


def test_the_stored_branch_matches_the_default_prod_branch_pattern():
    # The failure this guards: prod_branches defaults to ["^<default_branch>$"]
    # (mhq/service/code/repository_service.py) and is applied as a Postgres
    # regex against RepoWorkflowRuns.head_branch. Python's re uses the same
    # syntax for this pattern, so it reproduces the exclusion faithfully.
    prod_branch_pattern = "^main$"
    build = get_jenkins_build_dict(branch_name="origin/main")

    run = _handler()._adapt_jenkins_build_to_workflow_run(uuid4_str(), build)

    assert re.search(prod_branch_pattern, "origin/main") is None
    assert re.search(prod_branch_pattern, run.head_branch) is not None


def test_a_build_without_the_git_plugin_records_with_nulls_rather_than_raising():
    build = get_jenkins_build_dict_without_git_plugin()

    run = _handler()._adapt_jenkins_build_to_workflow_run(uuid4_str(), build)

    assert run.head_branch is None
    assert run.event_actor is None
    assert run.status == RepoWorkflowRunsStatus.SUCCESS


def test_a_malformed_build_is_skipped_without_losing_the_batch():
    class Repo:
        def get_repo_workflow_run_by_provider_workflow_run_id(self, *args):
            return None

    class Api:
        @staticmethod
        def get_builds(*args):
            # Second build has no "number", so adaptation raises for it alone.
            return [get_jenkins_build_dict(number=2), {"timestamp": 1754827200000}]

    class Workflow:
        id = uuid4_str()
        provider_workflow_id = "deploy-api"

    class OrgRepoStub:
        repo_id = uuid4_str()

    handler = JenkinsETLHandler(uuid4_str(), Api(), Repo())
    runs, _ = handler.get_workflow_runs(OrgRepoStub(), Workflow(), _epoch_start())

    assert [r.provider_workflow_run_id for r in runs] == ["2"]


def test_bookmark_rewinds_to_the_oldest_running_build():
    handler = _handler()
    builds = [
        get_jenkins_build_dict(number=3, timestamp=3000, result=None, building=True),
        get_jenkins_build_dict(number=2, timestamp=2000, result="SUCCESS"),
    ]

    bookmark = handler._get_new_bookmark_time_stamp(builds)

    # The running build must be re-fetched next cycle, so the bookmark cannot
    # advance past it.
    assert bookmark == handler._get_datetime_from_epoch_ms(3000)
