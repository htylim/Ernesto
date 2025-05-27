import os

from dotenv import load_dotenv
from flask import Flask

# Import models for backward compatibility
from app.models import ApiClient as ApiClient
from app.models import Article as Article
from app.models import Source as Source
from app.models import Topic as Topic

# Load environment variables from .env file
load_dotenv()


def create_app(test_config=None):
    """Factory function that creates and configures the Flask application.

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


def _configure_app(app, test_config=None):
    """Configure the Flask application with appropriate settings.

    Args:
        app (Flask): The Flask application instance.
        test_config (dict, optional): Test configuration to override defaults.
    """
    if test_config is None:
        # Load production/development configuration
        app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI")
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = (
            os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", "False").lower() == "true"
        )
    else:
        # Load the test config if passed in
        app.config.from_mapping(test_config)


def _init_extensions(app):
    """Initialize all Flask extensions with the application.

    Args:
        app (Flask): The Flask application instance.
    """
    from app.extensions import configure_extensions, init_extensions

    # Configure extension settings first
    configure_extensions(app)

    # Initialize extensions with the app
    init_extensions(app)


def _configure_logging(app):
    """Configure application logging.

    Args:
        app (Flask): The Flask application instance.
    """
    from app.logging_config import configure_logging

    configure_logging(app)


def _register_error_handlers(app):
    """Register error handlers with the application.

    Args:
        app (Flask): The Flask application instance.
    """
    from app.error_handlers import register_error_handlers

    register_error_handlers(app)


def _register_routes(app):
    """Register application routes.

    Args:
        app (Flask): The Flask application instance.
    """
    from app.routes import register_routes

    register_routes(app)
