"""Route definitions for the Flask application.

This module contains all route definitions and their corresponding view functions.
Routes are registered with the Flask application through the register_routes function.
"""

from typing import TYPE_CHECKING

from flask import Response, jsonify

from app.auth import require_api_key

if TYPE_CHECKING:
    from flask import Flask


def register_routes(app: "Flask") -> None:
    """Register all routes with the Flask application.

    Args:
        app (Flask): The Flask application.

    """

    @app.route("/")
    def hello_world() -> str:  # pyright: ignore[reportUnusedFunction]
        """Return basic test endpoint response."""
        return "<p>Hello from the API!</p>"

    @app.route("/api/secure-endpoint")
    @require_api_key
    def secure_endpoint() -> Response:  # pyright: ignore[reportUnusedFunction]
        """Return response for protected endpoint that requires API key."""
        return jsonify({"message": "You have access to this secure endpoint"})

    # Add more route registrations here as needed
