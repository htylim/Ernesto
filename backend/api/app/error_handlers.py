"""Error handlers for the Flask application.

This module provides centralized error handling with consistent JSON responses
and appropriate logging for debugging purposes.
"""

from typing import TYPE_CHECKING, Tuple, Union

from flask import Response, jsonify, request
from werkzeug.exceptions import HTTPException

if TYPE_CHECKING:
    from flask import Flask


def register_error_handlers(app: "Flask") -> None:
    """Register error handlers with the Flask application.

    Args:
        app (Flask): The Flask application instance.

    """

    @app.errorhandler(400)
    def bad_request(error: Exception) -> Tuple[Response, int]:
        """Handle 400 Bad Request errors."""
        app.logger.warning(f"Bad request from {request.remote_addr}: {request.url}")
        return (
            jsonify(
                {
                    "error": "Bad Request",
                    "message": "The request could not be understood by the server due to malformed syntax.",
                    "status_code": 400,
                }
            ),
            400,
        )

    @app.errorhandler(401)
    def unauthorized(error: Exception) -> Tuple[Response, int]:
        """Handle 401 Unauthorized errors."""
        app.logger.warning(
            f"Unauthorized access attempt from {request.remote_addr}: {request.url}"
        )
        return (
            jsonify(
                {
                    "error": "Unauthorized",
                    "message": "Authentication is required to access this resource.",
                    "status_code": 401,
                }
            ),
            401,
        )

    @app.errorhandler(403)
    def forbidden(error: Exception) -> Tuple[Response, int]:
        """Handle 403 Forbidden errors."""
        app.logger.warning(
            f"Forbidden access attempt from {request.remote_addr}: {request.url}"
        )
        return (
            jsonify(
                {
                    "error": "Forbidden",
                    "message": "You do not have permission to access this resource.",
                    "status_code": 403,
                }
            ),
            403,
        )

    @app.errorhandler(404)
    def not_found(error: Exception) -> Tuple[Response, int]:
        """Handle 404 Not Found errors."""
        app.logger.info(f"404 error from {request.remote_addr}: {request.url}")
        return (
            jsonify(
                {
                    "error": "Not Found",
                    "message": "The requested resource could not be found.",
                    "status_code": 404,
                }
            ),
            404,
        )

    @app.errorhandler(405)
    def method_not_allowed(error: Exception) -> Tuple[Response, int]:
        """Handle 405 Method Not Allowed errors."""
        app.logger.warning(
            f"Method not allowed from {request.remote_addr}: {request.method} {request.url}"
        )
        return (
            jsonify(
                {
                    "error": "Method Not Allowed",
                    "message": f"The {request.method} method is not allowed for this resource.",
                    "status_code": 405,
                }
            ),
            405,
        )

    @app.errorhandler(500)
    def internal_server_error(error: Exception) -> Tuple[Response, int]:
        """Handle 500 Internal Server Error."""
        app.logger.error(f"Internal server error: {error}", exc_info=True)
        return (
            jsonify(
                {
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred. Please try again later.",
                    "status_code": 500,
                }
            ),
            500,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(
        error: Exception,
    ) -> Union[HTTPException, Tuple[Response, int]]:
        """Handle any unexpected exceptions that aren't caught by specific handlers."""
        # If it's an HTTP exception, let the specific handler deal with it
        if isinstance(error, HTTPException):
            return error

        # Log the unexpected error with full traceback
        app.logger.error(f"Unexpected error: {error}", exc_info=True)

        # Return a generic 500 error response
        return (
            jsonify(
                {
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred. Please try again later.",
                    "status_code": 500,
                }
            ),
            500,
        )

    app.logger.info("Error handlers registered successfully")
