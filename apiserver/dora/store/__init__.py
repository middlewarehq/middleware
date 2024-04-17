from os import getenv

from flask_sqlalchemy import SQLAlchemy

from dora.utils.log import LOG

db = SQLAlchemy()


def configure_db_with_app(app):

    DB_HOST = getenv("DB_HOST")
    DB_PORT = getenv("DB_PORT")
    DB_USER = getenv("DB_USER")
    DB_PASS = getenv("DB_PASS")
    DB_NAME = getenv("DB_NAME")
    ENVIRONMENT = getenv("ENVIRONMENT", "local")

    connection_uri = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}?application_name=dora--{ENVIRONMENT}"

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_DATABASE_URI"] = connection_uri
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_size": 20, "max_overflow": 5}
    db.init_app(app)


def rollback_on_exc(func):
    def wrapper(self, *args, **kwargs):
        try:
            return func(self, *args, **kwargs)
        except Exception as e:
            self._db.session.rollback()
            LOG.error(f"Error in {func.__name__} - {str(e)}")
            raise

    return wrapper
