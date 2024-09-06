from flask import Blueprint

app = Blueprint("health", __name__)

@app.route("/health", methods=["GET"])
def health_check():
    return {
        "message": "server is up and running",
        "status": "healthy"
    }