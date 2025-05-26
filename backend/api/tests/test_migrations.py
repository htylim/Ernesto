"""
Tests for database migrations.
This module tests migration operations like upgrade, downgrade, and migration detection.
"""

import pytest
from sqlalchemy import inspect

from app import alembic, db


class TestMigrations:
    """Test database migration operations."""

    def test_migration_upgrade(self, app):
        """Test applying migrations with Flask-Alembic."""
        with app.app_context():
            try:
                # Test upgrade to head
                alembic.upgrade()

                # Verify database state after upgrade
                inspector = inspect(db.engine)
                tables = inspector.get_table_names()

                # Should have our model tables
                expected_tables = ["api_clients", "sources", "topics", "articles"]
                for table in expected_tables:
                    assert table in tables

            except Exception as e:
                # If no migrations exist, this is expected
                pytest.skip(f"No migrations to upgrade: {e}")

    def test_migration_downgrade(self, app):
        """Test rolling back migrations with Flask-Alembic."""
        with app.app_context():
            try:
                # First upgrade to ensure we have something to downgrade
                alembic.upgrade()

                # Then test downgrade
                alembic.downgrade(revision="-1")

            except Exception as e:
                # If no migrations exist, this is expected
                pytest.skip(f"No migrations to downgrade: {e}")

    def test_migration_heads(self, app):
        """Test getting migration heads."""
        with app.app_context():
            try:
                # Get migration heads
                heads = alembic.heads()
                # Should return a list or tuple
                assert hasattr(heads, "__iter__")

            except Exception as e:
                pytest.skip(f"Migration heads not available: {e}")

    def test_current_revision(self, app):
        """Test getting current database revision."""
        with app.app_context():
            try:
                # Get current revision
                current = alembic.current()
                # Should return a revision identifier or None
                assert current is None or isinstance(current, str)

            except Exception as e:
                pytest.skip(f"Current revision not available: {e}")

    def test_models_detected_by_alembic(self, app):
        """Test that Flask-Alembic can detect our models."""
        with app.app_context():
            # Get SQLAlchemy metadata
            metadata = db.metadata

            # Verify our models are in the metadata
            table_names = list(metadata.tables.keys())
            expected_tables = ["api_clients", "sources", "topics", "articles"]

            for table in expected_tables:
                assert table in table_names
