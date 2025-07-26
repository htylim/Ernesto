"""Flask application factory and configuration module.

This module provides the application factory pattern for creating and configuring
Flask application instances with all necessary extensions, routes, and error handlers.
"""

import time
from typing import TYPE_CHECKING

from dotenv import load_dotenv
from flask import Flask, Response, g, request

if TYPE_CHECKING:
    from typing import Any, Optional

# Load environment variables from .env file
load_dotenv()


def create_app(test_config: Optional[dict[str, "Any"]] = None) -> Flask:
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

    # Register request handlers for logging
    _register_request_handlers(app)

    # Register error handlers
    _register_error_handlers(app)

    # Register routes
    _register_routes(app)

    return app


def _configure_app(app: Flask, test_config: Optional[dict[str, "Any"]] = None) -> None:
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


def _register_request_handlers(app: Flask) -> None:
    """Register request logging handlers with the application.

    Args:
        app (Flask): The Flask application instance.

    """

    @app.before_request
    def log_request_start() -> None:  # pyright: ignore [reportUnusedFunction]
        """Log the start of each request with basic information."""
        # Get remote IP (handle X-Forwarded-For for proxy/load balancer)
        remote_ip = request.environ.get("HTTP_X_FORWARDED_FOR", request.remote_addr)
        user_agent = request.headers.get("User-Agent", "Unknown")

        # Store start time for timing calculations
        g.start_time = time.time()

        # Log basic request information
        app.logger.info(
            "Request started: %s %s from IP %s (User-Agent: %s)",
            request.method,
            request.path,
            remote_ip,
            user_agent,
        )

        # Debug-level logging for development (excluding sensitive data)
        if app.config.get("DEBUG") and app.logger.isEnabledFor(
            app.logger.getEffectiveLevel()
        ):
            # Log query parameters for GET requests (no sensitive data expected)
            if request.method == "GET" and request.args:
                # Filter out potentially sensitive parameters
                safe_params = {
                    k: v
                    for k, v in request.args.items()
                    if k.lower() not in ["api_key", "password", "token", "secret"]
                }
                if safe_params:
                    app.logger.debug("Query parameters: %s", safe_params)

            # Log request body size for POST/PUT (not content for security)
            if request.method in ["POST", "PUT", "PATCH"] and hasattr(
                request, "content_length"
            ):
                if request.content_length:
                    app.logger.debug(
                        "Request body size: %d bytes", request.content_length
                    )

    @app.after_request
    def log_request_end(  # pyright: ignore[reportUnusedFunction]
        response: Response,
    ) -> Response:
        """Log the completion of each request with response information.

        Args:
            response: The Flask response object.

        Returns:
            The unmodified response object.

        """
        # Get remote IP for consistency
        remote_ip = request.environ.get("HTTP_X_FORWARDED_FOR", request.remote_addr)

        # Calculate request duration
        duration = None
        if hasattr(g, "start_time"):
            duration = time.time() - g.start_time

        # Log response information
        if duration is not None:
            app.logger.info(
                "Request completed: %s %s -> %d (%s) in %.3f seconds from IP %s",
                request.method,
                request.path,
                response.status_code,
                response.status,
                duration,
                remote_ip,
            )
        else:
            app.logger.info(
                "Request completed: %s %s -> %d (%s) from IP %s",
                request.method,
                request.path,
                response.status_code,
                response.status,
                remote_ip,
            )

        # Debug-level logging for response details
        if app.config.get("DEBUG") and app.logger.isEnabledFor(
            app.logger.getEffectiveLevel()
        ):
            # Log response size if available
            if hasattr(response, "content_length") and response.content_length:
                app.logger.debug("Response size: %d bytes", response.content_length)

        return response


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
