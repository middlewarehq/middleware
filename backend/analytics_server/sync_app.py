from os import getenv

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
import traceback

from env import load_app_env

load_app_env()

from mhq.store import configure_db_with_app
from mhq.api.hello import app as core_api
from mhq.api.sync import app as sync_api

SYNC_SERVER_PORT = getenv("SYNC_SERVER_PORT")

app = Flask(__name__)

app.register_blueprint(core_api)
app.register_blueprint(sync_api)

configure_db_with_app(app)

# HTTP Error handler
@app.errorhandler(HTTPException)
def handle_http_exception(e):
    """Handle HTTP exceptions by returning JSON"""
    response = jsonify(
        {"error": e.description, "status_code": e.code, "path": request.path}
    )
    response.status_code = e.code
    return response

# Error handling
@app.errorhandler(Exception)
def handle_exception(e):
    """Handle non-HTTP exceptions by returning JSON"""
    error_details = {
        "error": str(e) or "Internal Server Error",
        "status_code": 500,
        "path": request.path,
        "exception_type": e.__class__.__name__,
    }

    if app.debug:
        error_details["traceback"] = traceback.format_exc()

    return jsonify(error_details), 500

if __name__ == "__main__":
    app.run(port=SYNC_SERVER_PORT)
