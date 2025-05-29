"""Unit tests for ArticleSchema.

This module tests the ArticleSchema serialization and deserialization
functionality to ensure proper API response formatting.
"""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from flask import Flask
from marshmallow import ValidationError

from app.models.article import Article
from app.models.source import Source
from app.models.topic import Topic
from app.schemas.article import ArticleSchema


class TestArticleSchema:
    """Test cases for ArticleSchema serialization and deserialization."""

    def test_article_schema_initialization(self) -> None:
        """Test that ArticleSchema can be initialized properly."""
        schema = ArticleSchema()
        assert schema is not None
        assert schema.Meta.model == Article

    def test_article_schema_serialization(self, app: Flask) -> None:
        """Test that ArticleSchema properly serializes Article model instances."""
        with app.app_context():
            # Create related models
            source = Source(
                id=uuid4(),
                name="Test Source",
            )
            topic = Topic(
                id=uuid4(),
                label="Test Topic",
            )

            # Create a test article
            article = Article(
                id=uuid4(),
                title="Test Article",
                brief="This is test article brief.",
                url="https://example.com/test-article",
                image_url="https://example.com/image.jpg",
                source_id=source.id,
                topic_id=topic.id,
                added_at=datetime.now(timezone.utc),
            )

            schema = ArticleSchema()
            result = schema.dump(article)

            # Test that all expected fields are present
            assert "id" in result
            assert "title" in result
            assert "brief" in result
            assert "url" in result
            assert "image_url" in result
            assert "source_id" in result
            assert "topic_id" in result
            assert "added_at" in result
            assert "age_days" in result  # Computed field

            # Test field values
            assert result["title"] == "Test Article"
            assert result["brief"] == "This is test article brief."
            assert result["url"] == "https://example.com/test-article"
            assert result["image_url"] == "https://example.com/image.jpg"

    def test_article_schema_deserialization(self, app: Flask) -> None:
        """Test that ArticleSchema properly deserializes data to Article instances."""
        with app.app_context():
            schema = ArticleSchema()
            data = {
                "title": "New Article",
                "brief": "Brief for the new article.",
                "url": "https://example.com/new-article",
                "image_url": "https://example.com/new-image.jpg",
                "source_id": str(uuid4()),
                "topic_id": str(uuid4()),
            }

            result = schema.load(data)

            assert isinstance(result, Article)
            assert result.title == "New Article"
            assert result.brief == "Brief for the new article."
            assert result.url == "https://example.com/new-article"
            assert result.image_url == "https://example.com/new-image.jpg"

    def test_article_schema_url_validation(self, app: Flask) -> None:
        """Test URL field validation in ArticleSchema."""
        with app.app_context():
            schema = ArticleSchema()

            # Test with valid URLs
            valid_data = {
                "title": "Valid Article",
                "brief": "Article with valid URLs",
                "url": "https://valid.com/article",
                "image_url": "https://valid.com/image.jpg",
            }
            result = schema.load(valid_data)
            assert isinstance(result, Article)

            # Test with invalid URLs
            invalid_data = {
                "title": "Invalid Article",
                "brief": "Article with invalid URLs",
                "url": "not-a-valid-url",
                "image_url": "also-not-valid",
            }
            with pytest.raises(ValidationError) as exc_info:
                schema.load(invalid_data)

            # Check that URL validation errors are present
            errors = exc_info.value.messages
            assert "url" in errors or "image_url" in errors

    def test_article_schema_required_url_field(self, app: Flask) -> None:
        """Test that url field is required in ArticleSchema."""
        with app.app_context():
            schema = ArticleSchema()

            # Test with missing required URL field
            data = {
                "title": "Article Without URL",
                "brief": "This article has no URL",
            }

            with pytest.raises(ValidationError) as exc_info:
                schema.load(data)

            # Should have validation error for missing URL
            errors = exc_info.value.messages
            assert "url" in errors

    def test_article_schema_with_none_image_url(self, app: Flask) -> None:
        """Test ArticleSchema handles None image_url properly."""
        with app.app_context():
            schema = ArticleSchema()
            data = {
                "title": "Article Without Image",
                "brief": "Article without an image",
                "url": "https://example.com/no-image",
                "image_url": None,
            }

            result = schema.load(data)
            assert isinstance(result, Article)
            assert result.image_url is None

    def test_article_schema_uuid_fields_dump_only(self, app: Flask) -> None:
        """Test that UUID id field is dump_only and cannot be loaded."""
        with app.app_context():
            schema = ArticleSchema()

            # Try to load data with an ID (should raise ValidationError)
            data = {
                "id": str(uuid4()),
                "title": "Test Article",
                "brief": "Test brief",
                "url": "https://example.com/test",
            }

            with pytest.raises(ValidationError) as exc_info:
                schema.load(data)

            # Should have validation error for id field
            errors = exc_info.value.messages
            assert "id" in errors

    def test_article_schema_add_computed_fields(self, app: Flask) -> None:
        """Test the add_computed_fields post_dump method."""
        with app.app_context():
            # Create an article with a specific added_at time
            past_time = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
            article = Article(
                id=uuid4(),
                title="Old Article",
                brief="This is an old article",
                url="https://example.com/old-article",
                added_at=past_time,
            )

            schema = ArticleSchema()
            result = schema.dump(article)

            # Test that age_days is computed and added
            assert "age_days" in result
            assert isinstance(result["age_days"], int)
            assert result["age_days"] > 0  # Should be positive for past dates

    def test_article_schema_many_serialization(self, app: Flask) -> None:
        """Test ArticleSchema serialization with many=True."""
        with app.app_context():
            articles = [
                Article(
                    id=uuid4(),
                    title=f"Article {i}",
                    brief=f"Brief {i}",
                    url=f"https://example.com/article-{i}",
                    added_at=datetime.now(timezone.utc),
                )
                for i in range(3)
            ]

            schema = ArticleSchema(many=True)
            result = schema.dump(articles)

            assert isinstance(result, list)
            assert len(result) == 3
            for i, article_data in enumerate(result):
                assert article_data["title"] == f"Article {i}"
                assert article_data["brief"] == f"Brief {i}"
                assert article_data["url"] == f"https://example.com/article-{i}"

    def test_article_schema_nested_relationships(self, app: Flask) -> None:
        """Test that nested topic and source relationships work properly."""
        with app.app_context():
            # Create models with relationships (though we won't persist them)
            source = Source(
                id=uuid4(),
                name="Test Source",
            )
            topic = Topic(
                id=uuid4(),
                label="Test Topic",
            )

            article = Article(
                id=uuid4(),
                title="Article with Relationships",
                brief="This article has topic and source",
                url="https://example.com/related-article",
                added_at=datetime.now(timezone.utc),
            )

            # Manually set relationships for testing
            article.source = source
            article.topic = topic

            schema = ArticleSchema()
            result = schema.dump(article)

            # Test that nested relationships are included
            assert "topic" in result
            assert "source" in result

            # Test nested data structure
            if result["topic"]:
                assert "label" in result["topic"]
            if result["source"]:
                assert "name" in result["source"]

    def test_article_schema_handles_missing_added_at(self, app: Flask) -> None:
        """Test that schema handles articles without added_at gracefully."""
        with app.app_context():
            article = Article(
                id=uuid4(),
                title="Article Without Date",
                brief="This article has no added_at",
                url="https://example.com/no-date",
                added_at=None,
            )

            schema = ArticleSchema()
            result = schema.dump(article)

            # Should handle missing added_at gracefully
            assert "added_at" in result
            # age_days might not be calculated or might be None
            assert "age_days" in result

    def test_article_schema_optional_foreign_keys(self, app: Flask) -> None:
        """Test that foreign key fields (topic_id, source_id) are optional."""
        with app.app_context():
            schema = ArticleSchema()

            # Test with no foreign keys
            data = {
                "title": "Standalone Article",
                "brief": "Article without topic or source",
                "url": "https://example.com/standalone",
            }

            result = schema.load(data)
            assert isinstance(result, Article)
            assert result.topic_id is None
            assert result.source_id is None
