from flask import Blueprint, request, jsonify
from utils.request_utils import dataschema
from voluptuous import Required, Schema
import subprocess

app = Blueprint("core", __name__)
        
@app.route("/", methods=["GET"])
def hello_world():
    
    return {"message": "hello world"}