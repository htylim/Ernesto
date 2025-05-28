"""Shared test fixtures for all test modules."""

import pytest
from flask import Flask

from app import create_app
from app.extensions import db


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
