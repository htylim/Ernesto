"""Schemas package for the Ernesto API.

This package contains all Marshmallow schemas organized in separate files.
All schemas and schema instances are imported here for backward compatibility and convenience.
"""

from .article import ArticleSchema
from .source import SourceSchema
from .topic import TopicSchema

# Create schema instances for easy import (maintaining backward compatibility)
source_schema = SourceSchema()
sources_schema = SourceSchema(many=True)

topic_schema = TopicSchema()
topics_schema = TopicSchema(many=True)

article_schema = ArticleSchema()
articles_schema = ArticleSchema(many=True)

__all__ = [
    # Schema classes
    "SourceSchema",
    "TopicSchema",
    "ArticleSchema",
    # Schema instances
    "source_schema",
    "sources_schema",
    "topic_schema",
    "topics_schema",
    "article_schema",
    "articles_schema",
]
