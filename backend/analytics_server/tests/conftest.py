import pytest
from app import create_app


@pytest.fixture
def app():
    """New app instance for each test"""
    db_uri = "sqlite:///:memory:"
    app = create_app({"SQLALCHEMY_DATABASE_URI": db_uri, "TESTING": True})

    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()
