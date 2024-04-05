from flask import Flask
from env import load_app_env

from dora.api.hello import app as core_api

load_app_env()

app = Flask(__name__)

app.register_blueprint(core_api)
