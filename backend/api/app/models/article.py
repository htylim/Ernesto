"""
Article model for storing news articles.
"""

import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.extensions import db


class Article(db.Model):
    """Model for articles."""

    __tablename__ = "articles"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = db.Column(db.Text, nullable=False)
    url = db.Column(db.String, nullable=False)
    image_url = db.Column(db.String, nullable=True)
    brief = db.Column(db.Text, nullable=True)
    topic_id = db.Column(
        UUID(as_uuid=True), db.ForeignKey("topics.id"), nullable=True, index=True
    )
    source_id = db.Column(
        UUID(as_uuid=True), db.ForeignKey("sources.id"), nullable=True, index=True
    )
    added_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    topic = relationship("Topic", back_populates="articles")
    source = relationship("Source", back_populates="articles")

    def __repr__(self):
        return f"<Article {self.title[:30]}>"
