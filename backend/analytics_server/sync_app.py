from os import getenv

from flask import Flask

from env import load_app_env

load_app_env()

from mhq.store import configure_db_with_app
from mhq.api.hello import app as core_api
from mhq.api.sync import app as sync_api

# CLUSTOX: restrict this API to the BFF and cron.
# See mhq/clustox_auth/internal_token.py
from mhq.clustox_auth.internal_token import register_internal_token_guard

SYNC_SERVER_PORT = getenv("SYNC_SERVER_PORT")

app = Flask(__name__)

app.register_blueprint(core_api)
app.register_blueprint(sync_api)

# CLUSTOX: reject any request that did not come from the BFF or cron.
register_internal_token_guard(app)

configure_db_with_app(app)

if __name__ == "__main__":
    app.run(port=SYNC_SERVER_PORT)
