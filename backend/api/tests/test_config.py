import os
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

    def test_base_config_defaults(self):
        """Test that BaseConfig has expected default values."""
        assert BaseConfig.DEBUG is False
        assert BaseConfig.TESTING is False
        assert BaseConfig.LOG_LEVEL == "INFO"
        assert BaseConfig.JSON_SORT_KEYS is False
        assert BaseConfig.JSONIFY_PRETTYPRINT_REGULAR is True
        assert BaseConfig.SQLALCHEMY_TRACK_MODIFICATIONS is False

    def test_base_config_secret_key_default(self):
        """Test that BaseConfig has a default SECRET_KEY."""
        assert BaseConfig.SECRET_KEY == "dev-secret-key-change-in-production"


class TestDevelopmentConfig:
    """Test the development configuration class."""

    def test_development_config_inheritance(self):
        """Test that DevelopmentConfig inherits from BaseConfig."""
        assert issubclass(DevelopmentConfig, BaseConfig)

    def test_development_config_settings(self):
        """Test development-specific settings."""
        assert DevelopmentConfig.DEBUG is True
        assert DevelopmentConfig.LOG_LEVEL == "DEBUG"
        assert DevelopmentConfig.TESTING is False

    def test_development_config_database_uri(self):
        """Test that development config uses DATABASE_URI from environment."""
        # Since DATABASE_URI is set in the environment, it will use that
        assert DevelopmentConfig.SQLALCHEMY_DATABASE_URI is not None

    def test_development_config_validation_method_exists(self):
        """Test that development config has a validation method."""
        assert hasattr(DevelopmentConfig, "validate_config")
        assert callable(getattr(DevelopmentConfig, "validate_config"))


class TestTestingConfig:
    """Test the testing configuration class."""

    def test_testing_config_inheritance(self):
        """Test that TestingConfig inherits from BaseConfig."""
        assert issubclass(TestingConfig, BaseConfig)

    def test_testing_config_settings(self):
        """Test testing-specific settings."""
        assert TestingConfig.DEBUG is True
        assert TestingConfig.TESTING is True
        assert TestingConfig.LOG_LEVEL == "DEBUG"
        assert TestingConfig.WTF_CSRF_ENABLED is False

    def test_testing_config_database_default(self):
        """Test that testing config uses in-memory SQLite by default."""
        assert TestingConfig.SQLALCHEMY_DATABASE_URI == "sqlite:///:memory:"


class TestProductionConfig:
    """Test the production configuration class."""

    def test_production_config_inheritance(self):
        """Test that ProductionConfig inherits from BaseConfig."""
        assert issubclass(ProductionConfig, BaseConfig)

    def test_production_config_settings(self):
        """Test production-specific settings."""
        assert ProductionConfig.DEBUG is False
        assert ProductionConfig.TESTING is False
        assert ProductionConfig.LOG_LEVEL == "ERROR"


class TestConfigMapping:
    """Test the configuration mapping and get_config function."""

    def test_config_by_name_mapping(self):
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

    def test_get_config_development(self):
        """Test getting development configuration."""
        from app.config import DevelopmentConfig as ImportedDevConfig

        config_class = get_config("development")
        assert config_class == ImportedDevConfig

        config_class = get_config("dev")
        assert config_class == ImportedDevConfig

    def test_get_config_testing(self):
        """Test getting testing configuration."""
        from app.config import TestingConfig as ImportedTestConfig

        config_class = get_config("testing")
        assert config_class == ImportedTestConfig

        config_class = get_config("test")
        assert config_class == ImportedTestConfig

    def test_get_config_invalid(self):
        """Test that get_config raises ValueError for invalid config names."""
        with pytest.raises(ValueError, match="Unknown configuration 'invalid'"):
            get_config("invalid")

    def test_get_config_case_insensitive(self):
        """Test that get_config is case insensitive."""
        from app.config import DevelopmentConfig as ImportedDevConfig
        from app.config import TestingConfig as ImportedTestConfig

        config_class = get_config("DEVELOPMENT")
        assert config_class == ImportedDevConfig

        config_class = get_config("Test")
        assert config_class == ImportedTestConfig

    @patch.dict(
        os.environ,
        {
            "SECRET_KEY": "prod-secret",
            "DATABASE_URI": "postgresql://prod:secret@db:5432/ernesto_prod",
        },
    )
    def test_get_config_production_case_insensitive(self):
        """Test that get_config works for production with case insensitive names."""
        from app.config import ProductionConfig as ImportedProdConfig

        config_class = get_config("PROD")
        assert config_class == ImportedProdConfig
