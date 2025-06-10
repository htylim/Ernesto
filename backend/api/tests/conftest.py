"""Shared test fixtures for all test modules."""

from typing import Generator, Tuple

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app import create_app
from app.extensions import db
from app.models import ApiClient


@pytest.fixture
def app() -> Flask:
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


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def sample_api_client(app: Flask) -> Generator[Tuple[ApiClient, str], None, None]:
    """Create a sample API client for testing authentication."""
    with app.app_context():
        api_client, api_key = ApiClient.create_with_api_key("test_client")
        db.session.add(api_client)
        db.session.commit()
        yield api_client, api_key


@pytest.fixture
def empty_db_app() -> Flask:
    """Create a test Flask application with empty database for migration testing.

    This fixture creates an app with an empty database (no tables created)
    so that migrations can be tested properly. This simulates the scenario
    where you have a fresh database and need to run migrations to create tables.
    """
    test_config = {
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "TESTING": True,
    }
    app = create_app(test_config)

    with app.app_context():
        # Don't call db.create_all() - this is the key difference
        # The database exists but has no tables, simulating a fresh DB
        yield app
        # Clean up any tables that might have been created during testing
        db.drop_all()
