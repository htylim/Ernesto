import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from . import db


class ApiClient(db.Model):
    """Model for storing API clients and their access tokens."""

    __tablename__ = "api_clients"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    api_key = db.Column(db.String(64), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    def __repr__(self):
        return f"<ApiClient {self.name}>"


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
