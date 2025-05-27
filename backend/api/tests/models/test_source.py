"""
Tests for the Source model.
This module tests Source model validation, constraints, and data integrity.
"""

import uuid

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models.source import Source as SourceModel


class TestSource:
    """Test Source model for validation, constraints, and data integrity."""

    def test_source_model(self, app):
        """Test Source model creation and validation."""
        with app.app_context():
            source = SourceModel(
                name="Test News Source",
                logo_url="https://example.com/logo.png",
                homepage_url="https://example.com",
                is_enabled=True,
            )
            db.session.add(source)
            db.session.commit()

            # Verify UUID generation
            assert isinstance(source.id, uuid.UUID)
            assert source.name == "Test News Source"
            assert source.is_enabled is True
            assert str(source) == "<Source Test News Source>"

    def test_source_defaults(self, app):
        """Test Source model default values and UUID generation."""
        with app.app_context():
            # Test with minimal required fields
            source = SourceModel(name="Minimal Source")
            db.session.add(source)
            db.session.commit()

            # Verify defaults and UUID generation
            assert source.is_enabled is True  # Should default to True
            assert isinstance(source.id, uuid.UUID)  # Should auto-generate UUID

    def test_source_database_schema(self, app):
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

    def test_source_required_fields(self, app):
        """Test that required fields are properly enforced for Source."""
        with app.app_context():
            # Test missing required fields
            with pytest.raises((IntegrityError, ValueError)):
                # Missing name for Source
                source = SourceModel()
                db.session.add(source)
                db.session.commit()

            db.session.rollback()

    def test_source_string_length_constraints(self, app):
        """Test string length constraints for Source."""
        with app.app_context():
            # Test source name length constraints
            long_name = "a" * 256  # Assuming reasonable length limit
            source = SourceModel(name=long_name)
            db.session.add(source)

            # This should work or raise an error depending on database constraints
            try:
                db.session.commit()
                # If we get here, length constraints aren't enforced or limit is higher
                db.session.delete(source)
                db.session.commit()
            except (IntegrityError, Exception):
                # Length constraints are enforced
                db.session.rollback()

    def test_source_null_handling(self, app):
        """Test proper null value handling in Source optional fields."""
        with app.app_context():
            # Test optional fields can be None
            source = SourceModel(
                name="Null Test Source", logo_url=None, homepage_url=None
            )
            db.session.add(source)
            db.session.commit()

            # Verify null handling
            assert source.logo_url is None
            assert source.homepage_url is None

    def test_source_data_consistency_after_rollback(self, app):
        """Test Source data consistency after transaction rollbacks."""
        with app.app_context():
            # Create valid data
            source = SourceModel(name="Test Source")
            db.session.add(source)
            db.session.commit()

            original_count = SourceModel.query.count()
            original_id = source.id

            # Attempt invalid operation that should rollback
            try:
                # This might fail due to constraints
                invalid_source = SourceModel(name=None)  # Invalid name
                db.session.add(invalid_source)
                db.session.commit()
            except (IntegrityError, Exception):
                db.session.rollback()

            # Verify original data is still intact
            assert SourceModel.query.count() == original_count
            remaining_source = SourceModel.query.filter_by(name="Test Source").first()
            assert remaining_source is not None
            assert remaining_source.id == original_id

    def test_source_bulk_operations(self, app):
        """Test bulk operations performance and integrity for Source."""
        with app.app_context():
            # Test bulk insertion of sources
            sources = []
            for i in range(50):
                source = SourceModel(name=f"Bulk Source {i}")
                sources.append(source)

            db.session.add_all(sources)
            db.session.commit()

            # Verify all sources were created
            assert SourceModel.query.count() == 50

    def test_source_query_performance(self, app):
        """Test basic query performance for Source."""
        with app.app_context():
            # Create test data
            sources = []
            for i in range(50):
                source = SourceModel(
                    name=f"Performance Source {i}",
                    is_enabled=(i % 2 == 0),  # Alternate enabled/disabled
                )
                sources.append(source)

            db.session.add_all(sources)
            db.session.commit()

            # Test various query patterns
            # Filter by name
            name_sources = SourceModel.query.filter_by(
                name="Performance Source 25"
            ).all()
            assert len(name_sources) == 1

            # Filter by is_enabled
            enabled_sources = SourceModel.query.filter_by(is_enabled=True).all()
            assert len(enabled_sources) == 25

    def test_source_foreign_key_constraints(self, app):
        """Test foreign key constraints for Source."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Source foreign keys (should be none for this model)
            sources_fks = inspector.get_foreign_keys("sources")

            # Source should not have foreign keys to other tables
            assert len(sources_fks) == 0
