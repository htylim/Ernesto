"""Topic schema for API serialization/deserialization."""

from typing import TYPE_CHECKING

from marshmallow import fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema

from app.extensions import db
from app.models.topic import Topic

if TYPE_CHECKING:
    pass


class TopicSchema(SQLAlchemyAutoSchema):
    """Schema for Topic model serialization/deserialization."""

    class Meta:
        """Meta configuration for TopicSchema."""

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
    coverage_score = fields.Integer(
        validate=validate.Range(min=0, max=100), load_default=0
    )

    # Computed field: article count
    article_count = fields.Method("get_article_count", dump_only=True)

    # Nested articles (exclude to avoid circular references by default)
    articles = fields.Nested(
        "ArticleSchema", many=True, exclude=("topic",), dump_only=True
    )

    def get_article_count(self, topic: Topic) -> int:
        """Get the count of articles for this topic.

        Args:
            topic (Topic): The Topic model instance.

        Returns:
            int: Number of articles associated with this topic.

        """
        if hasattr(topic, "articles"):
            return len(topic.articles)
        return 0
