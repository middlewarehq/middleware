from os import getenv

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base

from dora.utils.log import LOG

DB_HOST = getenv("DB_HOST")
DB_PORT = getenv("DB_PORT")
DB_USER = getenv("DB_USER")
DB_PASS = getenv("DB_PASS")
DB_NAME = getenv("DB_NAME")

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
            # session.close()
            pass

    return wrapper
