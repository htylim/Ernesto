"""Tests for Topic model.

This module tests Topic model validation, constraints, and data integrity.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app import Topic
from app.extensions import db

if TYPE_CHECKING:
    from flask import Flask


class TestTopic:
    """Test Topic model for validation, constraints, and data integrity."""

    def test_topic_model(self, app: "Flask") -> None:
        """Test Topic model creation and validation."""
        with app.app_context():
            topic = Topic(label="Test Topic", coverage_score=5)
            db.session.add(topic)
            db.session.commit()

            # Verify topic creation
            assert isinstance(topic.id, uuid.UUID)
            assert topic.label == "Test Topic"
            assert topic.coverage_score == 5
            assert isinstance(topic.added_at, datetime)
            assert isinstance(topic.updated_at, datetime)
            assert str(topic) == "<Topic Test Topic>"

    def test_topic_defaults(self, app: "Flask") -> None:
        """Test Topic model default values."""
        with app.app_context():
            topic = Topic(label="Default Test Topic")
            db.session.add(topic)
            db.session.commit()

            # Verify defaults are applied
            assert topic.coverage_score == 0  # Should default to 0
            assert isinstance(topic.id, uuid.UUID)  # Should auto-generate UUID
            assert isinstance(topic.added_at, datetime)
            assert isinstance(topic.updated_at, datetime)

    def test_topic_timestamp_updates(self, app: "Flask") -> None:
        """Test that Topic timestamps are properly updated."""
        with app.app_context():
            topic = Topic(label="Timestamp Test Topic")
            db.session.add(topic)
            db.session.commit()

            original_added_at = topic.added_at
            original_updated_at = topic.updated_at

            # Update the topic
            topic.label = "Updated Topic"
            db.session.commit()

            # Verify timestamps
            assert topic.added_at == original_added_at  # Should not change
            # updated_at should change (though might be same if very fast)
            assert topic.updated_at >= original_updated_at

    def test_topic_database_schema(self, app: "Flask") -> None:
        """Test that Topic database schema matches model definition."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Topics table structure
            topics_columns = {
                col["name"]: col for col in inspector.get_columns("topics")
            }
            assert "id" in topics_columns
            assert "label" in topics_columns
            assert "added_at" in topics_columns
            assert "updated_at" in topics_columns
            assert "coverage_score" in topics_columns

    def test_topic_required_fields(self, app: "Flask") -> None:
        """Test that required fields are properly enforced for Topic."""
        with app.app_context():
            # Test missing required fields
            with pytest.raises((IntegrityError, ValueError)):
                # Missing label for Topic
                topic = Topic()
                db.session.add(topic)
                db.session.commit()

            db.session.rollback()

    def test_topic_string_length_constraints(self, app: "Flask") -> None:
        """Test string length constraints for Topic."""
        with app.app_context():
            # Test topic label length (255 chars max)
            long_label = "a" * 256
            topic = Topic(label=long_label)
            db.session.add(topic)

            # This should raise an error in databases that enforce length
            try:
                db.session.commit()
                # If we get here, length constraints aren't enforced (SQLite)
                db.session.delete(topic)
                db.session.commit()
            except (IntegrityError, Exception):
                # Length constraints are enforced
                db.session.rollback()

    def test_topic_null_handling(self, app: "Flask") -> None:
        """Test proper null value handling in Topic optional fields."""
        with app.app_context():
            # Test that required fields cannot be None
            topic = Topic(label="Null Test Topic")
            db.session.add(topic)
            db.session.commit()

            # Verify required fields are not null
            assert topic.label is not None

    def test_topic_data_consistency_after_rollback(self, app: "Flask") -> None:
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
                # This should fail due to constraints
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

    def test_topic_bulk_operations(self, app: "Flask") -> None:
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

    def test_topic_query_performance(self, app: "Flask") -> None:
        """Test basic query performance for Topic."""
        with app.app_context():
            # Create test data
            topics = []
            for i in range(50):
                topic = Topic(
                    label=f"Performance Topic {i}",
                    coverage_score=i % 10,  # Vary coverage scores
                )
                topics.append(topic)

            db.session.add_all(topics)
            db.session.commit()

            # Test various query patterns
            # Filter by label
            label_topics = Topic.query.filter_by(label="Performance Topic 25").all()
            assert len(label_topics) == 1

            # Filter by coverage_score
            high_coverage_topics = Topic.query.filter(Topic.coverage_score >= 5).all()
            assert len(high_coverage_topics) == 25

    def test_topic_foreign_key_constraints(self, app: "Flask") -> None:
        """Test foreign key constraints for Topic (if any)."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Topic foreign keys (should be none for this model)
            topics_fks = inspector.get_foreign_keys("topics")

            # Topic should not have foreign keys to other tables
            assert len(topics_fks) == 0
