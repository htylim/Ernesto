"""Logging configuration for the Flask application.

This module provides environment-specific logging configuration for development,
testing, and production environments with appropriate handlers and formatters.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from flask import Flask


def configure_logging(app: "Flask") -> None:
    """Configure logging for the Flask application based on the environment.

    Args:
        app (Flask): The Flask application instance.

    """
    # Get the log level from configuration
    log_level_str = app.config.get("LOG_LEVEL", "INFO")
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)

    # Set the app logger level
    app.logger.setLevel(log_level)

    # Properly close and remove existing handlers to avoid resource leaks
    for handler in app.logger.handlers[:]:
        handler.close()
        app.logger.removeHandler(handler)

    # Configure based on environment
    if app.config.get("TESTING"):
        _configure_testing_logging(app, log_level)
    elif app.config.get("DEBUG"):
        _configure_development_logging(app, log_level)
    else:
        _configure_production_logging(app, log_level)

    # Log the logging configuration
    app.logger.info(f"Logging configured for environment: {_get_environment_name(app)}")


def _configure_development_logging(app: "Flask", log_level: int) -> None:
    """Configure logging for development environment."""
    # Create console handler with detailed formatting
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)

    # Detailed format for development
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console_handler.setFormatter(formatter)

    app.logger.addHandler(console_handler)


def _configure_testing_logging(app: "Flask", log_level: int) -> None:
    """Configure logging for testing environment."""
    # Create console handler with minimal formatting to reduce test noise
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)

    # Minimal format for testing
    formatter = logging.Formatter("%(levelname)s: %(message)s")
    console_handler.setFormatter(formatter)

    app.logger.addHandler(console_handler)


def _configure_production_logging(app: "Flask", log_level: int) -> None:
    """Configure logging for production environment."""
    # Ensure logs directory exists
    logs_dir = os.path.join(os.path.dirname(app.instance_path), "logs")
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)

    # Create rotating file handler for production
    log_file = os.path.join(logs_dir, "ernesto_api.log")
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,
        backupCount=10,  # 10MB
    )
    file_handler.setLevel(log_level)

    # Structured format for production with timestamps
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(formatter)

    app.logger.addHandler(file_handler)

    # Also add console handler for production (for container logs)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.ERROR)  # Only errors to console in production

    # Simple format for console in production
    console_formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)

    app.logger.addHandler(console_handler)


def _get_environment_name(app: "Flask") -> str:
    """Get a human-readable environment name based on app configuration."""
    if app.config.get("TESTING"):
        return "testing"
    elif app.config.get("DEBUG"):
        return "development"
    else:
        return "production"
