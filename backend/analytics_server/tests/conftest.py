import pytest
import subprocess
from testcontainers.postgres import PostgresContainer
from app import create_app
from mhq.store import db

@pytest.fixture(scope='session')
def postgres_container():
    with PostgresContainer("postgres:14.3-alpine") as postgres:
        yield postgres

@pytest.fixture(scope='function')
def app(postgres_container):
    """New app instance for each test"""
    db_uri = postgres_container.get_connection_url()
    app = create_app({
        "SQLALCHEMY_DATABASE_URI": db_uri,
        "TESTING": True,
        "SQLALCHEMY_TRACK_MODIFICATIONS": False
    })
    db.init_app(app)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def session(app):
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        options = dict(bind=connection, binds={})
        session = db._make_scoped_session(options=options)
        db.session = session
        yield session
        transaction.rollback()
        connection.close()
        session.remove()

@pytest.fixture(scope='function')
def apply_migrations(app):
    with app.app_context():
        import os
        database_url = app.config['SQLALCHEMY_DATABASE_URI']
        database_url = database_url.replace('postgresql+psycopg2', 'postgresql')
        if "?" in database_url:
            database_url += "&sslmode=disable"
        else:
            database_url += "?sslmode=disable"
        os.environ['DATABASE_URL'] = database_url
        original_dir = os.getcwd()
        
        os.chdir(os.path.join(original_dir, "database-docker"))
        print(os.getcwd())
        subprocess.run(['./dbwait.sh'], check=True)
    yield
    os.chdir(original_dir)
