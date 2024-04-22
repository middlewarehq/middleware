from flask import Blueprint

from dora.service.sync_data import trigger_data_sync
from dora.utils.time import time_now

app = Blueprint("sync", __name__)


@app.route("/sync", methods=["POST"])
def sync():
    trigger_data_sync()
    return {"message": "sync started", "time": time_now().isoformat()}
