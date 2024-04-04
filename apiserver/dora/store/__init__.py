from os import getenv

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base

from dora.utils.log import LOG

DB_HOST = getenv("DORA_DB_HOST")
DB_PORT = getenv("DORA_DB_PORT")
DB_USER = getenv("DORA_DB_USER")
DB_PASS = getenv("DORA_DB_PASS")
DB_NAME = getenv("DORA_DB_NAME")

ENVIRONMENT = getenv("ENVIRONMENT")

engine = create_engine(
    f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    connect_args={"application_name": f"dora--{ENVIRONMENT}"},
)
session = Session(engine)

Base = declarative_base()


def rollback_on_exc(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            session.rollback()
            LOG.error(f"Error in {func.__name__} - {str(e)}")
            raise
        finally:
            session.close()

    return wrapper
