import pytest
from app import create_app

from mhq.store import db


@pytest.fixture
def app():
    """New app instance for each test"""
    db_uri = "sqlite:///:memory:"
    app = create_app({"SQLALCHEMY_DATABASE_URI": db_uri, "TESTING": True})
    db.init_app(app)
    with app.app_context():
        yield app
        # Drop all the tables after the test
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()
