# these comments are temporary until we move from marshmallow to pydantic
# pyright: reportCallIssue=false
# pyright: reportArgumentType=false

"""Unit tests for TopicSchema.

This module tests the TopicSchema serialization and deserialization
functionality to ensure proper API response formatting.
"""

import time
from datetime import datetime
from typing import Any
from uuid import uuid4

import pytest
from flask import Flask
from marshmallow import ValidationError

from app.models.topic import Topic
from app.schemas.topic import TopicSchema


class TestTopicSchema:
    """Test cases for TopicSchema serialization and deserialization."""

    def test_topic_schema_initialization(self) -> None:
        """Test that TopicSchema can be initialized properly."""
        schema = TopicSchema()
        assert schema is not None
        assert schema.Meta.model == Topic

    def test_topic_schema_serialization(self, app: Flask) -> None:
        """Test that TopicSchema properly serializes Topic model instances."""
        with app.app_context():
            # Create a test topic
            topic = Topic(
                id=uuid4(),
                label="Technology",
                coverage_score=85,
                added_at=datetime.now(),
                updated_at=datetime.now(),
            )

            schema = TopicSchema()
            result = schema.dump(topic)

            # Test that all expected fields are present
            assert "id" in result
            assert "label" in result
            assert "coverage_score" in result
            assert "added_at" in result
            assert "updated_at" in result
            assert "article_count" in result

            # Test field values
            assert result["label"] == "Technology"
            assert result["coverage_score"] == 85

    def test_topic_schema_deserialization(self, app: Flask) -> None:
        """Test that TopicSchema properly deserializes data to Topic instances."""
        with app.app_context():
            schema = TopicSchema()
            data = {
                "label": "Science",
                "coverage_score": 75,
            }

            result = schema.load(data)

            assert isinstance(result, Topic)
            assert result.label == "Science"
            assert result.coverage_score == 75

    def test_topic_schema_coverage_score_validation(self, app: Flask) -> None:
        """Test coverage_score validation in TopicSchema."""
        with app.app_context():
            schema = TopicSchema()

            # Test with valid coverage scores
            valid_scores = [0, 50, 100]
            for score in valid_scores:
                data = {
                    "label": f"Topic {score}",
                    "coverage_score": score,
                }
                result = schema.load(data)
                assert isinstance(result, Topic)
                assert result.coverage_score == score

            # Test with invalid coverage scores
            invalid_scores = [-1, 101, 150]
            for score in invalid_scores:
                data = {
                    "label": "Invalid Topic",
                    "coverage_score": score,
                }
                with pytest.raises(ValidationError) as exc_info:
                    schema.load(data)

                # Check that coverage_score validation error is present
                errors = exc_info.value.messages
                assert "coverage_score" in errors

    def test_topic_schema_article_count_method(self, app: Flask) -> None:
        """Test the get_article_count method computes correct article count."""
        with app.app_context():
            # Create a mock topic with articles attribute
            class MockTopic:
                def __init__(self, articles: list[Any]) -> None:
                    self.articles: list[Any] = articles

            schema = TopicSchema()

            # Test with articles
            topic_with_articles = MockTopic(articles=[1, 2, 3, 4])
            count = schema.get_article_count(topic_with_articles)
            assert count == 4

            # Test with empty articles
            topic_empty = MockTopic(articles=[])
            count = schema.get_article_count(topic_empty)
            assert count == 0

            # Test without articles attribute
            topic_no_attr = MockTopic(articles=None)
            delattr(topic_no_attr, "articles")
            count = schema.get_article_count(topic_no_attr)
            assert count == 0

    def test_topic_schema_datetime_fields(self, app: Flask) -> None:
        """Test that datetime fields are properly formatted in serialization."""
        with app.app_context():
            now = datetime.now()
            topic = Topic(
                id=uuid4(),
                label="Time Test Topic",
                added_at=now,
                updated_at=now,
            )

            schema = TopicSchema()
            result = schema.dump(topic)

            # Test that datetime fields are present and properly formatted
            assert "added_at" in result
            assert "updated_at" in result
            assert result["added_at"] is not None
            assert result["updated_at"] is not None

    def test_topic_schema_uuid_field_dump_only(self, app: Flask) -> None:
        """Test that UUID id field is dump_only and cannot be loaded."""
        with app.app_context():
            schema = TopicSchema()

            # Try to load data with an ID (should raise ValidationError)
            data = {
                "id": str(uuid4()),
                "label": "Test Topic",
                "coverage_score": 50,
            }

            with pytest.raises(ValidationError) as exc_info:
                schema.load(data)

            # Should have validation error for id field
            errors = exc_info.value.messages
            assert "id" in errors

    def test_topic_schema_many_serialization(self, app: Flask) -> None:
        """Test TopicSchema serialization with many=True."""
        with app.app_context():
            topics = [
                Topic(
                    id=uuid4(),
                    label=f"Topic {i}",
                    coverage_score=50 + i * 10,
                    added_at=datetime.now(),
                )
                for i in range(3)
            ]

            schema = TopicSchema(many=True)
            result = schema.dump(topics)

            assert isinstance(result, list)
            assert len(result) == 3
            for i, topic_data in enumerate(result):
                assert topic_data["label"] == f"Topic {i}"
                assert topic_data["coverage_score"] == 50 + i * 10

    def test_topic_schema_nested_articles_excluded(self, app: Flask) -> None:
        """Test that nested articles exclude topic field to prevent circular references."""
        with app.app_context():
            # Create a topic with the articles field defined in schema
            topic = Topic(
                id=uuid4(),
                label="Topic with Articles",
                coverage_score=80,
                added_at=datetime.now(),
            )

            schema = TopicSchema()
            result = schema.dump(topic)

            # Articles field should be present but likely empty since no actual articles
            assert "articles" in result
            assert isinstance(result["articles"], list)

    def test_topic_schema_required_fields(self, app: Flask) -> None:
        """Test that required fields are properly validated."""
        with app.app_context():
            schema = TopicSchema()

            # Test with missing required label field
            data = {
                "coverage_score": 50,
            }

            with pytest.raises(ValidationError) as exc_info:
                schema.load(data)

            # Should have validation error for missing label
            errors = exc_info.value.messages
            assert "label" in errors

    def test_topic_schema_optional_fields(self, app: Flask) -> None:
        """Test that optional fields work properly."""
        with app.app_context():
            schema = TopicSchema()

            # Test with only required fields
            data = {
                "label": "Minimal Topic",
            }

            result = schema.load(data)
            assert isinstance(result, Topic)
            assert result.label == "Minimal Topic"
            # Optional fields should have default values
            assert result.coverage_score is None or isinstance(
                result.coverage_score, int
            )

    def test_large_dataset_serialization_performance(self, app: Flask) -> None:
        """Test serialization performance with large datasets."""
        with app.app_context():
            # Create a large number of topics
            topics = [
                Topic(
                    id=uuid4(),
                    label=f"Performance Topic {i}",
                    coverage_score=50 + (i % 50),
                    added_at=datetime.now(),
                    updated_at=datetime.now(),
                )
                for i in range(100)
            ]

            schema = TopicSchema(many=True)

            # Measure serialization time
            start_time = time.time()
            result = schema.dump(topics)
            end_time = time.time()

            # Performance should be reasonable (less than 1 second for 100 items)
            elapsed_time = end_time - start_time
            assert (
                elapsed_time < 1.0
            ), f"Serialization took {elapsed_time:.2f}s, expected < 1.0s"

            # Verify correct serialization
            assert isinstance(result, list)
            assert len(result) == 100
            assert all("label" in item for item in result)

    def test_comprehensive_circular_reference_prevention(self, app: Flask) -> None:
        """Test comprehensive circular reference prevention in nested articles."""
        with app.app_context():
            from app.models.article import Article

            # Create topic with potential circular relationship
            topic = Topic(
                id=uuid4(),
                label="Circular Test Topic",
                coverage_score=80,
                added_at=datetime.now(),
            )

            # Create articles that reference this topic
            articles = [
                Article(
                    id=uuid4(),
                    title=f"Circular Article {i}",
                    url=f"https://test.com/circular-{i}",
                    topic_id=topic.id,
                )
                for i in range(3)
            ]

            # Set up circular relationships
            for article in articles:
                article.topic = topic
            topic.articles = articles

            # Test that serialization handles circular references properly
            schema = TopicSchema()
            result = schema.dump(topic)

            assert "articles" in result
            assert isinstance(result["articles"], list)

            # If articles are included, they should not include topic to prevent circular refs
            for article_data in result["articles"]:
                assert "topic" not in article_data or article_data["topic"] is None
