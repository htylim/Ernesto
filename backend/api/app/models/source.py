"""Source model for storing news sources."""

import uuid
from typing import TYPE_CHECKING, ClassVar, Optional

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing_extensions import override

from app.extensions import db

if TYPE_CHECKING:
    from app.models.article import Article


class Source(db.Model):
    """Model for news/data sources.

    This model represents external news sources from which articles
    are collected and stored in the system.
    """

    __tablename__: ClassVar[str] = "sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    logo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    homepage_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    articles: Mapped[list["Article"]] = relationship(
        "Article", back_populates="source", cascade="all, delete-orphan"
    )

    def __init__(
        self,
        id: Optional[uuid.UUID] = None,
        logo_url: Optional[str] = None,
        name: Optional[str] = None,
        homepage_url: Optional[str] = None,
        is_enabled: Optional[bool] = None,
    ) -> None:
        """Create a Source."""
        kwargs = {}
        if id is not None:
            kwargs["id"] = id
        if logo_url is not None:
            kwargs["logo_url"] = logo_url
        if name is not None:
            kwargs["name"] = name
        if homepage_url is not None:
            kwargs["homepage_url"] = homepage_url
        if is_enabled is not None:
            kwargs["is_enabled"] = is_enabled
        super().__init__(**kwargs)

    @override
    def __repr__(self) -> str:
        """Return string representation of the Source instance."""
        return f"<Source {self.name}>"
