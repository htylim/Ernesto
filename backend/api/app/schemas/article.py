"""Article schema for API serialization/deserialization."""

from typing import Any, Dict

from marshmallow import fields, post_dump
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.extensions import db
from app.models.article import Article
from app.schemas.source import SourceSchema
from app.schemas.topic import TopicSchema


class ArticleSchema(SQLAlchemyAutoSchema):
    """Schema for Article model serialization/deserialization."""

    class Meta:
        """Meta configuration for ArticleSchema."""

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
    def add_computed_fields(
        self, data: Dict[str, Any], **kwargs: object
    ) -> Dict[str, Any]:
        """Add computed fields after serialization."""
        # Add a computed field for article age in days
        if "added_at" in data and data["added_at"]:
            from datetime import datetime

            try:
                added_date = datetime.fromisoformat(
                    data["added_at"].replace("Z", "+00:00")
                )
                age_days = (
                    datetime.now().replace(tzinfo=added_date.tzinfo) - added_date
                ).days
                data["age_days"] = age_days
            except (ValueError, AttributeError):
                data["age_days"] = None
        else:
            data["age_days"] = None

        return data
