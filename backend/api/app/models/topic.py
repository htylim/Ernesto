"""
Topic model for article topics.
"""

import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app import db


class Topic(db.Model):
    """Model for article topics."""

    __tablename__ = "topics"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label = db.Column(db.String(255), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    coverage_score = db.Column(db.Integer, default=0, nullable=False)
    articles = relationship(
        "Article", back_populates="topic", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Topic {self.label}>"
