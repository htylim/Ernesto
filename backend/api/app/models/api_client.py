"""ApiClient model for storing API clients and their access tokens."""

import secrets
from datetime import datetime
from typing import ClassVar, Optional

import bcrypt
from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, validates
from typing_extensions import override

from app.extensions import db


class ApiClient(db.Model):
    """Model for storing API clients and their access tokens.

    This model represents API clients that can access the system using
    API keys for authentication. It supports secure API key generation,
    hashing, and validation.
    """

    __tablename__: ClassVar[str] = "api_clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True
    )
    hashed_api_key: Mapped[str] = mapped_column(
        String(128), unique=True, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, default=func.current_timestamp()
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    use_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __init__(
        self,
        id: Optional[int] = None,
        name: Optional[str] = None,
        hashed_api_key: Optional[str] = None,
        is_active: Optional[bool] = None,
        created_at: Optional[datetime] = None,
        last_used_at: Optional[datetime] = None,
        use_count: Optional[int] = None,
    ) -> None:
        """Create an ApiClient."""
        kwargs = {}
        if id is not None:
            kwargs["id"] = id
        if name is not None:
            kwargs["name"] = name
        if hashed_api_key is not None:
            kwargs["hashed_api_key"] = hashed_api_key
        if is_active is not None:
            kwargs["is_active"] = is_active
        if created_at is not None:
            kwargs["created_at"] = created_at
        if last_used_at is not None:
            kwargs["last_used_at"] = last_used_at
        if use_count is not None:
            kwargs["use_count"] = use_count
        super().__init__(**kwargs)

    @override
    def __repr__(self) -> str:
        """Return string representation of the ApiClient instance."""
        return f"<ApiClient {self.name}>"

    @validates("name")
    def validate_name(self, _key: str, name: str) -> str:
        """Validate that client name does not contain a dot character.

        Args:
            _key: The attribute name being validated (unused)
            name: The client name value

        Returns:
            The validated name

        Raises:
            ValueError: If the name contains a dot character

        """
        if "." in name:
            raise ValueError("Client name cannot contain a dot ('.').")
        return name

    @staticmethod
    def generate_api_key(length: int = 32) -> str:
        """Generate a cryptographically secure, URL-safe API key."""
        return secrets.token_urlsafe(length)

    def set_api_key(self, api_key: str) -> None:
        """Hash and set the API key for the client."""
        self.hashed_api_key = bcrypt.hashpw(
            api_key.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

    def check_api_key(self, api_key: str) -> bool:
        """Check if the provided API key matches the stored hash."""
        return bcrypt.checkpw(
            api_key.encode("utf-8"), self.hashed_api_key.encode("utf-8")
        )

    @classmethod
    def create_with_api_key(
        cls, name: str, is_active: bool = True
    ) -> tuple["ApiClient", str]:
        """Create a new ApiClient and return the instance and plaintext API key."""
        api_key = cls.generate_api_key()
        api_client = cls(name=name, is_active=is_active)
        api_client.set_api_key(api_key)
        return api_client, api_key
