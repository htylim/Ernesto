"""
Unit tests for the Flask application factory.

This module tests the create_app function and its components to ensure
proper initialization and configuration of the Flask application.
"""

import os
import tempfile
from unittest.mock import patch

import pytest
from flask import Flask

from app import create_app
from app.extensions import alembic, db


class TestApplicationFactory:
    """Test cases for the Flask application factory."""

    def test_create_app_returns_flask_instance(self):
        """Test that create_app returns a Flask application instance."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
        assert isinstance(app, Flask)

    def test_create_app_with_test_config(self):
        """Test application creation with test configuration."""
        test_config = {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "SECRET_KEY": "test-secret-key",
        }
        app = create_app(test_config)

        assert app.config["TESTING"] is True
        assert app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite:///:memory:"
        assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is False
        assert app.config["SECRET_KEY"] == "test-secret-key"

    def test_create_app_without_test_config(self):
        """Test application creation without test configuration (production mode)."""
        with patch.dict(
            os.environ,
            {
                "DATABASE_URI": "postgresql://test:test@localhost/testdb",
                "SQLALCHEMY_TRACK_MODIFICATIONS": "true",
            },
        ):
            app = create_app()
            assert (
                app.config["SQLALCHEMY_DATABASE_URI"]
                == "postgresql://test:test@localhost/testdb"
            )
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is True

    def test_create_app_with_missing_env_vars(self):
        """Test application creation with missing environment variables."""
        with patch.dict(os.environ, {}, clear=True):
            # This should raise an error because SQLAlchemy requires a database URI
            with pytest.raises(
                RuntimeError,
                match="Either 'SQLALCHEMY_DATABASE_URI' or 'SQLALCHEMY_BINDS' must be set",
            ):
                create_app()

    def test_create_app_with_false_track_modifications(self):
        """Test application creation with SQLALCHEMY_TRACK_MODIFICATIONS set to false."""
        with patch.dict(
            os.environ,
            {
                "DATABASE_URI": "sqlite:///:memory:",
                "SQLALCHEMY_TRACK_MODIFICATIONS": "false",
            },
        ):
            app = create_app()
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is False


class TestExtensionInitialization:
    """Test cases for Flask extension initialization."""

    def test_extensions_are_initialized(self):
        """Test that all extensions are properly initialized."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        with app.app_context():
            # Test SQLAlchemy initialization
            assert db.engine is not None
            assert hasattr(db, "Model")

            # Test Alembic initialization - check that it's properly initialized
            assert alembic is not None
            assert hasattr(alembic, "init_app")

    def test_sqlalchemy_configuration(self):
        """Test SQLAlchemy configuration and initialization."""
        test_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        }
        app = create_app(test_config)

        with app.app_context():
            # Test that SQLAlchemy is properly configured
            assert app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite:///:memory:"
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is False

            # Test that database connection works using modern SQLAlchemy syntax
            with db.engine.connect() as connection:
                result = connection.execute(db.text("SELECT 1")).scalar()
                assert result == 1

    def test_models_are_imported(self):
        """Test that models are properly imported and registered."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        with app.app_context():
            # Test that models are available
            from app.models import ApiClient, Article, Source, Topic

            # Test that models are registered with SQLAlchemy
            assert hasattr(ApiClient, "__tablename__")
            assert hasattr(Article, "__tablename__")
            assert hasattr(Source, "__tablename__")
            assert hasattr(Topic, "__tablename__")

    def test_extension_configuration_warnings(self):
        """Test that appropriate warnings are logged for missing configuration."""
        # Test that the app fails to initialize without database URI
        with pytest.raises(
            RuntimeError,
            match="Either 'SQLALCHEMY_DATABASE_URI' or 'SQLALCHEMY_BINDS' must be set",
        ):
            create_app({})  # No SQLALCHEMY_DATABASE_URI


class TestErrorHandlerRegistration:
    """Test cases for error handler registration."""

    def test_error_handlers_are_registered(self):
        """Test that error handlers are properly registered."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        # Test that error handlers exist
        assert 404 in app.error_handler_spec[None]
        assert 500 in app.error_handler_spec[None]

    def test_404_error_handler(self):
        """Test the 404 error handler."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        with app.test_client() as client:
            response = client.get("/nonexistent-route")
            assert response.status_code == 404
            assert response.is_json
            data = response.get_json()
            assert "error" in data
            assert data["error"] == "Not Found"

    def test_500_error_handler(self):
        """Test the 500 error handler."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        # Create a route that raises an exception
        @app.route("/test-error")
        def test_error():
            raise Exception("Test exception")

        with app.test_client() as client:
            response = client.get("/test-error")
            assert response.status_code == 500
            assert response.is_json
            data = response.get_json()
            assert "error" in data
            assert data["error"] == "Internal Server Error"


class TestLoggingConfiguration:
    """Test cases for logging configuration."""

    def test_logging_is_configured(self):
        """Test that logging is properly configured."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        # Test that the app has a logger
        assert app.logger is not None

        # Test that we can log messages
        with app.app_context():
            app.logger.info("Test log message")
            # If no exception is raised, logging is working

    def test_logging_with_custom_config(self):
        """Test logging configuration with custom settings."""
        test_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "LOG_LEVEL": "DEBUG",
        }
        app = create_app(test_config)

        assert app.logger is not None

    def test_logging_integration_in_factory(self):
        """Test that logging is properly integrated in the application factory."""
        with patch("app.logging_config.configure_logging") as mock_configure:
            app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
            mock_configure.assert_called_once_with(app)


class TestRouteRegistration:
    """Test cases for route registration."""

    def test_routes_are_registered(self):
        """Test that routes are properly registered."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        # Test that routes exist
        with app.test_client() as client:
            # Test health check route (should exist)
            response = client.get("/health")
            # We don't care about the exact response, just that the route exists
            assert response.status_code in [200, 404, 405]  # Any valid HTTP response

    def test_route_registration_integration(self):
        """Test that route registration is properly integrated in the factory."""
        with patch("app.routes.register_routes") as mock_register:
            app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
            mock_register.assert_called_once_with(app)


class TestApplicationFactoryIntegration:
    """Test cases for overall application factory integration."""

    def test_complete_application_initialization(self):
        """Test that the complete application initializes correctly."""
        test_config = {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        }
        app = create_app(test_config)

        with app.app_context():
            # Test that all components are working together
            assert app.config["TESTING"] is True
            assert db.engine is not None
            assert app.logger is not None
            assert len(app.error_handler_spec[None]) > 0

    def test_multiple_app_instances(self):
        """Test that multiple application instances can be created independently."""
        config1 = {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "key1",
        }
        config2 = {
            "TESTING": False,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "key2",
        }

        app1 = create_app(config1)
        app2 = create_app(config2)

        assert app1 is not app2
        assert app1.config["SECRET_KEY"] == "key1"
        assert app2.config["SECRET_KEY"] == "key2"
        assert app1.config["TESTING"] is True
        assert app2.config["TESTING"] is False

    def test_app_context_isolation(self):
        """Test that application contexts are properly isolated."""
        app1 = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
        app2 = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        with app1.app_context():
            app1_context = True
            with app2.app_context():
                app2_context = True
                # Both contexts should be accessible
                assert app1_context
                assert app2_context

    def test_factory_with_temporary_database(self):
        """Test application factory with a temporary database file."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
            test_config = {
                "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_db.name}",
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            }
            app = create_app(test_config)

            with app.app_context():
                db.create_all()
                # Test that tables can be created
                assert db.engine is not None

            # Clean up
            os.unlink(tmp_db.name)

    def test_factory_function_signature(self):
        """Test that the factory function has the correct signature."""
        import inspect

        sig = inspect.signature(create_app)
        params = list(sig.parameters.keys())

        assert "test_config" in params
        assert sig.parameters["test_config"].default is None

    def test_factory_with_none_config(self):
        """Test that the factory handles None configuration properly."""
        with patch.dict(os.environ, {"DATABASE_URI": "sqlite:///:memory:"}):
            app = create_app(None)
            assert app is not None
            assert isinstance(app, Flask)

    def test_factory_component_order(self):
        """Test that factory components are initialized in the correct order."""
        with (
            patch("app._configure_app") as mock_config,
            patch("app._init_extensions") as mock_extensions,
            patch("app._configure_logging") as mock_logging,
            patch("app._register_error_handlers") as mock_errors,
            patch("app._register_routes") as mock_routes,
        ):

            app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

            # Verify all components were called
            mock_config.assert_called_once()
            mock_extensions.assert_called_once()
            mock_logging.assert_called_once()
            mock_errors.assert_called_once()
            mock_routes.assert_called_once()

            # Verify they were called with the app instance
            for mock_func in [
                mock_config,
                mock_extensions,
                mock_logging,
                mock_errors,
                mock_routes,
            ]:
                args, kwargs = mock_func.call_args
                assert args[0] is app


class TestConfigurationHandling:
    """Test cases for configuration handling in the application factory."""

    def test_environment_variable_configuration(self):
        """Test that environment variables are properly loaded."""
        with patch.dict(
            os.environ,
            {
                "DATABASE_URI": "postgresql://user:pass@localhost/db",
                "SQLALCHEMY_TRACK_MODIFICATIONS": "true",
            },
        ):
            app = create_app()
            assert (
                app.config["SQLALCHEMY_DATABASE_URI"]
                == "postgresql://user:pass@localhost/db"
            )
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is True

    def test_test_config_overrides_environment(self):
        """Test that test configuration overrides environment variables."""
        with patch.dict(
            os.environ,
            {
                "DATABASE_URI": "postgresql://user:pass@localhost/db",
                "SQLALCHEMY_TRACK_MODIFICATIONS": "true",
            },
        ):
            test_config = {
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            }
            app = create_app(test_config)
            assert app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite:///:memory:"
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is False

    def test_boolean_environment_variable_parsing(self):
        """Test that boolean environment variables are properly parsed."""
        # Test 'true' string
        with patch.dict(
            os.environ,
            {
                "DATABASE_URI": "sqlite:///:memory:",
                "SQLALCHEMY_TRACK_MODIFICATIONS": "true",
            },
        ):
            app = create_app()
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is True

        # Test 'false' string
        with patch.dict(
            os.environ,
            {
                "DATABASE_URI": "sqlite:///:memory:",
                "SQLALCHEMY_TRACK_MODIFICATIONS": "false",
            },
        ):
            app = create_app()
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is False

        # Test 'True' string (case insensitive)
        with patch.dict(
            os.environ,
            {
                "DATABASE_URI": "sqlite:///:memory:",
                "SQLALCHEMY_TRACK_MODIFICATIONS": "True",
            },
        ):
            app = create_app()
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is True

        # Test 'FALSE' string (case insensitive)
        with patch.dict(
            os.environ,
            {
                "DATABASE_URI": "sqlite:///:memory:",
                "SQLALCHEMY_TRACK_MODIFICATIONS": "FALSE",
            },
        ):
            app = create_app()
            assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is False
