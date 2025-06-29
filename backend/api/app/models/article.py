"""Article model for storing news articles."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, ClassVar, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing_extensions import override

from app.extensions import db

if TYPE_CHECKING:
    from app.models.source import Source
    from app.models.topic import Topic


class Article(db.Model):
    """Model for storing news articles.

    Represents individual news articles with metadata including title, URL,
    brief description, and relationships to topics and sources.
    """

    __tablename__: ClassVar[str] = "articles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    brief: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    topic_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topics.id"), nullable=True, index=True
    )
    source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id"), nullable=True, index=True
    )
    added_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    topic: Mapped[Optional["Topic"]] = relationship("Topic", back_populates="articles")
    source: Mapped[Optional["Source"]] = relationship(
        "Source", back_populates="articles"
    )

    @override
    def __repr__(self) -> str:
        """Return string representation of the article."""
        return f"<Article {self.title[:30]}>"
