"""Configuration classes for the Flask application.

This module provides environment-specific configuration classes for development,
testing, and production environments with appropriate validation.
"""

import os
from datetime import timedelta
from typing import Optional

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class BaseConfig:
    """Base configuration class with common settings for all environments."""

    def __init__(self) -> None:
        """Initialize configuration by reading environment variables at runtime."""
        # Security
        self.SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")

        # Database
        self.SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")
        self.SQLALCHEMY_TRACK_MODIFICATIONS = (
            os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", "False").lower() == "true"
        )

        # General Flask settings
        self.DEBUG = False
        self.TESTING = False

        # Logging
        self.LOG_LEVEL = "INFO"

        # Application settings
        self.JSON_SORT_KEYS = False
        self.JSONIFY_PRETTYPRINT_REGULAR = True

        # JWT settings
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
        self.JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
        self.JWT_ALGORITHM = "HS256"

        # JWT token location and header configuration
        self.JWT_TOKEN_LOCATION = [
            "headers"
        ]  # Only look for tokens in headers by default
        self.JWT_HEADER_NAME = "Authorization"
        self.JWT_HEADER_TYPE = "Bearer"

        # JWT cookie configuration (disabled by default, can be enabled per environment)
        self.JWT_COOKIE_SECURE = True  # Require HTTPS for cookies
        self.JWT_COOKIE_CSRF_PROTECT = (
            False  # Disabled since we're using headers by default
        )
        self.JWT_COOKIE_SAMESITE = "Strict"

        # JWT error handling configuration
        self.JWT_ERROR_MESSAGE_KEY = "message"  # Consistent error message format

        # JWT claims configuration for additional security
        self.JWT_ENCODE_ISSUER = "ernesto-api"  # Identify our API as the token issuer
        self.JWT_DECODE_ISSUER = "ernesto-api"  # Verify tokens are from our API
        self.JWT_ENCODE_AUDIENCE = "ernesto-chrome-extension"  # Target audience
        self.JWT_DECODE_AUDIENCE = "ernesto-chrome-extension"  # Verify audience

        # JWT additional security settings
        self.JWT_VERIFY_EXPIRATION = True  # Always verify token expiration
        self.JWT_VERIFY_SUB_CLAIM = True  # Verify subject claim if present
        self.JWT_BLACKLIST_ENABLED = (
            False  # Disabled by default (can be enabled if needed)
        )
        self.JWT_BLACKLIST_TOKEN_CHECKS = [
            "access",
            "refresh",
        ]  # Which tokens to check against blacklist

        # API metadata
        self.API_TITLE = "Ernesto API"
        self.API_VERSION = "v1"


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    def __init__(self) -> None:
        """Initialize development configuration."""
        super().__init__()

        self.DEBUG = True
        self.LOG_LEVEL = "DEBUG"

        # Use environment DATABASE_URI - no hardcoded fallback
        self.SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")

        # Development-specific JWT settings for easier debugging
        self.JWT_COOKIE_SECURE = False  # Allow HTTP cookies in development
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(
            hours=8
        )  # Longer tokens for development convenience


class TestingConfig(BaseConfig):
    """Testing environment configuration."""

    def __init__(self) -> None:
        """Initialize testing configuration."""
        super().__init__()

        self.TESTING = True
        self.DEBUG = True
        self.LOG_LEVEL = "DEBUG"

        # Use in-memory SQLite for testing by default
        self.SQLALCHEMY_DATABASE_URI = os.getenv(
            "TEST_DATABASE_URI", "sqlite:///:memory:"
        )

        # Disable CSRF protection in testing
        self.WTF_CSRF_ENABLED = False

        # Testing-specific JWT settings for fast test execution
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(
            minutes=5
        )  # Short-lived tokens for testing
        self.JWT_REFRESH_TOKEN_EXPIRES = timedelta(
            hours=1
        )  # Short refresh tokens for testing
        self.JWT_COOKIE_SECURE = False  # Allow HTTP in testing
        self.JWT_BLACKLIST_ENABLED = (
            False  # Disable blacklisting in tests for simplicity
        )


class ProductionConfig(BaseConfig):
    """Production environment configuration."""

    def __init__(self) -> None:
        """Initialize production configuration."""
        super().__init__()

        self.DEBUG = False
        self.LOG_LEVEL = "ERROR"

        # Ensure SECRET_KEY is set in production
        self.SECRET_KEY = os.getenv("SECRET_KEY")

        # Production database must be explicitly set
        self.SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")

        # Stricter JWT settings for production
        self.JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(
            minutes=30
        )  # Shorter expiration for security
        self.JWT_REFRESH_TOKEN_EXPIRES = timedelta(
            days=7
        )  # Shorter refresh token expiration

        # Enhanced JWT security for production
        self.JWT_COOKIE_SECURE = True  # Always require HTTPS in production
        self.JWT_VERIFY_EXPIRATION = True  # Strictly verify expiration
        self.JWT_VERIFY_SUB_CLAIM = True  # Verify subject claims

        # Production-specific JWT validation
        self.JWT_BLACKLIST_ENABLED = True  # Enable token blacklisting in production
        self.JWT_BLACKLIST_TOKEN_CHECKS = ["access", "refresh"]


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
