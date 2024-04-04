from flask import Flask
from dora.api.hello import app as core_api

app = Flask(__name__)

app.register_blueprint(core_api)