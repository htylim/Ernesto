"""
Source model for news/data sources.
"""

import uuid

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .. import db


class Source(db.Model):
    """Model for news/data sources."""

    __tablename__ = "sources"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    logo_url = db.Column(db.String, nullable=True)
    name = db.Column(db.String(255), nullable=False)
    homepage_url = db.Column(db.String, nullable=True)
    is_enabled = db.Column(db.Boolean, default=True, nullable=False)
    articles = relationship(
        "Article", back_populates="source", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Source {self.name}>"
