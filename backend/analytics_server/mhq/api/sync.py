from flask import Blueprint, jsonify

from mhq.service.query_validator import get_query_validator
from mhq.service.sync_data import trigger_data_sync
from mhq.utils.lock import get_redis_lock_service
from mhq.utils.log import LOG
from mhq.utils.time import time_now

app = Blueprint("sync", __name__)


@app.route("/sync", methods=["POST"])
def sync():
    default_org = get_query_validator().get_default_org()
    if not default_org:
        return jsonify({"message": "Default org not found"}), 404
    org_id = str(default_org.id)
    with get_redis_lock_service().acquire_lock("{org}:" + f"{str(org_id)}:data_sync"):
        try:
            trigger_data_sync(org_id)
        except Exception as e:
            LOG.error(f"Error syncing data for org {org_id}: {str(e)}")
            return {"message": "sync failed", "time": time_now().isoformat()}, 500
    return {"message": "sync started", "time": time_now().isoformat()}
