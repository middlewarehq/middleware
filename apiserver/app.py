from flask import Flask
from env import load_app_env

load_app_env()

from dora.api.hello import app as core_api
from dora.api.settings import app as settings_api
from dora.api.pull_requests import app as pull_requests_api
from dora.api.incidents import app as incidents_api
from dora.api.deployment_analytics import app as deployment_analytics_api

app = Flask(__name__)

app.register_blueprint(core_api)
app.register_blueprint(settings_api)
app.register_blueprint(pull_requests_api)
app.register_blueprint(incidents_api)
app.register_blueprint(deployment_analytics_api)
