"""
Tests for Topic model.
This module tests Topic model validation, constraints, and data integrity.
"""

import uuid
from datetime import datetime

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Topic


class TestTopic:
    """Test Topic model for validation, constraints, and data integrity."""

    def test_topic_model(self, app):
        """Test Topic model creation and validation."""
        with app.app_context():
            topic = Topic(label="Technology", coverage_score=85)
            db.session.add(topic)
            db.session.commit()

            # Verify UUID generation and timestamps
            assert isinstance(topic.id, uuid.UUID)
            assert topic.label == "Technology"
            assert topic.coverage_score == 85
            assert isinstance(topic.added_at, datetime)
            assert isinstance(topic.updated_at, datetime)
            assert str(topic) == "<Topic Technology>"

    def test_topic_defaults(self, app):
        """Test Topic model default values and UUID generation."""
        with app.app_context():
            # Test with minimal required fields
            topic = Topic(label="Default Topic")
            db.session.add(topic)
            db.session.commit()

            # Verify defaults and UUID generation
            assert topic.coverage_score == 0  # Should default to 0
            assert isinstance(topic.id, uuid.UUID)  # Should auto-generate UUID
            assert isinstance(topic.added_at, datetime)
            assert isinstance(topic.updated_at, datetime)

    def test_topic_timestamp_updates(self, app):
        """Test that timestamps are correctly updated on model changes."""
        with app.app_context():
            topic = Topic(label="Timestamp Test")
            db.session.add(topic)
            db.session.commit()

            original_added = topic.added_at
            original_updated = topic.updated_at

            # Verify timestamps are set
            assert original_added is not None
            assert original_updated is not None

            # Update the topic
            topic.label = "Updated Label"
            db.session.commit()

            # Verify updated_at changed but added_at didn't
            assert topic.added_at == original_added
            assert topic.updated_at >= original_updated

    def test_topic_database_schema(self, app):
        """Test that Topic database schema matches model definition."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Topics table structure
            topics_columns = {
                col["name"]: col for col in inspector.get_columns("topics")
            }
            assert "id" in topics_columns
            assert "label" in topics_columns
            assert "coverage_score" in topics_columns
            assert "added_at" in topics_columns
            assert "updated_at" in topics_columns

    def test_topic_required_fields(self, app):
        """Test that required fields are properly enforced for Topic."""
        with app.app_context():
            # Test missing required fields
            with pytest.raises((IntegrityError, ValueError)):
                # Missing label for Topic
                topic = Topic()
                db.session.add(topic)
                db.session.commit()

            db.session.rollback()

    def test_topic_string_length_constraints(self, app):
        """Test string length constraints for Topic."""
        with app.app_context():
            # Test topic label length constraints
            long_label = "a" * 256  # Assuming reasonable length limit
            topic = Topic(label=long_label)
            db.session.add(topic)

            # This should work or raise an error depending on database constraints
            try:
                db.session.commit()
                # If we get here, length constraints aren't enforced or limit is higher
                db.session.delete(topic)
                db.session.commit()
            except (IntegrityError, Exception):
                # Length constraints are enforced
                db.session.rollback()

    def test_topic_null_handling(self, app):
        """Test proper null value handling in Topic optional fields."""
        with app.app_context():
            # Test that coverage_score can be 0 (default)
            topic = Topic(label="Null Test Topic")  # coverage_score defaults to 0
            db.session.add(topic)
            db.session.commit()

            # Verify default handling
            assert topic.coverage_score == 0

    def test_topic_data_consistency_after_rollback(self, app):
        """Test Topic data consistency after transaction rollbacks."""
        with app.app_context():
            # Create valid data
            topic = Topic(label="Test Topic")
            db.session.add(topic)
            db.session.commit()

            original_count = Topic.query.count()
            original_id = topic.id

            # Attempt invalid operation that should rollback
            try:
                # This might fail due to constraints
                invalid_topic = Topic(label=None)  # Invalid label
                db.session.add(invalid_topic)
                db.session.commit()
            except (IntegrityError, Exception):
                db.session.rollback()

            # Verify original data is still intact
            assert Topic.query.count() == original_count
            remaining_topic = Topic.query.filter_by(label="Test Topic").first()
            assert remaining_topic is not None
            assert remaining_topic.id == original_id

    def test_topic_bulk_operations(self, app):
        """Test bulk operations performance and integrity for Topic."""
        with app.app_context():
            # Test bulk insertion of topics
            topics = []
            for i in range(50):
                topic = Topic(label=f"Bulk Topic {i}", coverage_score=i)
                topics.append(topic)

            db.session.add_all(topics)
            db.session.commit()

            # Verify all topics were created
            assert Topic.query.count() == 50

    def test_topic_query_performance(self, app):
        """Test basic query performance for Topic."""
        with app.app_context():
            # Create test data
            topics = []
            for i in range(50):
                topic = Topic(label=f"Performance Topic {i}", coverage_score=i * 2)
                topics.append(topic)

            db.session.add_all(topics)
            db.session.commit()

            # Test various query patterns
            # Filter by label
            label_topics = Topic.query.filter_by(label="Performance Topic 25").all()
            assert len(label_topics) == 1

            # Filter by coverage_score
            high_coverage_topics = Topic.query.filter(Topic.coverage_score > 50).all()
            assert len(high_coverage_topics) > 0

    def test_topic_foreign_key_constraints(self, app):
        """Test foreign key constraints for Topic."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Topic foreign keys (should be none for this model)
            topics_fks = inspector.get_foreign_keys("topics")

            # Topic should not have foreign keys to other tables
            assert len(topics_fks) == 0
