"""Configuration classes for the Flask application.

This module provides environment-specific configuration classes for development,
testing, and production environments with appropriate validation.
"""

import os
from typing import Optional

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class BaseConfig:
    """Base configuration class with common settings for all environments."""

    # General Flask settings - constants
    DEBUG: bool = False
    TESTING: bool = False
    LOG_LEVEL: str = "INFO"
    JSON_SORT_KEYS: bool = False
    JSONIFY_PRETTYPRINT_REGULAR: bool = True

    # API metadata
    API_TITLE: str = "Ernesto API"
    API_VERSION: str = "v1"

    def __init__(self) -> None:
        """Initialize configuration by reading environment variables at runtime."""
        # Security - runtime values only
        self.SECRET_KEY: str = os.getenv(
            "SECRET_KEY", "dev-secret-key-change-in-production"
        )

        # Database - runtime values only
        self.SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URI", "")
        self.SQLALCHEMY_TRACK_MODIFICATIONS: bool = (
            os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", "False").lower() == "true"
        )

        # CORS configuration - runtime values only
        self.CORS_ORIGINS: list[str] = []  # Empty list by default for security
        self.CORS_METHODS: list[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        self.CORS_HEADERS: list[str] = ["Content-Type", "X-API-Key"]
        self.CORS_SUPPORTS_CREDENTIALS: bool = (
            False  # API key auth doesn't need credentials
        )


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    # Override constants for development
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"

    def __init__(self) -> None:
        """Initialize development configuration."""
        super().__init__()

        # Use environment DATABASE_URI - no hardcoded fallback
        self.SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URI", "")

        # CORS origins for development - allow localhost patterns
        self.CORS_ORIGINS: list[str] = [r"http://localhost:.*", r"http://127.0.0.1:.*"]


class TestingConfig(BaseConfig):
    """Testing environment configuration."""

    # Override constants for testing
    TESTING: bool = True
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"
    WTF_CSRF_ENABLED: bool = False  # Disable CSRF protection in testing

    def __init__(self) -> None:
        """Initialize testing configuration."""
        super().__init__()

        # Use in-memory SQLite for testing by default
        self.SQLALCHEMY_DATABASE_URI: str = os.getenv(
            "TEST_DATABASE_URI", "sqlite:///:memory:"
        )


class ProductionConfig(BaseConfig):
    """Production environment configuration."""

    # Override constants for production
    DEBUG: bool = False
    LOG_LEVEL: str = "ERROR"
    # Class-level attribute annotation to satisfy linters when overriding in __init__
    CORS_ORIGINS: list[str]

    def __init__(self) -> None:
        """Initialize production configuration."""
        super().__init__()

        # Ensure SECRET_KEY is set in production
        self.SECRET_KEY: str = os.getenv("SECRET_KEY", "")

        # Production database must be explicitly set
        self.SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URI", "")

        # Configure CORS origins for Chrome extension IDs if provided
        chrome_extension_ids: str = os.getenv("CHROME_EXTENSION_IDS", "").strip()
        if chrome_extension_ids:
            parsed_ids = [ext_id.strip() for ext_id in chrome_extension_ids.split(",")]
            filtered_ids = [ext_id for ext_id in parsed_ids if ext_id]
            if filtered_ids:
                self.CORS_ORIGINS = [
                    f"chrome-extension://{ext_id}" for ext_id in filtered_ids
                ]


# Configuration mapping for environment-based selection
config_by_name = {
    "development": DevelopmentConfig,
    "dev": DevelopmentConfig,
    "testing": TestingConfig,
    "test": TestingConfig,
    "production": ProductionConfig,
    "prod": ProductionConfig,
}


def get_config(config_name: Optional[str] = None) -> BaseConfig:
    """Get configuration instance based on environment name.

    Args:
        config_name (str): Name of the configuration environment.
                          If None, uses FLASK_ENV environment variable.
                          Defaults to 'development' if not found.

    Returns:
        BaseConfig: Configuration instance for the specified environment.

    Raises:
        ValueError: If the configuration name is not recognized.

    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    config_class = config_by_name.get(config_name.lower())

    if config_class is None:
        available_configs = ", ".join(config_by_name.keys())
        raise ValueError(
            f"Unknown configuration '{config_name}'. "
            + f"Available configurations: {available_configs}"
        )

    # Create and validate configuration instance
    config_instance = config_class()

    # Import here to avoid circular imports
    from app.validators import ConfigurationError, validate_config

    try:
        validate_config(config_instance)
    except ConfigurationError as e:
        # Re-raise as ValueError for backward compatibility with existing tests
        raise ValueError(str(e)) from e

    return config_instance
