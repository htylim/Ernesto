"""Source schema for API serialization/deserialization."""

from flask_sqlalchemy.session import Session
from marshmallow import fields
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from sqlalchemy.orm import scoped_session

from app.extensions import db
from app.models.source import Source


class SourceSchema(SQLAlchemyAutoSchema):  # pyright: ignore[reportMissingTypeArgument]
    """Schema for Source model serialization/deserialization."""

    class Meta:
        """Meta configuration for SourceSchema."""

        model: type[Source] = Source
        load_instance: bool = True
        sqla_session: scoped_session[Session] = db.session
        include_relationships: bool = True

    # Explicitly define UUID fields to ensure proper serialization
    id: fields.UUID = fields.UUID(dump_only=True)

    # Optional: Add validation for URLs
    logo_url: fields.Url = fields.Url(allow_none=True)
    homepage_url: fields.Url = fields.Url(allow_none=True)

    # Computed field: article count
    article_count: fields.Method = fields.Method("get_article_count", dump_only=True)

    # Nested articles (exclude to avoid circular references by default)
    articles: fields.Nested = fields.Nested(
        "ArticleSchema", many=True, exclude=("source",), dump_only=True
    )

    def get_article_count(self, source: Source) -> int:
        """Get the count of articles for this source.

        Args:
            source (Source): The Source model instance.

        Returns:
            int: Number of articles associated with this source.

        """
        if hasattr(source, "articles"):
            return len(source.articles)
        return 0
