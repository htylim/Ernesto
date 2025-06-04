"""Tests for configuration classes and utilities.

This module tests the configuration classes (BaseConfig, DevelopmentConfig,
AppTestingConfig, ProductionConfig) and the configuration mapping utilities.
"""

import os
import warnings
from unittest.mock import patch

import pytest

from app.config import (
    AppTestingConfig,
    BaseConfig,
    DevelopmentConfig,
    ProductionConfig,
    config_by_name,
    get_config,
)


class TestBaseConfig:
    """Test the base configuration class."""

    def test_base_config_defaults(self) -> None:
        """Test that BaseConfig has expected default values."""
        config = BaseConfig()
        assert config.DEBUG is False
        assert config.TESTING is False
        assert config.LOG_LEVEL == "INFO"
        assert config.JSON_SORT_KEYS is False
        assert config.JSONIFY_PRETTYPRINT_REGULAR is True
        assert config.SQLALCHEMY_TRACK_MODIFICATIONS is False

        # Test JWT settings
        assert config.JWT_SECRET_KEY == "jwt-secret-key"
        assert config.JWT_ALGORITHM == "HS256"
        assert config.JWT_ACCESS_TOKEN_EXPIRES.total_seconds() == 3600  # 1 hour
        assert config.JWT_REFRESH_TOKEN_EXPIRES.days == 30  # 30 days

        # Test enhanced JWT settings
        assert config.JWT_TOKEN_LOCATION == ["headers"]
        assert config.JWT_HEADER_NAME == "Authorization"
        assert config.JWT_HEADER_TYPE == "Bearer"
        assert config.JWT_COOKIE_SECURE is True
        assert config.JWT_COOKIE_CSRF_PROTECT is False
        assert config.JWT_COOKIE_SAMESITE == "Strict"
        assert config.JWT_ERROR_MESSAGE_KEY == "message"

        # Test JWT claims configuration
        assert config.JWT_ENCODE_ISSUER == "ernesto-api"
        assert config.JWT_DECODE_ISSUER == "ernesto-api"
        assert config.JWT_ENCODE_AUDIENCE == "ernesto-chrome-extension"
        assert config.JWT_DECODE_AUDIENCE == "ernesto-chrome-extension"

        # Test JWT security settings
        assert config.JWT_VERIFY_EXPIRATION is True
        assert config.JWT_VERIFY_SUB_CLAIM is True
        assert config.JWT_BLACKLIST_ENABLED is False
        assert config.JWT_BLACKLIST_TOKEN_CHECKS == ["access", "refresh"]

        # Test API metadata
        assert config.API_TITLE == "Ernesto API"
        assert config.API_VERSION == "v1"

    def test_base_config_secret_key_default(self) -> None:
        """Test that BaseConfig has a default SECRET_KEY."""
        config = BaseConfig()
        assert config.SECRET_KEY == "dev-secret-key-change-in-production"


class TestDevelopmentConfig:
    """Test the development configuration class."""

    def test_development_config_inheritance(self) -> None:
        """Test that DevelopmentConfig inherits from BaseConfig."""
        assert issubclass(DevelopmentConfig, BaseConfig)

    def test_development_config_settings(self) -> None:
        """Test development-specific settings."""
        config = DevelopmentConfig()
        assert config.DEBUG is True
        assert config.LOG_LEVEL == "DEBUG"
        assert config.TESTING is False

        # Test development JWT settings
        assert config.JWT_COOKIE_SECURE is False  # Allow HTTP in dev
        assert config.JWT_ACCESS_TOKEN_EXPIRES.total_seconds() == 28800  # 8 hours

    def test_development_config_database_uri(self) -> None:
        """Test that development config uses DATABASE_URI from environment."""
        # Since DATABASE_URI is set in the environment, it will use that
        config = DevelopmentConfig()
        assert config.SQLALCHEMY_DATABASE_URI is not None

    @patch.dict(os.environ, {"DATABASE_URI": "sqlite:///test.db"}, clear=True)
    def test_development_config_jwt_warning(self) -> None:
        """Test that development config warns about default JWT secret."""
        with pytest.warns(
            UserWarning, match="Using default JWT_SECRET_KEY in development"
        ):
            get_config("dev")

    @patch.dict(
        os.environ,
        {
            "DATABASE_URI": "sqlite:///test.db",
            "JWT_SECRET_KEY": "custom-jwt-secret",
            "SECRET_KEY": "custom-secret-key-for-development",
        },
        clear=True,
    )
    def test_development_config_no_jwt_warning_with_custom_secret(self) -> None:
        """Test that development config doesn't warn with custom JWT secret."""
        with warnings.catch_warnings():
            warnings.simplefilter("error")  # Convert warnings to errors
            # Should not raise any warning
            config_instance = get_config("dev")
            assert isinstance(config_instance, DevelopmentConfig)


class TestTestingConfig:
    """Test the testing configuration class."""

    def test_testing_config_inheritance(self) -> None:
        """Test that AppTestingConfig inherits from BaseConfig."""
        assert issubclass(AppTestingConfig, BaseConfig)

    def test_testing_config_settings(self) -> None:
        """Test testing-specific settings."""
        config = AppTestingConfig()
        assert config.DEBUG is True
        assert config.TESTING is True
        assert config.LOG_LEVEL == "DEBUG"

        # Test testing-specific JWT settings
        assert config.JWT_ACCESS_TOKEN_EXPIRES.total_seconds() == 300  # 5 minutes
        assert config.JWT_REFRESH_TOKEN_EXPIRES.total_seconds() == 3600  # 1 hour
        assert config.JWT_COOKIE_SECURE is False  # Allow HTTP in testing
        assert config.JWT_BLACKLIST_ENABLED is False  # Disabled in tests

    def test_testing_config_database_default(self) -> None:
        """Test that testing config uses in-memory SQLite by default."""
        config = AppTestingConfig()
        assert config.SQLALCHEMY_DATABASE_URI == "sqlite:///:memory:"


class TestProductionConfig:
    """Test the production configuration class."""

    def test_production_config_inheritance(self) -> None:
        """Test that ProductionConfig inherits from BaseConfig."""
        assert issubclass(ProductionConfig, BaseConfig)

    def test_production_config_settings(self) -> None:
        """Test production-specific settings."""
        config = ProductionConfig()
        assert config.DEBUG is False
        assert config.TESTING is False
        assert config.LOG_LEVEL == "ERROR"

    def test_production_config_stricter_jwt_settings(self) -> None:
        """Test that production has stricter JWT token expiration settings."""
        config = ProductionConfig()
        assert config.JWT_ACCESS_TOKEN_EXPIRES.total_seconds() == 1800  # 30 minutes
        assert config.JWT_REFRESH_TOKEN_EXPIRES.days == 7  # 7 days

        # Test production JWT security settings
        assert config.JWT_COOKIE_SECURE is True  # Always HTTPS in prod
        assert config.JWT_VERIFY_EXPIRATION is True  # Strict verification
        assert config.JWT_VERIFY_SUB_CLAIM is True  # Verify subject claims
        assert config.JWT_BLACKLIST_ENABLED is True  # Enable blacklisting
        assert config.JWT_BLACKLIST_TOKEN_CHECKS == ["access", "refresh"]

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "JWT_SECRET_KEY": "very-long-jwt-secret-key-for-production-use-minimum-12-chars",
        },
    )
    def test_production_config_validation_success(self) -> None:
        """Test that production config validation passes with all required env vars."""
        # Should not raise any exception
        config_instance = get_config("prod")
        assert isinstance(config_instance, ProductionConfig)

    @patch.dict(os.environ, {}, clear=True)
    def test_production_config_validation_missing_all_vars(self) -> None:
        """Test that production config validation fails with missing env vars."""
        with pytest.raises(
            ValueError,
            match="Missing required environment variables for production: SECRET_KEY, DATABASE_URI, JWT_SECRET_KEY",
        ):
            get_config("prod")

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum"
        },
        clear=True,
    )
    def test_production_config_validation_missing_some_vars(self) -> None:
        """Test that production config validation fails with some missing env vars."""
        with pytest.raises(
            ValueError,
            match="Missing required environment variables for production: DATABASE_URI, JWT_SECRET_KEY",
        ):
            get_config("prod")


class TestConfigMapping:
    """Test the configuration mapping and get_config function."""

    def test_config_by_name_mapping(self) -> None:
        """Test that config_by_name contains all expected mappings."""
        expected_mappings = {
            "development": DevelopmentConfig,
            "dev": DevelopmentConfig,
            "testing": AppTestingConfig,
            "test": AppTestingConfig,
            "production": ProductionConfig,
            "prod": ProductionConfig,
        }

        assert config_by_name == expected_mappings

    def test_get_config_development(self) -> None:
        """Test getting development configuration."""
        # Mock JWT_SECRET_KEY to avoid warning in tests not specifically testing it
        with patch.dict(
            os.environ,
            {"DATABASE_URI": "sqlite:///test.db", "JWT_SECRET_KEY": "test-jwt-secret"},
        ):
            config_instance = get_config("development")
            assert isinstance(config_instance, DevelopmentConfig)

            config_instance = get_config("dev")
            assert isinstance(config_instance, DevelopmentConfig)

    def test_get_config_testing(self) -> None:
        """Test getting testing configuration."""
        config_instance = get_config("testing")
        assert isinstance(config_instance, AppTestingConfig)

        config_instance = get_config("test")
        assert isinstance(config_instance, AppTestingConfig)

    def test_get_config_invalid(self) -> None:
        """Test that get_config raises ValueError for invalid config names."""
        with pytest.raises(ValueError, match="Unknown configuration 'invalid'"):
            get_config("invalid")

    def test_get_config_case_insensitive(self) -> None:
        """Test that get_config is case insensitive."""
        # Mock JWT_SECRET_KEY to avoid warning in tests not specifically testing it
        with patch.dict(
            os.environ,
            {"DATABASE_URI": "sqlite:///test.db", "JWT_SECRET_KEY": "test-jwt-secret"},
        ):
            config_instance = get_config("DEVELOPMENT")
            assert isinstance(config_instance, DevelopmentConfig)

            config_instance = get_config("Test")
            assert isinstance(config_instance, AppTestingConfig)

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "JWT_SECRET_KEY": "very-long-jwt-secret-key-for-production-use-minimum-12-chars",
        },
    )
    def test_get_config_production_case_insensitive(self) -> None:
        """Test that get_config works for production with case insensitive names."""
        config_instance = get_config("PROD")
        assert isinstance(config_instance, ProductionConfig)


class TestJWTExtensionIntegration:
    """Test JWT extension integration with configuration."""

    def test_jwt_extension_import(self) -> None:
        """Test that JWT extension can be imported successfully."""
        from flask_jwt_extended import JWTManager

        from app.extensions import jwt

        assert isinstance(jwt, JWTManager)

    @patch.dict(
        os.environ,
        {"DATABASE_URI": "sqlite:///test.db", "JWT_SECRET_KEY": "test-jwt-secret"},
    )
    def test_jwt_configuration_loaded(self) -> None:
        """Test that JWT configuration is properly loaded from config classes."""
        from app.config import get_config

        config_instance = get_config("dev")

        # Verify that JWT settings are accessible
        assert hasattr(config_instance, "JWT_SECRET_KEY")
        assert hasattr(config_instance, "JWT_ACCESS_TOKEN_EXPIRES")
        assert hasattr(config_instance, "JWT_TOKEN_LOCATION")
        assert hasattr(config_instance, "JWT_ENCODE_ISSUER")
