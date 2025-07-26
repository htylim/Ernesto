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

    def __init__(
        self,
        id: Optional[uuid.UUID] = None,
        title: Optional[str] = None,
        url: Optional[str] = None,
        image_url: Optional[str] = None,
        brief: Optional[str] = None,
        topic_id: Optional[uuid.UUID] = None,
        source_id: Optional[uuid.UUID] = None,
        added_at: Optional[datetime] = None,
    ) -> None:
        """Create an Article."""
        kwargs = {}
        if id is not None:
            kwargs["id"] = id
        if title is not None:
            kwargs["title"] = title
        if url is not None:
            kwargs["url"] = url
        if image_url is not None:
            kwargs["image_url"] = image_url
        if brief is not None:
            kwargs["brief"] = brief
        if topic_id is not None:
            kwargs["topic_id"] = topic_id
        if source_id is not None:
            kwargs["source_id"] = source_id
        if added_at is not None:
            kwargs["added_at"] = added_at
        super().__init__(**kwargs)

    @override
    def __repr__(self) -> str:
        """Return string representation of the article."""
        return f"<Article {self.title[:30]}>"
