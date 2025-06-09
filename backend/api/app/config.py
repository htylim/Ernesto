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
    DEBUG = False
    TESTING = False
    LOG_LEVEL = "INFO"
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True

    # API metadata
    API_TITLE = "Ernesto API"
    API_VERSION = "v1"

    def __init__(self) -> None:
        """Initialize configuration by reading environment variables at runtime."""
        # Security - runtime values only
        self.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

        # Database - runtime values only
        self.SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")
        self.SQLALCHEMY_TRACK_MODIFICATIONS = (
            os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", "False").lower() == "true"
        )


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    # Override constants for development
    DEBUG = True
    LOG_LEVEL = "DEBUG"

    def __init__(self) -> None:
        """Initialize development configuration."""
        super().__init__()

        # Use environment DATABASE_URI - no hardcoded fallback
        self.SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")


class TestingConfig(BaseConfig):
    """Testing environment configuration."""

    # Override constants for testing
    TESTING = True
    DEBUG = True
    LOG_LEVEL = "DEBUG"
    WTF_CSRF_ENABLED = False  # Disable CSRF protection in testing

    def __init__(self) -> None:
        """Initialize testing configuration."""
        super().__init__()

        # Use in-memory SQLite for testing by default
        self.SQLALCHEMY_DATABASE_URI = os.getenv(
            "TEST_DATABASE_URI", "sqlite:///:memory:"
        )


class ProductionConfig(BaseConfig):
    """Production environment configuration."""

    # Override constants for production
    DEBUG = False
    LOG_LEVEL = "ERROR"

    def __init__(self) -> None:
        """Initialize production configuration."""
        super().__init__()

        # Ensure SECRET_KEY is set in production
        self.SECRET_KEY = os.getenv("SECRET_KEY")

        # Production database must be explicitly set
        self.SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")


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
            f"Available configurations: {available_configs}"
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
