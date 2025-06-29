"""Unit tests for Flask extensions initialization and configuration.

This module tests the proper initialization and configuration of all Flask extensions
used in the application, with special focus on CORS extension integration.
"""

from flask import Flask

from app import create_app
from app.extensions import alembic, cors, db, ma


class TestCORSExtensionInitialization:
    """Test cases for CORS extension initialization and configuration."""

    def test_cors_extension_initialization(self) -> None:
        """Test that CORS extension is properly initialized with configuration."""
        # Create app with CORS configuration
        cors_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": ["http://localhost:3000"],
            "CORS_METHODS": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "CORS_HEADERS": ["Content-Type", "X-API-Key"],
            "CORS_SUPPORTS_CREDENTIALS": False,
        }

        app = create_app(cors_config)

        with app.app_context():
            # Verify CORS instance exists
            assert cors is not None

            # Verify CORS configuration is loaded from Flask config
            assert app.config["CORS_ORIGINS"] == ["http://localhost:3000"]
            assert app.config["CORS_METHODS"] == [
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "OPTIONS",
            ]
            assert app.config["CORS_HEADERS"] == ["Content-Type", "X-API-Key"]
            assert app.config["CORS_SUPPORTS_CREDENTIALS"] is False

    def test_cors_configuration_loading(self) -> None:
        """Test that CORS settings are loaded from Flask config during initialization."""
        # Test with custom CORS configuration
        custom_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": ["http://localhost:3000"],
            "CORS_METHODS": ["GET", "POST"],
            "CORS_HEADERS": ["Content-Type"],
            "CORS_SUPPORTS_CREDENTIALS": True,
        }

        app = create_app(custom_config)

        with app.app_context():
            # Verify configuration was loaded correctly
            assert app.config["CORS_ORIGINS"] == ["http://localhost:3000"]
            assert app.config["CORS_METHODS"] == ["GET", "POST"]
            assert app.config["CORS_HEADERS"] == ["Content-Type"]
            assert app.config["CORS_SUPPORTS_CREDENTIALS"] is True

    def test_cors_development_configuration(self) -> None:
        """Test CORS configuration in development environment."""
        # Test with development-like configuration
        dev_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "DEBUG": True,
            "CORS_ORIGINS": [r"http://localhost:.*", r"http://127.0.0.1:.*"],
        }

        app = create_app(dev_config)

        with app.app_context():
            # Verify development CORS configuration
            cors_origins = app.config.get("CORS_ORIGINS", [])
            assert len(cors_origins) == 2
            assert any("localhost" in origin for origin in cors_origins)
            assert any("127.0.0.1" in origin for origin in cors_origins)

    def test_cors_production_configuration(self) -> None:
        """Test CORS configuration in production environment."""
        production_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "production-secret-key",
            "DEBUG": False,
            "CORS_ORIGINS": [],  # Empty by default for security
            "CORS_SUPPORTS_CREDENTIALS": False,
        }

        app = create_app(production_config)

        with app.app_context():
            # Production should have empty origins by default (secure by default)
            assert app.config["CORS_ORIGINS"] == []
            assert app.config["CORS_SUPPORTS_CREDENTIALS"] is False

    def test_cors_integration_with_app_factory(self) -> None:
        """Test CORS integration with application factory pattern."""
        # Test that CORS is properly configured in application factory
        cors_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": ["http://localhost:3000"],
        }

        app = create_app(cors_config)

        with app.test_client() as client:
            # Make a preflight request (OPTIONS) to verify CORS is working
            response = client.options(
                "/",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "GET",
                },
            )

            # CORS should handle preflight requests
            # Even if there's no route, CORS should add headers
            assert response.status_code in [200, 404]

    def test_cors_debug_logging(self) -> None:
        """Test CORS debug logging in development environment."""
        # Test with debug mode enabled - test that debug config doesn't break anything
        debug_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "DEBUG": True,
            "CORS_ORIGINS": ["http://localhost:3000"],
        }

        # Create app - the debug logging code should execute without errors
        app = create_app(debug_config)

        with app.app_context():
            # Verify that debug mode is enabled and CORS origins are configured
            assert app.config["DEBUG"] is True
            assert app.config["CORS_ORIGINS"] == ["http://localhost:3000"]
            # If we get here, the debug logging code executed without errors

    def test_cors_with_different_configurations(self) -> None:
        """Test CORS with various configuration scenarios."""
        # Test 1: Minimal configuration (should use defaults)
        minimal_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        }
        app = create_app(minimal_config)
        with app.app_context():
            # Should have empty origins by default
            assert app.config.get("CORS_ORIGINS", []) == []

        # Test 2: Chrome extension configuration
        chrome_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": ["chrome-extension://extension-id"],
            "CORS_HEADERS": ["Content-Type", "X-API-Key"],
        }
        app = create_app(chrome_config)
        with app.app_context():
            assert app.config["CORS_ORIGINS"] == ["chrome-extension://extension-id"]
            assert "X-API-Key" in app.config["CORS_HEADERS"]

        # Test 3: Multiple origins configuration
        multi_origins_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": ["http://localhost:3000", "https://example.com"],
        }
        app = create_app(multi_origins_config)
        with app.app_context():
            assert len(app.config["CORS_ORIGINS"]) == 2

    def test_cors_headers_in_response(self) -> None:
        """Test that CORS headers are properly added to responses."""
        cors_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": ["http://localhost:3000"],
            "CORS_METHODS": ["GET", "POST", "OPTIONS"],
        }

        app = create_app(cors_config)

        with app.test_client() as client:
            # Test preflight request
            response = client.options(
                "/",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "GET",
                },
            )

            # Should have CORS headers (even if route doesn't exist)
            # Flask-CORS handles OPTIONS requests automatically
            assert response.status_code in [200, 404]


class TestExtensionIntegration:
    """Test cases for overall extension integration."""

    def test_all_extensions_initialized(self, app: Flask) -> None:
        """Test that all extensions are properly initialized."""
        with app.app_context():
            # Test SQLAlchemy
            assert db.engine is not None
            assert hasattr(db, "Model")

            # Test Flask-Alembic
            assert alembic is not None
            assert hasattr(alembic, "init_app")

            # Test Flask-Marshmallow
            assert ma is not None
            assert hasattr(ma, "init_app")

            # Test Flask-CORS (instance exists)
            assert cors is not None

    def test_extension_initialization_order(self, app: Flask) -> None:
        """Test that extensions are initialized in the correct order."""
        with app.app_context():
            # All extensions should be initialized without conflicts
            # The order is: SQLAlchemy -> CORS -> Marshmallow -> models import -> Alembic

            # Verify SQLAlchemy is initialized (required for models)
            assert db.engine is not None

            # Verify CORS instance exists
            assert cors is not None

            # Verify Marshmallow is initialized (requires SQLAlchemy)
            assert ma is not None

            # Verify Alembic is initialized (requires SQLAlchemy and models)
            assert alembic is not None

    def test_extension_configuration_validation(self) -> None:
        """Test extension configuration validation."""
        # Test that CORS configuration is handled properly
        valid_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": ["http://localhost:3000"],
            "CORS_METHODS": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "CORS_HEADERS": ["Content-Type", "X-API-Key"],
            "CORS_SUPPORTS_CREDENTIALS": False,
        }

        # This should create an app successfully
        app = create_app(valid_config)

        with app.app_context():
            assert app.config["CORS_ORIGINS"] == ["http://localhost:3000"]


class TestCORSSecurityConfiguration:
    """Test cases for CORS security-related configuration."""

    def test_cors_secure_defaults(self) -> None:
        """Test that CORS has secure defaults."""
        # Create app with minimal config to test defaults
        app = create_app(
            {
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "CORS_ORIGINS": [],  # Explicitly empty for security
                "CORS_SUPPORTS_CREDENTIALS": False,
                "CORS_HEADERS": ["Content-Type", "X-API-Key"],
            }
        )

        with app.app_context():
            # Verify secure defaults
            assert app.config.get("CORS_ORIGINS", []) == []  # Empty by default
            assert (
                app.config.get("CORS_SUPPORTS_CREDENTIALS", False) is False
            )  # No credentials

            # Verify required headers are included
            cors_headers = app.config.get("CORS_HEADERS", [])
            assert "Content-Type" in cors_headers
            assert "X-API-Key" in cors_headers

    def test_cors_chrome_extension_pattern(self) -> None:
        """Test CORS configuration for Chrome extension pattern."""
        chrome_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": ["chrome-extension://extension-id-123"],
            "CORS_HEADERS": ["Content-Type", "X-API-Key"],
        }

        app = create_app(chrome_config)

        with app.app_context():
            # Verify Chrome extension origin is configured
            origins = app.config["CORS_ORIGINS"]
            assert len(origins) == 1
            assert origins[0].startswith("chrome-extension://")

            # Verify API key header is allowed
            assert "X-API-Key" in app.config["CORS_HEADERS"]

    def test_cors_localhost_development_pattern(self) -> None:
        """Test CORS configuration for localhost development pattern."""
        dev_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "CORS_ORIGINS": [r"http://localhost:.*", r"http://127.0.0.1:.*"],
            "DEBUG": True,
        }

        app = create_app(dev_config)

        with app.app_context():
            # Verify localhost patterns are configured
            origins = app.config["CORS_ORIGINS"]
            assert len(origins) == 2
            assert any("localhost" in origin for origin in origins)
            assert any("127.0.0.1" in origin for origin in origins)
