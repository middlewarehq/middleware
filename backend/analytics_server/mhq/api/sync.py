from typing import List

from flask import Blueprint

from mhq.clustox_auth.sync_run import (
    SyncRunStatus,
    as_dict,
    get_sync_run_service,
)
from mhq.service.sync_data import trigger_data_sync
from mhq.store.models.core import Organization
from mhq.store.repos.core import CoreRepoService
from mhq.utils.lock import get_redis_lock_service
from mhq.utils.log import LOG
from mhq.utils.time import time_now

app = Blueprint("sync", __name__)


@app.route("/sync", methods=["POST"])
def sync():
    """
    CLUSTOX: sync every workspace, not just the default one.

    Upstream synced a single organisation, because only one ever existed. Each
    workspace now brings its own integration and its own repositories, so each
    needs its own sync -- against its own provider token and therefore its own
    rate limit.

    Workspaces are isolated from one another: one failing must not stop the
    rest, which is the same reasoning upstream applies per repository inside a
    sync. The difference is that the outcome is recorded per workspace instead
    of being lost to a rotating log file.
    """
    orgs: List[Organization] = CoreRepoService().get_all_orgs()

    if not orgs:
        return {"message": "no workspaces to sync", "results": []}

    sync_run_service = get_sync_run_service()
    lock_service = get_redis_lock_service()
    results = []

    for org in orgs:
        org_id = str(org.id)
        run = sync_run_service.start(org_id)

        try:
            # Per-workspace lock: a long sync in one workspace must not block
            # another, and a repeat trigger must not run the same workspace
            # twice concurrently.
            with lock_service.acquire_lock("{org}:" + f"{org_id}:data_sync"):
                trigger_data_sync(org_id)

            sync_run_service.finish(run, SyncRunStatus.SUCCESS)
            LOG.info(f"[CLUSTOX] Synced workspace {org.name} ({org_id})")

        except Exception as e:
            detail = f"{type(e).__name__}: {str(e)}"
            sync_run_service.finish(run, SyncRunStatus.FAILED, detail)
            LOG.error(f"[CLUSTOX] Sync failed for workspace {org_id}: {detail}")

        latest = sync_run_service.latest_for_org(org_id)
        if latest:
            results.append(as_dict(latest))

    failed = [r for r in results if r["status"] == SyncRunStatus.FAILED]

    return {
        "message": f"synced {len(results) - len(failed)}/{len(results)} workspaces",
        "time": time_now().isoformat(),
        "results": results,
    }


@app.route("/sync/status", methods=["GET"])
def sync_status():
    """Latest sync outcome per workspace."""
    runs = get_sync_run_service().latest_per_org()
    return {"results": [as_dict(r) for r in runs]}
