"""Flask extensions initialization module.

This module centralizes the initialization of all Flask extensions used in the application.
Extensions are initialized here without being bound to any specific app instance,
following the application factory pattern best practices.
"""

from typing import TYPE_CHECKING

from flask_alembic import Alembic
from flask_cors import CORS
from flask_marshmallow import Marshmallow
from flask_sqlalchemy import SQLAlchemy

if TYPE_CHECKING:
    from flask import Flask

# Initialize SQLAlchemy instance
# This creates the extension instance without binding it to any Flask app
db = SQLAlchemy()

# Initialize Flask-Alembic instance
# This handles database migrations and schema management
alembic = Alembic()

# Initialize Flask-Marshmallow instance
# This handles serialization/deserialization of SQLAlchemy models
ma = Marshmallow()

# Initialize Flask-CORS instance
# This handles Cross-Origin Resource Sharing for Chrome extension client access
cors = CORS()


def init_extensions(app: "Flask") -> None:
    """Initialize all Flask extensions with the given app instance.

    This function should be called from the application factory to bind
    all extensions to the Flask app instance.

    Args:
        app (Flask): The Flask application instance to bind extensions to.

    """
    # Initialize SQLAlchemy with the app
    # This must be done before importing models or initializing Alembic
    db.init_app(app)

    # Initialize Flask-CORS with configuration from Flask config
    cors.init_app(
        app,
        origins=app.config.get("CORS_ORIGINS", []),
        methods=app.config.get(
            "CORS_METHODS", ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        ),
        allow_headers=app.config.get("CORS_HEADERS", ["Content-Type", "X-API-Key"]),
        supports_credentials=app.config.get("CORS_SUPPORTS_CREDENTIALS", False),
    )

    # Log CORS configuration for debugging in development
    if app.config.get("DEBUG"):
        app.logger.debug(
            f"CORS origins configured: {app.config.get('CORS_ORIGINS', [])}"
        )

    # Initialize Flask-Marshmallow with the app
    # This must be done after SQLAlchemy initialization
    ma.init_app(app)

    # Initialize Flask-Alembic with the app
    # Models will be discovered when imported by routes and other modules
    alembic.init_app(app)


def configure_extensions(app: "Flask") -> None:
    """Configure extensions with app-specific settings.

    This function handles any additional configuration that extensions
    might need beyond basic initialization.

    Args:
        app (Flask): The Flask application instance.

    """
    # Configure SQLAlchemy settings
    # These can be overridden by app configuration
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        app.logger.warning("SQLALCHEMY_DATABASE_URI not configured")

    if not app.config.get("SQLALCHEMY_TRACK_MODIFICATIONS"):
        # Default to False for better performance
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
