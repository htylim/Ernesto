"""Configuration classes for the Flask application.

This module provides environment-specific configuration classes for development,
testing, and production environments with appropriate validation.
"""

import os
from datetime import timedelta
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

    # JWT settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ALGORITHM = "HS256"

    # JWT token location and header configuration
    JWT_TOKEN_LOCATION = ["headers"]  # Only look for tokens in headers by default
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # JWT cookie configuration (disabled by default, can be enabled per environment)
    JWT_COOKIE_SECURE = True  # Require HTTPS for cookies
    JWT_COOKIE_CSRF_PROTECT = False  # Disabled since we're using headers by default
    JWT_COOKIE_SAMESITE = "Strict"

    # JWT error handling configuration
    JWT_ERROR_MESSAGE_KEY = "message"  # Consistent error message format

    # JWT claims configuration for additional security
    JWT_ENCODE_ISSUER = "ernesto-api"  # Identify our API as the token issuer
    JWT_DECODE_ISSUER = "ernesto-api"  # Verify tokens are from our API
    JWT_ENCODE_AUDIENCE = "ernesto-chrome-extension"  # Target audience
    JWT_DECODE_AUDIENCE = "ernesto-chrome-extension"  # Verify audience

    # JWT additional security settings
    JWT_VERIFY_EXPIRATION = True  # Always verify token expiration
    JWT_VERIFY_SUB_CLAIM = True  # Verify subject claim if present
    JWT_BLACKLIST_ENABLED = False  # Disabled by default (can be enabled if needed)
    JWT_BLACKLIST_TOKEN_CHECKS = [
        "access",
        "refresh",
    ]  # Which tokens to check against blacklist

    # API metadata
    API_TITLE = "Ernesto API"
    API_VERSION = "v1"


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    DEBUG = True
    LOG_LEVEL = "DEBUG"

    # Use environment DATABASE_URI - no hardcoded fallback
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")

    # Development-specific JWT settings for easier debugging
    JWT_COOKIE_SECURE = False  # Allow HTTP cookies in development
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=8
    )  # Longer tokens for development convenience

    @classmethod
    def validate_config(cls) -> None:
        """Validate that required development settings are configured."""
        database_uri = os.getenv("DATABASE_URI")
        if not database_uri:
            raise ValueError(
                "DATABASE_URI must be set for development environment. "
                "Please set it in your .env file or environment variables."
            )

        # Warn if using default JWT secret in development
        jwt_secret = os.getenv("JWT_SECRET_KEY")
        if not jwt_secret or jwt_secret == "jwt-secret-key":
            import warnings

            warnings.warn(
                "Using default JWT_SECRET_KEY in development. "
                "Consider setting a custom JWT_SECRET_KEY in your .env file for better security.",
                UserWarning,
                stacklevel=2,
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

    # Testing-specific JWT settings for fast test execution
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)  # Short-lived tokens for testing
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(hours=1)  # Short refresh tokens for testing
    JWT_COOKIE_SECURE = False  # Allow HTTP in testing
    JWT_BLACKLIST_ENABLED = False  # Disable blacklisting in tests for simplicity


class ProductionConfig(BaseConfig):
    """Production environment configuration."""

    DEBUG = False
    LOG_LEVEL = "ERROR"

    # Ensure SECRET_KEY is set in production
    SECRET_KEY = os.getenv("SECRET_KEY")

    # Production database must be explicitly set
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URI")

    # Stricter JWT settings for production
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)  # Shorter expiration for security
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)  # Shorter refresh token expiration

    # Enhanced JWT security for production
    JWT_COOKIE_SECURE = True  # Always require HTTPS in production
    JWT_VERIFY_EXPIRATION = True  # Strictly verify expiration
    JWT_VERIFY_SUB_CLAIM = True  # Verify subject claims

    # Production-specific JWT validation
    JWT_BLACKLIST_ENABLED = True  # Enable token blacklisting in production
    JWT_BLACKLIST_TOKEN_CHECKS = ["access", "refresh"]

    @classmethod
    def validate_config(cls) -> None:
        """Validate that required production settings are configured."""
        # Check current environment variables directly for validation
        secret_key = os.getenv("SECRET_KEY")
        database_uri = os.getenv("DATABASE_URI")
        jwt_secret_key = os.getenv("JWT_SECRET_KEY")

        missing_vars = []
        if not secret_key:
            missing_vars.append("SECRET_KEY")
        if not database_uri:
            missing_vars.append("DATABASE_URI")
        if not jwt_secret_key:
            missing_vars.append("JWT_SECRET_KEY")

        if missing_vars:
            raise ValueError(
                f"Missing required environment variables for production: {', '.join(missing_vars)}"
            )


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
