"""Configuration classes for the Flask application.

This module provides environment-specific configuration classes for development,
testing, and production environments with appropriate validation.
"""

import os
from typing import Optional, Type

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class BaseConfig:
    """Base configuration class with common settings for all environments."""

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")
    SQLALCHEMY_TRACK_MODIFICATIONS = (
        os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", "False").lower() == "true"
    )

    # General Flask settings
    DEBUG = False
    TESTING = False

    # Logging
    LOG_LEVEL = "INFO"

    # Application settings
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = True


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    DEBUG = True
    LOG_LEVEL = "DEBUG"

    # Use environment DATABASE_URI - no hardcoded fallback
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")

    @classmethod
    def validate_config(cls) -> None:
        """Validate that required development settings are configured."""
        database_uri = os.getenv("DATABASE_URI")
        if not database_uri:
            raise ValueError(
                "DATABASE_URI must be set for development environment. "
                "Please set it in your .env file or environment variables."
            )


class TestingConfig(BaseConfig):
    """Testing environment configuration."""

    TESTING = True
    DEBUG = True
    LOG_LEVEL = "DEBUG"

    # Use in-memory SQLite for testing by default
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URI", "sqlite:///:memory:")

    # Disable CSRF protection in testing
    WTF_CSRF_ENABLED = False


class ProductionConfig(BaseConfig):
    """Production environment configuration."""

    DEBUG = False
    LOG_LEVEL = "ERROR"

    # Ensure SECRET_KEY is set in production
    SECRET_KEY = os.getenv("SECRET_KEY")

    # Production database must be explicitly set
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")

    @classmethod
    def validate_config(cls) -> None:
        """Validate that required production settings are configured."""
        # Check current environment variables directly for validation
        secret_key = os.getenv("SECRET_KEY")
        database_uri = os.getenv("DATABASE_URI")

        if not secret_key:
            raise ValueError("SECRET_KEY must be set in production environment")
        if not database_uri:
            raise ValueError("DATABASE_URI must be set in production environment")


# Configuration mapping for environment-based selection
config_by_name = {
    "development": DevelopmentConfig,
    "dev": DevelopmentConfig,
    "testing": TestingConfig,
    "test": TestingConfig,
    "production": ProductionConfig,
    "prod": ProductionConfig,
}


def get_config(config_name: Optional[str] = None) -> Type[BaseConfig]:
    """Get configuration class based on environment name.

    Args:
        config_name (str): Name of the configuration environment.
                          If None, uses FLASK_ENV environment variable.
                          Defaults to 'development' if not found.

    Returns:
        class: Configuration class for the specified environment.

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

    # Validate configuration based on environment
    if config_class == ProductionConfig:
        config_class.validate_config()
    elif config_class == DevelopmentConfig:
        config_class.validate_config()

    return config_class
