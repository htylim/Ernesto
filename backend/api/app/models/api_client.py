"""ApiClient model for storing API clients and their access tokens."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db


class ApiClient(db.Model):
    """Model for storing API clients and their access tokens.

    This model represents API clients that can access the system using
    API keys for authentication.
    """

    __tablename__ = "api_clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    api_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, default=func.current_timestamp()
    )

    def __repr__(self) -> str:
        """Return string representation of the ApiClient instance."""
        return f"<ApiClient {self.name}>"
