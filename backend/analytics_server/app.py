from os import getenv

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
import traceback

from env import load_app_env

load_app_env()

from mhq.store import configure_db_with_app
from mhq.api.hello import app as core_api
from mhq.api.settings import app as settings_api
from mhq.api.pull_requests import app as pull_requests_api
from mhq.api.incidents import app as incidents_api
from mhq.api.integrations import app as integrations_api
from mhq.api.deployment_analytics import app as deployment_analytics_api
from mhq.api.teams import app as teams_api
from mhq.api.bookmark import app as bookmark_api
from mhq.api.ai.dora_ai import app as ai_api

from mhq.store.initialise_db import initialize_database

ANALYTICS_SERVER_PORT = getenv("ANALYTICS_SERVER_PORT")

app = Flask(__name__)

app.register_blueprint(core_api)
app.register_blueprint(settings_api)
app.register_blueprint(pull_requests_api)
app.register_blueprint(incidents_api)
app.register_blueprint(deployment_analytics_api)
app.register_blueprint(integrations_api)
app.register_blueprint(teams_api)
app.register_blueprint(bookmark_api)
app.register_blueprint(ai_api)

configure_db_with_app(app)
initialize_database(app)

# HTTP Error handler
@app.errorhandler(HTTPException)
def handle_http_exception(e):
    """Handle HTTP exceptions by returning JSON"""
    response = jsonify({
        "error": True,
        "message": e.description,
        "status_code": e.code,
        "path": request.path
    })
    response.status_code = e.code
    return response

# Error handler
@app.errorhandler(Exception)
def handle_exception(e):
    """Handle non-HTTP exceptions by returning JSON"""
    error_details = {
        "error": True,
        "message": str(e) or "Internal Server Error",
        "status_code": 500,
        "path": request.path,
        "exception_type": e.__class__.__name__
    }
    
    if app.debug:
        error_details["traceback"] = traceback.format_exc()
    
    response = jsonify(error_details)
    response.status_code = 500
    return response

app.register_error_handler(Exception, handle_exception)
app.register_error_handler(HTTPException, handle_http_exception)

if __name__ == "__main__":
    app.run(port=int(ANALYTICS_SERVER_PORT))
