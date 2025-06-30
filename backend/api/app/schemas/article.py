"""Article schema for API serialization/deserialization."""

from flask_sqlalchemy.session import Session
from marshmallow import fields, post_dump
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from sqlalchemy.orm import scoped_session

from app.extensions import db
from app.models.article import Article
from app.schemas.source import SourceSchema
from app.schemas.topic import TopicSchema


class ArticleSchema(SQLAlchemyAutoSchema):  # pyright: ignore[reportMissingTypeArgument]
    """Schema for Article model serialization/deserialization."""

    class Meta:
        """Meta configuration for ArticleSchema."""

        model: type[Article] = Article
        load_instance: bool = True
        sqla_session: scoped_session[Session] = db.session
        include_relationships: bool = True

    # Explicitly define UUID fields to ensure proper serialization
    id: fields.UUID = fields.UUID(dump_only=True)
    topic_id: fields.UUID = fields.UUID(allow_none=True)
    source_id: fields.UUID = fields.UUID(allow_none=True)

    # Format datetime fields
    added_at: fields.DateTime = fields.DateTime(dump_only=True)

    # Optional: Add validation for URLs
    url: fields.Url = fields.Url(required=True)
    image_url: fields.Url = fields.Url(allow_none=True)

    # Nested schemas for relationships (exclude articles to avoid circular references)
    topic: fields.Nested = fields.Nested(
        TopicSchema, exclude=("articles",), dump_only=True
    )
    source: fields.Nested = fields.Nested(
        SourceSchema, exclude=("articles",), dump_only=True
    )

    @post_dump
    def add_computed_fields(
        self, data: dict[str, object], **_kwargs: object
    ) -> dict[str, object]:
        """Add computed fields after serialization."""
        # Add a computed field for article age in days
        if "added_at" in data and data["added_at"]:
            from datetime import datetime

            try:
                added_at_value = data["added_at"]
                if isinstance(added_at_value, str):
                    added_date = datetime.fromisoformat(
                        added_at_value.replace("Z", "+00:00")
                    )
                    age_days = (
                        datetime.now().replace(tzinfo=added_date.tzinfo) - added_date
                    ).days
                    data["age_days"] = age_days
                else:
                    data["age_days"] = None
            except (ValueError, AttributeError):
                data["age_days"] = None
        else:
            data["age_days"] = None

        return data
