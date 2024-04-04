from flask import Blueprint

app = Blueprint("hello", __name__)


@app.route("/", methods=["GET"])
def hello_world():
    
    return {"message": "hello world"}
