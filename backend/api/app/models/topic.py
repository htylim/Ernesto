"""Topic model for article topics."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, ClassVar

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing_extensions import override

from app.extensions import db

if TYPE_CHECKING:
    from app.models.article import Article


class Topic(db.Model):
    """Model for article topics.

    This model represents topics that can be associated with articles
    for categorization and organization purposes.
    """

    __tablename__: ClassVar[str] = "topics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    added_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    coverage_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    articles: Mapped[list["Article"]] = relationship(
        "Article", back_populates="topic", cascade="all, delete-orphan"
    )

    @override
    def __repr__(self) -> str:
        """Return string representation of the Topic instance."""
        return f"<Topic {self.label}>"
