from procrastinate import App, PsycopgConnector
from os import getenv
from flask import Flask
from mhq.store import configure_db_with_app
from env import load_app_env

load_app_env()

# Create Flask app
flask_app = Flask(__name__)
configure_db_with_app(flask_app)

# Create Procrastinate app
app = App(
    connector=PsycopgConnector(
        kwargs={
            "host": getenv("DB_HOST"),
            "port": getenv("DB_PORT"),
            "user": getenv("DB_USER"),
            "password": getenv("DB_PASS"),
            "dbname": getenv("DB_NAME"),
        }
    ),
    import_paths=["mhq.service.queue.tasks"],
)

app.open()
