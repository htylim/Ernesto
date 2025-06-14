"""Test configuration validators module.

This module tests the configuration validation framework without testing
actual database connectivity.
"""

import warnings
from unittest.mock import patch

import pytest

# NOTE: TestingConfig needs to be imported as EnvTestingConfig to not confuse pytest into thinking it as a Class containing tests
from app.config import BaseConfig, DevelopmentConfig, ProductionConfig
from app.config import TestingConfig as EnvTestingConfig
from app.validators import ConfigurationError, ConfigValidator, validate_config


class TestConfigurationError:
    """Test ConfigurationError exception class."""

    def test_configuration_error_with_message_only(self) -> None:
        """Test ConfigurationError with message only."""
        error = ConfigurationError("Test error message")
        assert str(error) == "Test error message"
        assert error.missing_vars == []  # Default empty list

    def test_configuration_error_with_missing_vars(self) -> None:
        """Test ConfigurationError with missing variables."""
        missing_vars = ["SECRET_KEY", "DATABASE_URI"]
        error = ConfigurationError("Test error", missing_vars)
        assert error.missing_vars == missing_vars
        assert str(error) == "Test error"


class TestConfigValidator:
    """Test ConfigValidator class."""

    def test_config_validator_initialization(self) -> None:
        """Test ConfigValidator initialization."""
        config = BaseConfig()
        validator = ConfigValidator(config)
        assert validator.config == config
        assert validator.errors == []
        assert validator.warnings == []

    def test_validate_all_success(self) -> None:
        """Test successful validation with no errors or warnings."""
        config = BaseConfig()
        config.SECRET_KEY = "a-very-secure-secret-key-for-testing"
        config.SQLALCHEMY_DATABASE_URI = "sqlite:///test.db"
        config.DEBUG = True  # Development mode

        validator = ConfigValidator(config)

        # Should not raise any exceptions
        validator.validate_all()

    def test_validate_all_with_errors_raises_exception(self) -> None:
        """Test that validation raises ConfigurationError when errors exist."""
        config = BaseConfig()
        config.SECRET_KEY = None  # Missing required field
        config.SQLALCHEMY_DATABASE_URI = None  # Missing required field
        config.DEBUG = True  # Set to development mode to avoid production validation

        validator = ConfigValidator(config)

        with pytest.raises(ConfigurationError) as exc_info:
            validator.validate_all()

        assert "Configuration validation failed" in str(exc_info.value)

    def test_validate_all_with_warnings_shows_warnings(self) -> None:
        """Test that validation shows warnings."""
        config = BaseConfig()
        config.SECRET_KEY = "dev-secret-key-change-in-production"  # Default secret
        config.SQLALCHEMY_DATABASE_URI = "sqlite:///test.db"
        config.DEBUG = True  # Development mode

        validator = ConfigValidator(config)

        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            validator.validate_all()

            # Should have warnings about default secrets
            warning_messages = [str(warning.message) for warning in w]
            assert any("default SECRET_KEY" in msg for msg in warning_messages)


class TestValidateRequiredFields:
    """Test validate_required_fields method."""

    def test_validate_required_fields_success(self) -> None:
        """Test successful required fields validation."""
        config = BaseConfig()
        config.SECRET_KEY = "secure-secret"
        config.SQLALCHEMY_DATABASE_URI = "sqlite:///test.db"
        config.DEBUG = True  # Development mode

        validator = ConfigValidator(config)
        validator.validate_required_fields()

        assert validator.errors == []

    def test_validate_required_fields_missing_secret_key(self) -> None:
        """Test validation fails when SECRET_KEY is missing."""
        config = BaseConfig()
        config.SECRET_KEY = None
        config.SQLALCHEMY_DATABASE_URI = "sqlite:///test.db"

        validator = ConfigValidator(config)
        validator.validate_required_fields()

        assert len(validator.errors) == 1
        assert "SECRET_KEY" in validator.errors[0]

    def test_validate_required_fields_missing_database_uri(self) -> None:
        """Test validation fails when SQLALCHEMY_DATABASE_URI is missing."""
        config = BaseConfig()
        config.SECRET_KEY = "secure-secret"
        config.SQLALCHEMY_DATABASE_URI = None

        validator = ConfigValidator(config)
        validator.validate_required_fields()

        assert len(validator.errors) == 1
        assert "SQLALCHEMY_DATABASE_URI" in validator.errors[0]


class TestValidateDatabaseConfig:
    """Test validate_database_config method."""

    def test_validate_database_config_valid_sqlite(self) -> None:
        """Test validation of valid SQLite database URI."""
        config = BaseConfig()
        config.SQLALCHEMY_DATABASE_URI = "sqlite:///test.db"

        validator = ConfigValidator(config)
        validator.validate_database_config()

        assert validator.errors == []

    def test_validate_database_config_valid_postgresql(self) -> None:
        """Test validation of valid PostgreSQL database URI."""
        config = BaseConfig()
        config.SQLALCHEMY_DATABASE_URI = "postgresql://user:pass@localhost:5432/dbname"

        validator = ConfigValidator(config)
        validator.validate_database_config()

        assert validator.errors == []

    def test_validate_database_config_invalid_format(self) -> None:
        """Test validation fails with invalid database URI format."""
        config = BaseConfig()
        config.SQLALCHEMY_DATABASE_URI = "invalid-uri-format"

        validator = ConfigValidator(config)
        validator.validate_database_config()

        assert len(validator.errors) == 1
        assert "Invalid database URI format" in validator.errors[0]

    def test_validate_database_config_missing_uri(self) -> None:
        """Test validation fails when database URI is missing."""
        config = BaseConfig()
        config.SQLALCHEMY_DATABASE_URI = None

        validator = ConfigValidator(config)
        validator.validate_database_config()

        assert len(validator.errors) == 1
        assert "SQLALCHEMY_DATABASE_URI is required" in validator.errors[0]

    def test_validate_database_config_track_modifications_warning(self) -> None:
        """Test warning for SQLALCHEMY_TRACK_MODIFICATIONS in production."""
        config = BaseConfig()
        config.SQLALCHEMY_DATABASE_URI = "sqlite:///test.db"
        config.SQLALCHEMY_TRACK_MODIFICATIONS = True
        config.DEBUG = False  # Production mode

        validator = ConfigValidator(config)
        validator.validate_database_config()

        assert len(validator.warnings) == 1
        assert "SQLALCHEMY_TRACK_MODIFICATIONS" in validator.warnings[0]


class TestValidateSecurityConfig:
    """Test validate_security_config method."""

    def test_validate_security_config_strong_secret(self) -> None:
        """Test validation with strong SECRET_KEY."""
        config = BaseConfig()
        config.SECRET_KEY = "a-very-secure-secret-key-for-testing"
        config.DEBUG = True

        validator = ConfigValidator(config)
        validator.validate_security_config()

        assert validator.errors == []

    def test_validate_security_config_weak_secret_development(self) -> None:
        """Test warning for weak SECRET_KEY in development."""
        config = BaseConfig()
        config.SECRET_KEY = "dev-secret-key-change-in-production"  # Default weak secret
        config.DEBUG = True  # Development mode

        validator = ConfigValidator(config)
        validator.validate_security_config()

        assert len(validator.warnings) == 1
        assert "default SECRET_KEY" in validator.warnings[0]

    def test_validate_security_config_weak_secret_production(self) -> None:
        """Test error for weak SECRET_KEY in production."""
        config = BaseConfig()
        config.SECRET_KEY = "secret"  # Weak secret (multiple validation failures)
        config.DEBUG = False  # Production mode
        config.TESTING = False

        validator = ConfigValidator(config)
        validator.validate_security_config()

        # Should have multiple errors for the weak/short secret
        assert len(validator.errors) >= 1
        assert any("SECRET_KEY" in error for error in validator.errors)

    def test_validate_security_config_short_secret_production(self) -> None:
        """Test error for short SECRET_KEY in production."""
        config = BaseConfig()
        config.SECRET_KEY = "short"  # Too short for production
        config.DEBUG = False  # Production mode
        config.TESTING = False

        validator = ConfigValidator(config)
        validator.validate_security_config()

        # Should have at least one error for the short secret
        assert len(validator.errors) >= 1
        assert any("SECRET_KEY" in error for error in validator.errors)


class TestValidateApplicationConfig:
    """Test validate_application_config method."""

    def test_validate_application_config_valid_log_level(self) -> None:
        """Test validation with valid log level."""
        config = BaseConfig()
        config.LOG_LEVEL = "INFO"

        validator = ConfigValidator(config)
        validator.validate_application_config()

        assert validator.errors == []

    def test_validate_application_config_invalid_log_level(self) -> None:
        """Test validation fails with invalid log level."""
        config = BaseConfig()
        config.LOG_LEVEL = "INVALID_LEVEL"

        validator = ConfigValidator(config)
        validator.validate_application_config()

        assert len(validator.errors) == 1
        assert "Invalid log level" in validator.errors[0]

    def test_validate_application_config_invalid_api_title(self) -> None:
        """Test validation fails with invalid API title."""
        config = BaseConfig()
        config.API_TITLE = 123  # Should be string

        validator = ConfigValidator(config)
        validator.validate_application_config()

        assert len(validator.errors) == 1
        assert "API_TITLE must be a string" in validator.errors[0]

    def test_validate_application_config_invalid_api_version(self) -> None:
        """Test validation fails with invalid API version."""
        config = BaseConfig()
        config.API_VERSION = 1.0  # Should be string

        validator = ConfigValidator(config)
        validator.validate_application_config()

        assert len(validator.errors) == 1
        assert "API_VERSION must be a string" in validator.errors[0]


class TestValidateEnvironmentSpecific:
    """Test validate_environment_specific method."""

    def test_validate_environment_specific_testing(self) -> None:
        """Test environment-specific validation for testing."""
        config = EnvTestingConfig()

        validator = ConfigValidator(config)
        validator.validate_environment_specific()

        # Should not raise errors for testing environment
        assert validator.errors == []

    def test_validate_environment_specific_development(self) -> None:
        """Test environment-specific validation for development."""
        config = DevelopmentConfig()

        validator = ConfigValidator(config)
        validator.validate_environment_specific()

        # Should not raise errors for development environment
        assert validator.errors == []

    @patch.dict(
        "os.environ",
        {
            "SECRET_KEY": "a-very-secure-secret-key-for-production-testing",
            "DATABASE_URI": "postgresql://user:pass@localhost:5432/prod_db",
        },
    )
    def test_validate_environment_specific_production(self) -> None:
        """Test environment-specific validation for production."""
        config = ProductionConfig()

        validator = ConfigValidator(config)
        validator.validate_environment_specific()

        # Should not raise errors for properly configured production
        assert validator.errors == []


class TestValidateConfigFunction:
    """Test validate_config standalone function."""

    def test_validate_config_success(self) -> None:
        """Test successful config validation."""
        config = BaseConfig()
        config.SECRET_KEY = "a-very-secure-secret-key-for-testing"
        config.SQLALCHEMY_DATABASE_URI = "sqlite:///test.db"
        config.DEBUG = True

        # Should not raise any exceptions
        validate_config(config)

    def test_validate_config_failure(self) -> None:
        """Test config validation failure."""
        config = BaseConfig()
        config.SECRET_KEY = None  # Missing required field
        config.SQLALCHEMY_DATABASE_URI = None  # Missing required field
        config.DEBUG = True  # Set to development mode to test required field validation

        with pytest.raises(ConfigurationError):
            validate_config(config)


class TestPrivateValidationMethods:
    """Test private validation methods."""

    def test_is_valid_database_uri_sqlite(self) -> None:
        """Test _is_valid_database_uri with SQLite URI."""
        config = BaseConfig()
        validator = ConfigValidator(config)

        assert validator._is_valid_database_uri("sqlite:///test.db") is True
        assert validator._is_valid_database_uri("sqlite:///:memory:") is True

    def test_is_valid_database_uri_postgresql(self) -> None:
        """Test _is_valid_database_uri with PostgreSQL URI."""
        config = BaseConfig()
        validator = ConfigValidator(config)

        uri = "postgresql://user:pass@localhost:5432/dbname"
        assert validator._is_valid_database_uri(uri) is True

    def test_is_valid_database_uri_invalid(self) -> None:
        """Test _is_valid_database_uri with invalid URI."""
        config = BaseConfig()
        validator = ConfigValidator(config)

        assert validator._is_valid_database_uri("invalid-uri") is False
        assert validator._is_valid_database_uri("") is False

    def test_validate_secret_key_strength_secure(self) -> None:
        """Test _validate_secret_key_strength with secure secret."""
        config = BaseConfig()
        config.DEBUG = True
        validator = ConfigValidator(config)

        validator._validate_secret_key_strength("a-very-secure-secret-key")
        assert validator.errors == []

    def test_validate_secret_key_strength_weak(self) -> None:
        """Test _validate_secret_key_strength with weak secret."""
        config = BaseConfig()
        config.DEBUG = True
        validator = ConfigValidator(config)

        validator._validate_secret_key_strength("dev-secret-key-change-in-production")
        assert len(validator.warnings) == 1
