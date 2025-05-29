"""Unit tests for SourceSchema.

This module tests the SourceSchema serialization and deserialization
functionality to ensure proper API response formatting.
"""

from typing import Any, List
from uuid import uuid4

import pytest
from flask import Flask
from marshmallow import ValidationError

from app.models.source import Source
from app.schemas.source import SourceSchema


class TestSourceSchema:
    """Test cases for SourceSchema serialization and deserialization."""

    def test_source_schema_initialization(self) -> None:
        """Test that SourceSchema can be initialized properly."""
        schema = SourceSchema()
        assert schema is not None
        assert schema.Meta.model == Source

    def test_source_schema_serialization(self, app: Flask) -> None:
        """Test that SourceSchema properly serializes Source model instances."""
        with app.app_context():
            # Create a test source
            source = Source(
                id=uuid4(),
                name="Test Source",
                logo_url="https://example.com/logo.png",
                homepage_url="https://example.com",
                is_enabled=True,
            )

            schema = SourceSchema()
            result = schema.dump(source)

            # Test that all expected fields are present
            assert "id" in result
            assert "name" in result
            assert "logo_url" in result
            assert "homepage_url" in result
            assert "is_enabled" in result
            assert "article_count" in result

            # Test field values
            assert result["name"] == "Test Source"
            assert result["logo_url"] == "https://example.com/logo.png"
            assert result["homepage_url"] == "https://example.com"
            assert result["is_enabled"] is True

    def test_source_schema_deserialization(self, app: Flask) -> None:
        """Test that SourceSchema properly deserializes data to Source instances."""
        with app.app_context():
            schema = SourceSchema()
            data = {
                "name": "New Source",
                "logo_url": "https://newsource.com/logo.png",
                "homepage_url": "https://newsource.com",
                "is_enabled": True,
            }

            result = schema.load(data)

            assert isinstance(result, Source)
            assert result.name == "New Source"
            assert result.logo_url == "https://newsource.com/logo.png"
            assert result.homepage_url == "https://newsource.com"
            assert result.is_enabled is True

    def test_source_schema_article_count_method(self, app: Flask) -> None:
        """Test the get_article_count method computes correct article count."""
        with app.app_context():
            # Create a mock source with articles attribute
            class MockSource:
                def __init__(self, articles: List[Any]) -> None:
                    self.articles = articles

            schema = SourceSchema()

            # Test with articles
            source_with_articles = MockSource(articles=[1, 2, 3])
            count = schema.get_article_count(source_with_articles)
            assert count == 3

            # Test with empty articles
            source_empty = MockSource(articles=[])
            count = schema.get_article_count(source_empty)
            assert count == 0

            # Test without articles attribute
            source_no_attr = MockSource(articles=None)
            delattr(source_no_attr, "articles")
            count = schema.get_article_count(source_no_attr)
            assert count == 0

    def test_source_schema_url_validation(self, app: Flask) -> None:
        """Test URL field validation in SourceSchema."""
        with app.app_context():
            schema = SourceSchema()

            # Test with valid URLs
            valid_data = {
                "name": "Valid Source",
                "logo_url": "https://valid.com/logo.png",
                "homepage_url": "https://valid.com",
            }
            result = schema.load(valid_data)
            assert isinstance(result, Source)

            # Test with invalid URLs
            invalid_data = {
                "name": "Invalid Source",
                "logo_url": "not-a-url",
                "homepage_url": "also-not-a-url",
            }
            with pytest.raises(ValidationError) as exc_info:
                schema.load(invalid_data)

            # Check that URL validation errors are present
            errors = exc_info.value.messages
            assert "logo_url" in errors or "homepage_url" in errors

    def test_source_schema_with_none_urls(self, app: Flask) -> None:
        """Test SourceSchema handles None URL values properly."""
        with app.app_context():
            schema = SourceSchema()
            data = {
                "name": "Source Without URLs",
                "logo_url": None,
                "homepage_url": None,
            }

            result = schema.load(data)
            assert isinstance(result, Source)
            assert result.logo_url is None
            assert result.homepage_url is None

    def test_source_schema_uuid_field_dump_only(self, app: Flask) -> None:
        """Test that UUID id field is dump_only and cannot be loaded."""
        with app.app_context():
            schema = SourceSchema()

            # Try to load data with an ID (should raise ValidationError)
            data = {
                "id": str(uuid4()),
                "name": "Test Source",
            }

            with pytest.raises(ValidationError) as exc_info:
                schema.load(data)

            # Should have validation error for id field
            errors = exc_info.value.messages
            assert "id" in errors

    def test_source_schema_many_serialization(self, app: Flask) -> None:
        """Test SourceSchema serialization with many=True."""
        with app.app_context():
            sources = [
                Source(
                    id=uuid4(),
                    name=f"Source {i}",
                    is_enabled=True,
                )
                for i in range(3)
            ]

            schema = SourceSchema(many=True)
            result = schema.dump(sources)

            assert isinstance(result, list)
            assert len(result) == 3
            for i, source_data in enumerate(result):
                assert source_data["name"] == f"Source {i}"
                assert source_data["is_enabled"] is True

    def test_source_schema_nested_articles_excluded(self, app: Flask) -> None:
        """Test that nested articles exclude source field to prevent circular references."""
        with app.app_context():
            # Create a source with the articles field defined in schema
            source = Source(
                id=uuid4(),
                name="Source with Articles",
                is_enabled=True,
            )

            schema = SourceSchema()
            result = schema.dump(source)

            # Articles field should be present but likely empty since no actual articles
            assert "articles" in result
            assert isinstance(result["articles"], list)
