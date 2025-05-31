"""Flask application factory and configuration module.

This module provides the application factory pattern for creating and configuring
Flask application instances with all necessary extensions, routes, and error handlers.
"""

from typing import TYPE_CHECKING, Dict, Optional

from dotenv import load_dotenv
from flask import Flask

# Import models for backward compatibility
from app.models import ApiClient as ApiClient
from app.models import Article as Article
from app.models import Source as Source
from app.models import Topic as Topic

if TYPE_CHECKING:
    from typing import Any

# Load environment variables from .env file
load_dotenv()


def create_app(test_config: Optional[Dict[str, "Any"]] = None) -> Flask:
    """Create and configure the Flask application.

    Args:
        test_config (dict, optional): Test configuration to override default configs.

    Returns:
        Flask: Configured Flask application instance.

    """
    # Create the Flask application
    app = Flask(__name__)

    # Load configuration
    _configure_app(app, test_config)

    # Initialize and configure extensions
    _init_extensions(app)

    # Configure logging
    _configure_logging(app)

    # Register error handlers
    _register_error_handlers(app)

    # Register routes
    _register_routes(app)

    return app


def _configure_app(app: Flask, test_config: Optional[Dict[str, "Any"]] = None) -> None:
    """Configure the Flask application with appropriate settings.

    Args:
        app (Flask): The Flask application instance.
        test_config (dict, optional): Test configuration to override defaults.

    """
    if test_config is None:
        # Load configuration using the proper configuration system
        from app.config import get_config

        try:
            # Get the appropriate configuration instance based on environment
            # This will also run comprehensive validation
            config_instance = get_config()
            app.config.from_object(config_instance)

            app.logger.info(
                f"Loaded configuration: {config_instance.__class__.__name__}"
            )

        except Exception as e:
            # Log configuration errors and re-raise
            app.logger.error(f"Configuration validation failed: {e}")
            raise
    else:
        # Load the test config if passed in
        app.config.from_mapping(test_config)
        app.logger.info("Loaded test configuration")


def _init_extensions(app: Flask) -> None:
    """Initialize all Flask extensions with the application.

    Args:
        app (Flask): The Flask application instance.

    """
    from app.extensions import configure_extensions, init_extensions

    # Configure extension settings first
    configure_extensions(app)

    # Initialize extensions with the app
    init_extensions(app)


def _configure_logging(app: Flask) -> None:
    """Configure application logging.

    Args:
        app (Flask): The Flask application instance.

    """
    from app.logging_config import configure_logging

    configure_logging(app)


def _register_error_handlers(app: Flask) -> None:
    """Register error handlers with the application.

    Args:
        app (Flask): The Flask application instance.

    """
    from app.error_handlers import register_error_handlers

    register_error_handlers(app)


def _register_routes(app: Flask) -> None:
    """Register application routes.

    Args:
        app (Flask): The Flask application instance.

    """
    from app.routes import register_routes

    register_routes(app)
