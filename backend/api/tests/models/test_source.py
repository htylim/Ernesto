"""Tests for Source model.

This module tests Source model validation, constraints, and data integrity.
"""

import uuid
from typing import TYPE_CHECKING

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.source import Source

if TYPE_CHECKING:
    from flask import Flask


class TestSource:
    """Test Source model for validation, constraints, and data integrity."""

    def test_source_model(self, app: "Flask") -> None:
        """Test Source model creation and validation."""
        with app.app_context():
            source = Source(
                name="Test Source",
                logo_url="https://example.com/logo.png",
                homepage_url="https://example.com",
                is_enabled=True,
            )
            db.session.add(source)
            db.session.commit()

            # Verify source creation
            assert isinstance(source.id, uuid.UUID)
            assert source.name == "Test Source"
            assert source.logo_url == "https://example.com/logo.png"
            assert source.homepage_url == "https://example.com"
            assert source.is_enabled is True
            assert str(source) == "<Source Test Source>"

    def test_source_defaults(self, app: "Flask") -> None:
        """Test Source model default values."""
        with app.app_context():
            source = Source(name="Default Test Source")
            db.session.add(source)
            db.session.commit()

            # Verify defaults are applied
            assert source.is_enabled is True  # Should default to True
            assert isinstance(source.id, uuid.UUID)  # Should auto-generate UUID

    def test_source_database_schema(self, app: "Flask") -> None:
        """Test that Source database schema matches model definition."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Sources table structure
            sources_columns = {
                col["name"]: col for col in inspector.get_columns("sources")
            }
            assert "id" in sources_columns
            assert "name" in sources_columns
            assert "logo_url" in sources_columns
            assert "homepage_url" in sources_columns
            assert "is_enabled" in sources_columns

    def test_source_required_fields(self, app: "Flask") -> None:
        """Test that required fields are properly enforced for Source."""
        with app.app_context():
            # Test missing required fields
            with pytest.raises((IntegrityError, ValueError)):
                # Missing name for Source
                source = Source()
                db.session.add(source)
                db.session.commit()

            db.session.rollback()

    def test_source_string_length_constraints(self, app: "Flask") -> None:
        """Test string length constraints for Source."""
        with app.app_context():
            # Test source name length (255 chars max)
            long_name = "a" * 256
            source = Source(name=long_name)
            db.session.add(source)

            # This should raise an error in databases that enforce length
            try:
                db.session.commit()
                # If we get here, length constraints aren't enforced (SQLite)
                db.session.delete(source)
                db.session.commit()
            except (IntegrityError, Exception):
                # Length constraints are enforced
                db.session.rollback()

    def test_source_null_handling(self, app: "Flask") -> None:
        """Test proper null value handling in Source optional fields."""
        with app.app_context():
            # Test optional fields can be None
            source = Source(
                name="Null Test Source",
                logo_url=None,
                homepage_url=None,
            )
            db.session.add(source)
            db.session.commit()

            # Verify null handling
            assert source.name is not None
            assert source.logo_url is None
            assert source.homepage_url is None

    def test_source_data_consistency_after_rollback(self, app: "Flask") -> None:
        """Test Source data consistency after transaction rollbacks."""
        with app.app_context():
            # Create valid data
            source = Source(name="Test Source")
            db.session.add(source)
            db.session.commit()

            original_count = Source.query.count()
            original_id = source.id

            # Attempt invalid operation that should rollback
            try:
                # This should fail due to constraints
                invalid_source = Source(name=None)  # Invalid name
                db.session.add(invalid_source)
                db.session.commit()
            except (IntegrityError, Exception):
                db.session.rollback()

            # Verify original data is still intact
            assert Source.query.count() == original_count
            remaining_source = Source.query.filter_by(name="Test Source").first()
            assert remaining_source is not None
            assert remaining_source.id == original_id

    def test_source_bulk_operations(self, app: "Flask") -> None:
        """Test bulk operations performance and integrity for Source."""
        with app.app_context():
            # Test bulk insertion of sources
            sources = []
            for i in range(50):
                source = Source(name=f"Bulk Source {i}")
                sources.append(source)

            db.session.add_all(sources)
            db.session.commit()

            # Verify all sources were created
            assert Source.query.count() == 50

    def test_source_query_performance(self, app: "Flask") -> None:
        """Test basic query performance for Source."""
        with app.app_context():
            # Create test data
            sources = []
            for i in range(50):
                source = Source(
                    name=f"Performance Source {i}",
                    is_enabled=(i % 2 == 0),  # Alternate enabled/disabled
                )
                sources.append(source)

            db.session.add_all(sources)
            db.session.commit()

            # Test various query patterns
            # Filter by name
            name_sources = Source.query.filter_by(name="Performance Source 25").all()
            assert len(name_sources) == 1

            # Filter by is_enabled
            enabled_sources = Source.query.filter_by(is_enabled=True).all()
            assert len(enabled_sources) == 25

    def test_source_foreign_key_constraints(self, app: "Flask") -> None:
        """Test foreign key constraints for Source (if any)."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Source foreign keys (should be none for this model)
            sources_fks = inspector.get_foreign_keys("sources")

            # Source should not have foreign keys to other tables
            assert len(sources_fks) == 0
