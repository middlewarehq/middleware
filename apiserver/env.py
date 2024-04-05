from os import getenv

from dotenv import load_dotenv


def load_app_env():
    if getenv("DORA_FLASK_ENV") == "production":
        load_dotenv(".env.prod")
    else:
        load_dotenv(".env.local")
