"""Configuration validation module.

This module provides comprehensive validation for Flask application configuration
parameters including database URLs, security parameters, and
environment-specific validation requirements.
"""

from typing import TYPE_CHECKING, List, Optional
from urllib.parse import urlparse

if TYPE_CHECKING:
    from app.config import BaseConfig


class ConfigurationError(Exception):
    """Raised when configuration validation fails."""

    def __init__(self, message: str, missing_vars: Optional[List[str]] = None) -> None:
        """Initialize configuration error.

        Args:
            message (str): Error message describing the validation failure.
            missing_vars (List[str], optional): List of missing environment variables.

        """
        super().__init__(message)
        self.missing_vars = missing_vars or []


class ConfigValidator:
    """Comprehensive configuration validator for Flask applications.

    This class provides validation methods for different types of configuration
    parameters including database URLs, security parameters,
    and environment-specific requirements.
    """

    def __init__(self, config: "BaseConfig") -> None:
        """Initialize the configuration validator.

        Args:
            config (BaseConfig): The configuration object to validate.

        """
        self.config = config
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def validate_all(self) -> None:
        """Perform comprehensive validation of all configuration parameters.

        Raises:
            ConfigurationError: If any validation checks fail.

        """
        # Reset error and warning lists
        self.errors = []
        self.warnings = []

        # Run all validation methods
        self.validate_required_fields()
        self.validate_database_config()
        self.validate_security_config()
        self.validate_application_config()
        self.validate_environment_specific()

        # Raise error if any validation failed
        if self.errors:
            error_message = "Configuration validation failed:\n" + "\n".join(
                f"  - {error}" for error in self.errors
            )
            raise ConfigurationError(error_message)

        # Log warnings if any exist
        if self.warnings:
            import warnings

            for warning in self.warnings:
                warnings.warn(f"Configuration warning: {warning}", UserWarning)

    def validate_required_fields(self) -> None:
        """Validate that all required configuration fields are present."""
        required_fields = ["SECRET_KEY", "SQLALCHEMY_DATABASE_URI"]

        # Check for production-specific requirements
        missing_fields = []
        for field in required_fields:
            value = getattr(self.config, field, None)
            if not value:
                missing_fields.append(field)

        if missing_fields:
            self.errors.append(
                f"Missing required configuration fields: {', '.join(missing_fields)}"
            )

    def validate_database_config(self) -> None:
        """Validate database configuration parameters."""
        database_uri = getattr(self.config, "SQLALCHEMY_DATABASE_URI", None)

        if not database_uri:
            self.errors.append("SQLALCHEMY_DATABASE_URI is required")
            return

        # Validate database URI format
        if not self._is_valid_database_uri(database_uri):
            self.errors.append(
                f"Invalid database URI format: {database_uri}"
                " (Expected format: scheme://[user[:password]@]host[:port]/database)"
            )

        # Validate SQLAlchemy track modifications setting
        track_modifications = getattr(
            self.config, "SQLALCHEMY_TRACK_MODIFICATIONS", True
        )
        if track_modifications and not getattr(self.config, "DEBUG", False):
            self.warnings.append(
                "SQLALCHEMY_TRACK_MODIFICATIONS should be False in production for better performance"
            )

    def validate_security_config(self) -> None:
        """Validate security-related configuration parameters."""
        # Validate SECRET_KEY strength
        secret_key = getattr(self.config, "SECRET_KEY", None)
        if secret_key:
            self._validate_secret_key_strength(secret_key)

        # Validate debug mode in production
        debug = getattr(self.config, "DEBUG", False)
        testing = getattr(self.config, "TESTING", False)

        # Check if we're in production (not debug and not testing)
        if not debug and not testing:
            # Production environment checks
            if secret_key and len(secret_key) < 32:
                self.errors.append(
                    "SECRET_KEY must be at least 32 characters long in production"
                )

    def validate_application_config(self) -> None:
        """Validate general application configuration parameters."""
        # Validate log level
        log_level = getattr(self.config, "LOG_LEVEL", "INFO")
        valid_log_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if log_level not in valid_log_levels:
            self.errors.append(
                f"Invalid log level: {log_level}. Valid options: {', '.join(valid_log_levels)}"
            )

        # Validate API metadata
        api_title = getattr(self.config, "API_TITLE", None)
        if api_title and not isinstance(api_title, str):
            self.errors.append("API_TITLE must be a string")

        api_version = getattr(self.config, "API_VERSION", None)
        if api_version and not isinstance(api_version, str):
            self.errors.append("API_VERSION must be a string")

    def validate_environment_specific(self) -> None:
        """Validate environment-specific configuration requirements."""
        debug = getattr(self.config, "DEBUG", False)
        testing = getattr(self.config, "TESTING", False)

        if testing:
            # Testing environment validations
            self._validate_testing_environment()
        elif debug:
            # Development environment validations
            self._validate_development_environment()
        else:
            # Production environment validations
            self._validate_production_environment()

    def _is_valid_database_uri(self, uri: str) -> bool:
        """Check if the database URI has a valid format.

        Args:
            uri (str): Database URI to validate.

        Returns:
            bool: True if the URI format is valid, False otherwise.

        """
        try:
            parsed = urlparse(uri)
            # Check for required components
            return bool(
                parsed.scheme and (parsed.hostname or uri.startswith("sqlite:"))
            )
        except Exception:
            return False

    def _validate_secret_key_strength(self, secret: str) -> None:
        """Validate Flask SECRET_KEY strength.

        Args:
            secret (str): Secret key to validate.

        """
        if len(secret) < 16:
            self.errors.append("SECRET_KEY must be at least 16 characters long")

        # Check for default/weak secrets
        weak_secrets = [
            "secret",
            "password",
        ]
        if secret.lower() in weak_secrets:
            if getattr(self.config, "DEBUG", False):
                self.warnings.append(
                    "Using weak SECRET_KEY in development. "
                    "Consider using a stronger secret for better security."
                )
            else:
                self.errors.append(
                    "Weak SECRET_KEY detected. Use a strong, random secret in production."
                )
        # Warn about the default development secret in development
        elif secret == "dev-secret-key-change-in-production" and getattr(
            self.config, "DEBUG", False
        ):
            self.warnings.append(
                "Using default SECRET_KEY in development. "
                "Consider using a stronger secret for better security."
            )

    def _validate_development_environment(self) -> None:
        """Validate development environment configuration."""
        # Check for development-specific settings
        database_uri = getattr(self.config, "SQLALCHEMY_DATABASE_URI", "")
        if (
            database_uri
            and "sqlite" not in database_uri.lower()
            and "postgresql" not in database_uri.lower()
        ):
            self.warnings.append(
                "Consider using SQLite or PostgreSQL for development consistency"
            )

    def _validate_testing_environment(self) -> None:
        """Validate testing environment configuration."""
        # Testing should use in-memory or temporary databases
        database_uri = getattr(self.config, "SQLALCHEMY_DATABASE_URI", "")
        if (
            database_uri
            and ":memory:" not in database_uri
            and "test" not in database_uri.lower()
        ):
            self.warnings.append(
                "Testing environment should use in-memory database or dedicated test database"
            )

    def _validate_production_environment(self) -> None:
        """Validate production environment configuration."""
        # Production-specific validations
        debug = getattr(self.config, "DEBUG", False)
        if debug:
            self.errors.append("DEBUG must be False in production")

        testing = getattr(self.config, "TESTING", False)
        if testing:
            self.errors.append("TESTING must be False in production")

        # Check for missing required configuration values in production
        missing_vars = []

        secret_key = getattr(self.config, "SECRET_KEY", None)
        database_uri = getattr(self.config, "SQLALCHEMY_DATABASE_URI", None)

        if not secret_key:
            missing_vars.append("SECRET_KEY")
        if not database_uri:
            missing_vars.append("DATABASE_URI")

        if missing_vars:
            # Use the original error message format expected by tests
            raise ValueError(
                f"Missing required environment variables for production: {', '.join(missing_vars)}"
            )

        # Check database security
        if database_uri and "sqlite" in database_uri.lower():
            self.warnings.append(
                "SQLite is not recommended for production. Consider using PostgreSQL or MySQL."
            )


def validate_config(config: "BaseConfig") -> None:
    """Validate configuration using the ConfigValidator.

    This is a convenience function that creates a ConfigValidator instance
    and runs all validation checks.

    Args:
        config (BaseConfig): The configuration object to validate.

    Raises:
        ConfigurationError: If any validation checks fail.

    """
    validator = ConfigValidator(config)
    validator.validate_all()
