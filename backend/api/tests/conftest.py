"""
Shared test fixtures for all test modules.
"""

import pytest

from app import create_app, db


@pytest.fixture
def app():
    """Create a test Flask application with in-memory database."""
    test_config = {
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "TESTING": True,
    }
    app = create_app(test_config)

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()
