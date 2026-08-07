"""
CLUSTOX: workspace isolation during sync.

The behaviour that matters is that one workspace failing does not prevent the
others from syncing, and that the failure is recorded rather than swallowed.
Upstream returned 200 whatever happened inside.
"""

from unittest.mock import MagicMock, patch

import pytest


class FakeRun:
    def __init__(self, org_id):
        self.org_id = org_id
        self.status = "RUNNING"
        self.detail = None
        self.started_at = None
        self.finished_at = None


class FakeSyncRunService:
    """Records outcomes in memory so assertions do not need a database."""

    def __init__(self):
        self.runs = {}

    def start(self, org_id):
        run = FakeRun(org_id)
        self.runs[org_id] = run
        return run

    def finish(self, run, status, detail=None):
        run.status = status
        run.detail = detail

    def latest_for_org(self, org_id):
        return self.runs.get(org_id)


class FakeOrg:
    def __init__(self, org_id, name):
        self.id = org_id
        self.name = name


class FakeLock:
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class FakeLockService:
    def acquire_lock(self, _key):
        return FakeLock()


@pytest.fixture
def sync_module():
    from mhq.api import sync as sync_module

    return sync_module


def build_app(sync_module):
    from flask import Flask

    app = Flask(__name__)
    app.register_blueprint(sync_module.app)
    return app


def test_one_failing_workspace_does_not_stop_the_others(sync_module):
    orgs = [FakeOrg("org-a", "A"), FakeOrg("org-b", "B"), FakeOrg("org-c", "C")]
    fake_service = FakeSyncRunService()

    def trigger(org_id):
        if org_id == "org-b":
            raise RuntimeError("provider token rejected")

    with patch.object(sync_module, "CoreRepoService") as repo_cls, patch.object(
        sync_module, "get_sync_run_service", return_value=fake_service
    ), patch.object(
        sync_module, "get_redis_lock_service", return_value=FakeLockService()
    ), patch.object(
        sync_module, "trigger_data_sync", side_effect=trigger
    ) as trigger_mock:
        repo_cls.return_value = MagicMock(get_all_orgs=lambda: orgs)

        client = build_app(sync_module).test_client()
        res = client.post("/sync")

    assert res.status_code == 200
    # every workspace was attempted, including the one after the failure
    assert trigger_mock.call_count == 3

    assert fake_service.runs["org-a"].status == "SUCCESS"
    assert fake_service.runs["org-b"].status == "FAILED"
    assert fake_service.runs["org-c"].status == "SUCCESS"


def test_failure_detail_is_recorded_not_swallowed(sync_module):
    orgs = [FakeOrg("org-a", "A")]
    fake_service = FakeSyncRunService()

    with patch.object(sync_module, "CoreRepoService") as repo_cls, patch.object(
        sync_module, "get_sync_run_service", return_value=fake_service
    ), patch.object(
        sync_module, "get_redis_lock_service", return_value=FakeLockService()
    ), patch.object(
        sync_module,
        "trigger_data_sync",
        side_effect=RuntimeError("provider token rejected"),
    ):
        repo_cls.return_value = MagicMock(get_all_orgs=lambda: orgs)

        client = build_app(sync_module).test_client()
        res = client.post("/sync")

    body = res.get_json()
    assert "0/1" in body["message"]
    assert fake_service.runs["org-a"].status == "FAILED"
    assert "provider token rejected" in fake_service.runs["org-a"].detail


def test_reports_how_many_workspaces_succeeded(sync_module):
    orgs = [FakeOrg("org-a", "A"), FakeOrg("org-b", "B")]
    fake_service = FakeSyncRunService()

    with patch.object(sync_module, "CoreRepoService") as repo_cls, patch.object(
        sync_module, "get_sync_run_service", return_value=fake_service
    ), patch.object(
        sync_module, "get_redis_lock_service", return_value=FakeLockService()
    ), patch.object(
        sync_module, "trigger_data_sync"
    ):
        repo_cls.return_value = MagicMock(get_all_orgs=lambda: orgs)

        client = build_app(sync_module).test_client()
        res = client.post("/sync")

    assert "2/2" in res.get_json()["message"]


def test_no_workspaces_is_not_an_error(sync_module):
    with patch.object(sync_module, "CoreRepoService") as repo_cls:
        repo_cls.return_value = MagicMock(get_all_orgs=lambda: [])

        client = build_app(sync_module).test_client()
        res = client.post("/sync")

    assert res.status_code == 200
    assert res.get_json()["results"] == []
