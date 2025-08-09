"""Tests for configuration classes and utilities.

This module tests the configuration classes (BaseConfig, DevelopmentConfig,
TestingConfig, ProductionConfig) and the configuration mapping utilities.
"""

import os
from unittest.mock import patch

import pytest

# NOTE: TestingConfig needs to be imported as EnvTestingConfig to not confuse pytest into thinking it as a Class containing tests
from app.config import (
    BaseConfig,
    DevelopmentConfig,
    ProductionConfig,
    config_by_name,
    get_config,
)
from app.config import TestingConfig as EnvTestingConfig


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

        # Test API metadata
        assert config.API_TITLE == "Ernesto API"
        assert config.API_VERSION == "v1"

    def test_base_config_secret_key_default(self) -> None:
        """Test that BaseConfig has a default SECRET_KEY."""
        config = BaseConfig()
        assert config.SECRET_KEY == "dev-secret-key-change-in-production"

    def test_base_config_cors_defaults(self) -> None:
        """Test that BaseConfig has expected CORS default values."""
        config = BaseConfig()
        assert config.CORS_ORIGINS == []
        assert config.CORS_METHODS == ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        assert config.CORS_HEADERS == ["Content-Type", "X-API-Key"]
        assert config.CORS_SUPPORTS_CREDENTIALS is False


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

    def test_development_config_database_uri(self) -> None:
        """Test that development config uses DATABASE_URI from environment."""
        # Since DATABASE_URI is set in the environment, it will use that
        config = DevelopmentConfig()
        assert config.SQLALCHEMY_DATABASE_URI is not None

    def test_development_config_cors(self) -> None:
        """Test development-specific CORS settings."""
        config = DevelopmentConfig()
        assert config.CORS_ORIGINS == [r"http://localhost:.*", r"http://127.0.0.1:.*"]
        # Other CORS settings should inherit from BaseConfig
        assert config.CORS_METHODS == ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        assert config.CORS_HEADERS == ["Content-Type", "X-API-Key"]
        assert config.CORS_SUPPORTS_CREDENTIALS is False


class TestTestingConfig:
    """Test the testing configuration class."""

    def test_testing_config_inheritance(self) -> None:
        """Test that TestingConfig inherits from BaseConfig."""
        assert issubclass(EnvTestingConfig, BaseConfig)

    def test_testing_config_settings(self) -> None:
        """Test testing-specific settings."""
        config = EnvTestingConfig()
        assert config.DEBUG is True
        assert config.TESTING is True
        assert config.LOG_LEVEL == "DEBUG"

    def test_testing_config_database_default(self) -> None:
        """Test that testing config uses in-memory SQLite by default."""
        config = EnvTestingConfig()
        assert config.SQLALCHEMY_DATABASE_URI == "sqlite:///:memory:"

    def test_testing_config_cors(self) -> None:
        """Test testing-specific CORS settings."""
        config = EnvTestingConfig()
        # Testing should inherit empty origins from BaseConfig
        assert config.CORS_ORIGINS == []
        assert config.CORS_METHODS == ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        assert config.CORS_HEADERS == ["Content-Type", "X-API-Key"]
        assert config.CORS_SUPPORTS_CREDENTIALS is False


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

    def test_production_config_cors(self) -> None:
        """Test production-specific CORS settings."""
        config = ProductionConfig()
        # Production should inherit empty origins from BaseConfig (secure by default)
        assert config.CORS_ORIGINS == []
        assert config.CORS_METHODS == ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        assert config.CORS_HEADERS == ["Content-Type", "X-API-Key"]
        assert config.CORS_SUPPORTS_CREDENTIALS is False

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "CHROME_EXTENSION_IDS": "abcdefghijklmnopabcdefghijklmnop",
        },
    )
    def test_production_config_cors_with_extension_ids(self) -> None:
        """Test production CORS origins with a single Chrome extension ID."""
        config = ProductionConfig()
        assert config.CORS_ORIGINS == [
            "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
        ]

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "CHROME_EXTENSION_IDS": "idoneidoneidoneidoneidoneidon, idtwoidtwoidtwoidtwoidtwoidtw",
        },
    )
    def test_production_config_cors_with_multiple_extension_ids(self) -> None:
        """Test production CORS origins with multiple Chrome extension IDs."""
        config = ProductionConfig()
        assert config.CORS_ORIGINS == [
            "chrome-extension://idoneidoneidoneidoneidoneidon",
            "chrome-extension://idtwoidtwoidtwoidtwoidtwoidtw",
        ]

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
            "CHROME_EXTENSION_IDS": " id1 , , id2  ",
        },
    )
    def test_production_config_cors_ignores_empty_items(self) -> None:
        """Test that empty values are ignored and whitespace trimmed when parsing IDs."""
        config = ProductionConfig()
        assert config.CORS_ORIGINS == [
            "chrome-extension://id1",
            "chrome-extension://id2",
        ]

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
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
            match="Missing required environment variables for production: SECRET_KEY, DATABASE_URI",
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
            match="Missing required environment variables for production: DATABASE_URI",
        ):
            get_config("prod")


class TestConfigMapping:
    """Test the configuration mapping and get_config function."""

    def test_config_by_name_mapping(self) -> None:
        """Test that config_by_name contains all expected mappings."""
        expected_mappings = {
            "development": DevelopmentConfig,
            "dev": DevelopmentConfig,
            "testing": EnvTestingConfig,
            "test": EnvTestingConfig,
            "production": ProductionConfig,
            "prod": ProductionConfig,
        }

        assert config_by_name == expected_mappings

    def test_get_config_development(self) -> None:
        """Test getting development configuration."""
        with patch.dict(
            os.environ,
            {"DATABASE_URI": "sqlite:///test.db"},
        ):
            config_instance = get_config("development")
            assert isinstance(config_instance, DevelopmentConfig)

            config_instance = get_config("dev")
            assert isinstance(config_instance, DevelopmentConfig)

    def test_get_config_testing(self) -> None:
        """Test getting testing configuration."""
        config_instance = get_config("testing")
        assert isinstance(config_instance, EnvTestingConfig)

        config_instance = get_config("test")
        assert isinstance(config_instance, EnvTestingConfig)

    def test_get_config_invalid(self) -> None:
        """Test that get_config raises ValueError for invalid config names."""
        with pytest.raises(ValueError, match="Unknown configuration 'invalid'"):
            get_config("invalid")

    def test_get_config_case_insensitive(self) -> None:
        """Test that get_config is case insensitive."""
        with patch.dict(
            os.environ,
            {"DATABASE_URI": "sqlite:///test.db"},
        ):
            config_instance = get_config("DEVELOPMENT")
            assert isinstance(config_instance, DevelopmentConfig)

            config_instance = get_config("Test")
            assert isinstance(config_instance, EnvTestingConfig)

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "very-long-secret-key-for-production-use-that-meets-32-character-minimum",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
        },
    )
    def test_get_config_production_case_insensitive(self) -> None:
        """Test that get_config works for production with case insensitive names."""
        config_instance = get_config("PROD")
        assert isinstance(config_instance, ProductionConfig)
