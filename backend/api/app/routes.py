from flask import jsonify

from app.auth import require_api_key


def register_routes(app):
    """Register all routes with the Flask application.

    Args:
        app (Flask): The Flask application.
    """

    @app.route("/")
    def hello_world():
        """Basic test endpoint."""
        return "<p>Hello from the API!</p>"

    @app.route("/api/secure-endpoint")
    @require_api_key
    def secure_endpoint():
        """Example of a protected endpoint that requires API key."""
        return jsonify({"message": "You have access to this secure endpoint"})

    # Add more route registrations here as needed
