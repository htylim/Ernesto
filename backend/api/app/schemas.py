"""
Marshmallow schemas for API serialization/deserialization.

This module contains all the Marshmallow schemas used for converting
SQLAlchemy model instances to/from JSON for API responses and requests.
"""

from marshmallow import fields
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

    # Nested schemas for relationships
    topic = fields.Nested(TopicSchema, dump_only=True)
    source = fields.Nested(SourceSchema, dump_only=True)


# Create schema instances for easy import
source_schema = SourceSchema()
sources_schema = SourceSchema(many=True)

topic_schema = TopicSchema()
topics_schema = TopicSchema(many=True)

article_schema = ArticleSchema()
articles_schema = ArticleSchema(many=True)
