from flask import Blueprint

from mhq.service.sync_data import trigger_data_sync
from mhq.utils.time import time_now

app = Blueprint("sync", __name__)


@app.route("/sync", methods=["POST"])
def sync():
    trigger_data_sync()
    return {"message": "sync started", "time": time_now().isoformat()}
