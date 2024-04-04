from flask import Flask
from api.core import api as core_api

app = Flask(__name__)

app.register_blueprint(core_api)