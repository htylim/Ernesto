"""
Marshmallow schemas for API serialization/deserialization.

This module contains all the Marshmallow schemas used for converting
SQLAlchemy model instances to/from JSON for API responses and requests.
"""

from marshmallow import fields, post_dump
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.extensions import db
from app.models.article import Article
from app.models.source import Source
from app.models.topic import Topic


class SourceSchema(SQLAlchemyAutoSchema):
    """Schema for Source model serialization/deserialization."""

    class Meta:
        model = Source
        load_instance = True
        sqla_session = db.session
        include_relationships = True

    # Explicitly define UUID fields to ensure proper serialization
    id = fields.UUID(dump_only=True)

    # Optional: Add validation for URLs
    logo_url = fields.Url(allow_none=True)
    homepage_url = fields.Url(allow_none=True)

    # Computed field: article count
    article_count = fields.Method("get_article_count", dump_only=True)

    # Nested articles (exclude to avoid circular references by default)
    articles = fields.Nested(
        "ArticleSchema", many=True, exclude=("source",), dump_only=True
    )

    def get_article_count(self, source):
        """Get the count of articles for this source.

        Args:
            source (Source): The Source model instance.

        Returns:
            int: Number of articles associated with this source.
        """
        if hasattr(source, "articles"):
            return len(source.articles)
        return 0


class TopicSchema(SQLAlchemyAutoSchema):
    """Schema for Topic model serialization/deserialization."""

    class Meta:
        model = Topic
        load_instance = True
        sqla_session = db.session
        include_relationships = True

    # Explicitly define UUID fields to ensure proper serialization
    id = fields.UUID(dump_only=True)

    # Format datetime fields
    added_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    # Validation for coverage_score
    coverage_score = fields.Integer(validate=lambda x: 0 <= x <= 100)

    # Computed field: article count
    article_count = fields.Method("get_article_count", dump_only=True)

    # Nested articles (exclude to avoid circular references by default)
    articles = fields.Nested(
        "ArticleSchema", many=True, exclude=("topic",), dump_only=True
    )

    def get_article_count(self, topic):
        """Get the count of articles for this topic.

        Args:
            topic (Topic): The Topic model instance.

        Returns:
            int: Number of articles associated with this topic.
        """
        if hasattr(topic, "articles"):
            return len(topic.articles)
        return 0


class ArticleSchema(SQLAlchemyAutoSchema):
    """Schema for Article model serialization/deserialization."""

    class Meta:
        model = Article
        load_instance = True
        sqla_session = db.session
        include_relationships = True

    # Explicitly define UUID fields to ensure proper serialization
    id = fields.UUID(dump_only=True)
    topic_id = fields.UUID(allow_none=True)
    source_id = fields.UUID(allow_none=True)

    # Format datetime fields
    added_at = fields.DateTime(dump_only=True)

    # Optional: Add validation for URLs
    url = fields.Url(required=True)
    image_url = fields.Url(allow_none=True)

    # Nested schemas for relationships (exclude articles to avoid circular references)
    topic = fields.Nested(TopicSchema, exclude=("articles",), dump_only=True)
    source = fields.Nested(SourceSchema, exclude=("articles",), dump_only=True)

    @post_dump
    def add_computed_fields(self, data, **kwargs):
        """Add computed fields after serialization."""
        # Add a computed field for article age in days
        if "added_at" in data and data["added_at"]:
            from datetime import datetime

            added_date = datetime.fromisoformat(data["added_at"].replace("Z", "+00:00"))
            age_days = (
                datetime.now().replace(tzinfo=added_date.tzinfo) - added_date
            ).days
            data["age_days"] = age_days

        return data


# Create schema instances for easy import
source_schema = SourceSchema()
sources_schema = SourceSchema(many=True)

topic_schema = TopicSchema()
topics_schema = TopicSchema(many=True)

article_schema = ArticleSchema()
articles_schema = ArticleSchema(many=True)
