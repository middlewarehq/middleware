from os import getenv

from flask import Flask

from env import load_app_env

load_app_env()

ANALYTICS_SERVER_PORT = getenv("ANALYTICS_SERVER_PORT", 9696)


def create_app(test_config=None):
    from mhq.api.hello import app as core_api
    from mhq.api.settings import app as settings_api
    from mhq.api.pull_requests import app as pull_requests_api
    from mhq.api.incidents import app as incidents_api
    from mhq.api.integrations import app as integrations_api
    from mhq.api.deployment_analytics import app as deployment_analytics_api
    from mhq.api.teams import app as teams_api
    from mhq.api.bookmark import app as bookmark_api
    from mhq.api.ai.dora_ai import app as ai_api

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

    if test_config is None:
        from mhq.store.initialise_db import initialize_database
        from mhq.store import configure_db_with_app

        configure_db_with_app(app)
        initialize_database(app)
    else:
        app.config.update(test_config)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(port=ANALYTICS_SERVER_PORT)
