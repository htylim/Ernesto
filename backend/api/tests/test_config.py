"""Tests for configuration classes and utilities.

This module tests the configuration classes (BaseConfig, DevelopmentConfig,
TestingConfig, ProductionConfig) and the configuration mapping utilities.
"""

import os
import warnings
from unittest.mock import patch

import pytest

from app.config import (
    BaseConfig,
    DevelopmentConfig,
    ProductionConfig,
    TestingConfig,
    config_by_name,
    get_config,
)


class TestBaseConfig:
    """Test the base configuration class."""

    def test_base_config_defaults(self) -> None:
        """Test that BaseConfig has expected default values."""
        assert BaseConfig.DEBUG is False
        assert BaseConfig.TESTING is False
        assert BaseConfig.LOG_LEVEL == "INFO"
        assert BaseConfig.JSON_SORT_KEYS is False
        assert BaseConfig.JSONIFY_PRETTYPRINT_REGULAR is True
        assert BaseConfig.SQLALCHEMY_TRACK_MODIFICATIONS is False

        # Test JWT settings
        assert BaseConfig.JWT_SECRET_KEY == "jwt-secret-key"
        assert BaseConfig.JWT_ALGORITHM == "HS256"
        assert BaseConfig.JWT_ACCESS_TOKEN_EXPIRES.total_seconds() == 3600  # 1 hour
        assert BaseConfig.JWT_REFRESH_TOKEN_EXPIRES.days == 30  # 30 days

        # Test enhanced JWT settings
        assert BaseConfig.JWT_TOKEN_LOCATION == ["headers"]
        assert BaseConfig.JWT_HEADER_NAME == "Authorization"
        assert BaseConfig.JWT_HEADER_TYPE == "Bearer"
        assert BaseConfig.JWT_COOKIE_SECURE is True
        assert BaseConfig.JWT_COOKIE_CSRF_PROTECT is False
        assert BaseConfig.JWT_COOKIE_SAMESITE == "Strict"
        assert BaseConfig.JWT_ERROR_MESSAGE_KEY == "message"

        # Test JWT claims configuration
        assert BaseConfig.JWT_ENCODE_ISSUER == "ernesto-api"
        assert BaseConfig.JWT_DECODE_ISSUER == "ernesto-api"
        assert BaseConfig.JWT_ENCODE_AUDIENCE == "ernesto-chrome-extension"
        assert BaseConfig.JWT_DECODE_AUDIENCE == "ernesto-chrome-extension"

        # Test JWT security settings
        assert BaseConfig.JWT_VERIFY_EXPIRATION is True
        assert BaseConfig.JWT_VERIFY_SUB_CLAIM is True
        assert BaseConfig.JWT_BLACKLIST_ENABLED is False
        assert BaseConfig.JWT_BLACKLIST_TOKEN_CHECKS == ["access", "refresh"]

        # Test API metadata
        assert BaseConfig.API_TITLE == "Ernesto API"
        assert BaseConfig.API_VERSION == "v1"

    def test_base_config_secret_key_default(self) -> None:
        """Test that BaseConfig has a default SECRET_KEY."""
        assert BaseConfig.SECRET_KEY == "dev-secret-key-change-in-production"


class TestDevelopmentConfig:
    """Test the development configuration class."""

    def test_development_config_inheritance(self) -> None:
        """Test that DevelopmentConfig inherits from BaseConfig."""
        assert issubclass(DevelopmentConfig, BaseConfig)

    def test_development_config_settings(self) -> None:
        """Test development-specific settings."""
        assert DevelopmentConfig.DEBUG is True
        assert DevelopmentConfig.LOG_LEVEL == "DEBUG"
        assert DevelopmentConfig.TESTING is False

        # Test development JWT settings
        assert DevelopmentConfig.JWT_COOKIE_SECURE is False  # Allow HTTP in dev
        assert (
            DevelopmentConfig.JWT_ACCESS_TOKEN_EXPIRES.total_seconds() == 28800
        )  # 8 hours

    def test_development_config_database_uri(self) -> None:
        """Test that development config uses DATABASE_URI from environment."""
        # Since DATABASE_URI is set in the environment, it will use that
        assert DevelopmentConfig.SQLALCHEMY_DATABASE_URI is not None

    def test_development_config_validation_method_exists(self) -> None:
        """Test that development config has a validation method."""
        assert hasattr(DevelopmentConfig, "validate_config")
        assert callable(getattr(DevelopmentConfig, "validate_config"))

    @patch.dict(os.environ, {"DATABASE_URI": "sqlite:///test.db"}, clear=True)
    def test_development_config_jwt_warning(self) -> None:
        """Test that development config warns about default JWT secret."""
        with pytest.warns(
            UserWarning, match="Using default JWT_SECRET_KEY in development"
        ):
            get_config("dev")

    @patch.dict(
        os.environ,
        {"DATABASE_URI": "sqlite:///test.db", "JWT_SECRET_KEY": "custom-jwt-secret"},
        clear=True,
    )
    def test_development_config_no_jwt_warning_with_custom_secret(self) -> None:
        """Test that development config doesn't warn with custom JWT secret."""
        with warnings.catch_warnings():
            warnings.simplefilter("error")  # Convert warnings to errors
            # Should not raise any warning
            config_class = get_config("dev")
            assert config_class == DevelopmentConfig


class TestTestingConfig:
    """Test the testing configuration class."""

    def test_testing_config_inheritance(self) -> None:
        """Test that TestingConfig inherits from BaseConfig."""
        assert issubclass(TestingConfig, BaseConfig)

    def test_testing_config_settings(self) -> None:
        """Test testing-specific settings."""
        assert TestingConfig.DEBUG is True
        assert TestingConfig.TESTING is True
        assert TestingConfig.LOG_LEVEL == "DEBUG"
        assert TestingConfig.WTF_CSRF_ENABLED is False

        # Test testing JWT settings
        assert (
            TestingConfig.JWT_ACCESS_TOKEN_EXPIRES.total_seconds() == 300
        )  # 5 minutes
        assert TestingConfig.JWT_REFRESH_TOKEN_EXPIRES.total_seconds() == 3600  # 1 hour
        assert TestingConfig.JWT_COOKIE_SECURE is False  # Allow HTTP in testing
        assert TestingConfig.JWT_BLACKLIST_ENABLED is False  # Disabled for simplicity

    def test_testing_config_database_default(self) -> None:
        """Test that testing config uses in-memory SQLite by default."""
        assert TestingConfig.SQLALCHEMY_DATABASE_URI == "sqlite:///:memory:"


class TestProductionConfig:
    """Test the production configuration class."""

    def test_production_config_inheritance(self) -> None:
        """Test that ProductionConfig inherits from BaseConfig."""
        assert issubclass(ProductionConfig, BaseConfig)

    def test_production_config_settings(self) -> None:
        """Test production-specific settings."""
        assert ProductionConfig.DEBUG is False
        assert ProductionConfig.TESTING is False
        assert ProductionConfig.LOG_LEVEL == "ERROR"

    def test_production_config_stricter_jwt_settings(self) -> None:
        """Test that production has stricter JWT token expiration settings."""
        assert (
            ProductionConfig.JWT_ACCESS_TOKEN_EXPIRES.total_seconds() == 1800
        )  # 30 minutes
        assert ProductionConfig.JWT_REFRESH_TOKEN_EXPIRES.days == 7  # 7 days

        # Test production JWT security settings
        assert ProductionConfig.JWT_COOKIE_SECURE is True  # Always HTTPS in prod
        assert ProductionConfig.JWT_VERIFY_EXPIRATION is True  # Strict verification
        assert ProductionConfig.JWT_VERIFY_SUB_CLAIM is True  # Verify subject claims
        assert ProductionConfig.JWT_BLACKLIST_ENABLED is True  # Enable blacklisting
        assert ProductionConfig.JWT_BLACKLIST_TOKEN_CHECKS == ["access", "refresh"]

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "prod-secret",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "JWT_SECRET_KEY": "prod-jwt-secret",
        },
    )
    def test_production_config_validation_success(self) -> None:
        """Test that production config validation passes with all required env vars."""
        # Should not raise any exception
        config_class = get_config("prod")
        assert config_class == ProductionConfig

    @patch.dict(os.environ, {}, clear=True)
    def test_production_config_validation_missing_all_vars(self) -> None:
        """Test that production config validation fails with missing env vars."""
        with pytest.raises(
            ValueError,
            match="Missing required environment variables for production: SECRET_KEY, DATABASE_URI, JWT_SECRET_KEY",
        ):
            get_config("prod")

    @patch.dict(os.environ, {"SECRET_KEY": "test-secret"}, clear=True)
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
            "testing": TestingConfig,
            "test": TestingConfig,
            "production": ProductionConfig,
            "prod": ProductionConfig,
        }

        assert config_by_name == expected_mappings

    def test_get_config_development(self) -> None:
        """Test getting development configuration."""
        from app.config import DevelopmentConfig as ImportedDevConfig

        # Mock JWT_SECRET_KEY to avoid warning in tests not specifically testing it
        with patch.dict(
            os.environ,
            {"DATABASE_URI": "sqlite:///test.db", "JWT_SECRET_KEY": "test-jwt-secret"},
        ):
            config_class = get_config("development")
            assert config_class == ImportedDevConfig

            config_class = get_config("dev")
            assert config_class == ImportedDevConfig

    def test_get_config_testing(self) -> None:
        """Test getting testing configuration."""
        from app.config import TestingConfig as ImportedTestConfig

        config_class = get_config("testing")
        assert config_class == ImportedTestConfig

        config_class = get_config("test")
        assert config_class == ImportedTestConfig

    def test_get_config_invalid(self) -> None:
        """Test that get_config raises ValueError for invalid config names."""
        with pytest.raises(ValueError, match="Unknown configuration 'invalid'"):
            get_config("invalid")

    def test_get_config_case_insensitive(self) -> None:
        """Test that get_config is case insensitive."""
        from app.config import DevelopmentConfig as ImportedDevConfig
        from app.config import TestingConfig as ImportedTestConfig

        # Mock JWT_SECRET_KEY to avoid warning in tests not specifically testing it
        with patch.dict(
            os.environ,
            {"DATABASE_URI": "sqlite:///test.db", "JWT_SECRET_KEY": "test-jwt-secret"},
        ):
            config_class = get_config("DEVELOPMENT")
            assert config_class == ImportedDevConfig

            config_class = get_config("Test")
            assert config_class == ImportedTestConfig

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "prod-secret",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "JWT_SECRET_KEY": "prod-jwt-secret",
        },
    )
    def test_get_config_production_case_insensitive(self) -> None:
        """Test that get_config works for production with case insensitive names."""
        from app.config import ProductionConfig as ImportedProdConfig

        config_class = get_config("PROD")
        assert config_class == ImportedProdConfig


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

        config_class = get_config("dev")
        config_instance = config_class()

        # Verify that JWT settings are accessible
        assert hasattr(config_instance, "JWT_SECRET_KEY")
        assert hasattr(config_instance, "JWT_ACCESS_TOKEN_EXPIRES")
        assert hasattr(config_instance, "JWT_TOKEN_LOCATION")
        assert hasattr(config_instance, "JWT_ENCODE_ISSUER")
