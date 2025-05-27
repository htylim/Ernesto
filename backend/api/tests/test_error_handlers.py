"""
Unit tests for error handlers.

Tests verify that error handlers are properly registered and return
appropriate JSON responses with correct status codes and logging.
"""

import json

import pytest
from flask import Flask

from app import create_app
from app.error_handlers import register_error_handlers


class TestErrorHandlers:
    """Test cases for error handler functionality."""

    @pytest.fixture
    def app(self):
        """Create a test Flask application with error handlers."""
        app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            }
        )
        return app

    @pytest.fixture
    def client(self, app):
        """Create a test client for the Flask application."""
        return app.test_client()

    def test_404_not_found_handler(self, client):
        """Test that 404 errors return proper JSON response."""
        response = client.get("/nonexistent-route")

        assert response.status_code == 404
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert data["error"] == "Not Found"
        assert data["message"] == "The requested resource could not be found."
        assert data["status_code"] == 404

    def test_405_method_not_allowed_handler(self, app, client):
        """Test that 405 errors return proper JSON response."""

        # Create a route that only accepts GET requests
        @app.route("/test-route", methods=["GET"])
        def test_route():
            return {"message": "success"}

        # Try to POST to a GET-only route
        response = client.post("/test-route")

        assert response.status_code == 405
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert data["error"] == "Method Not Allowed"
        assert "POST method is not allowed" in data["message"]
        assert data["status_code"] == 405

    def test_500_internal_server_error_handler(self, app, client):
        """Test that 500 errors return proper JSON response."""

        # Create a route that raises an exception
        @app.route("/trigger-error")
        def trigger_error():
            raise Exception("Test exception")

        response = client.get("/trigger-error")

        assert response.status_code == 500
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert data["error"] == "Internal Server Error"
        assert (
            data["message"] == "An unexpected error occurred. Please try again later."
        )
        assert data["status_code"] == 500

    def test_400_bad_request_handler(self, app, client):
        """Test that 400 errors return proper JSON response."""
        from werkzeug.exceptions import BadRequest

        # Create a route that raises a BadRequest exception
        @app.route("/bad-request")
        def bad_request():
            raise BadRequest("Invalid request data")

        response = client.get("/bad-request")

        assert response.status_code == 400
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert data["error"] == "Bad Request"
        assert (
            data["message"]
            == "The request could not be understood by the server due to malformed syntax."
        )
        assert data["status_code"] == 400

    def test_401_unauthorized_handler(self, app, client):
        """Test that 401 errors return proper JSON response."""
        from werkzeug.exceptions import Unauthorized

        # Create a route that raises an Unauthorized exception
        @app.route("/unauthorized")
        def unauthorized():
            raise Unauthorized("Authentication required")

        response = client.get("/unauthorized")

        assert response.status_code == 401
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert data["error"] == "Unauthorized"
        assert data["message"] == "Authentication is required to access this resource."
        assert data["status_code"] == 401

    def test_403_forbidden_handler(self, app, client):
        """Test that 403 errors return proper JSON response."""
        from werkzeug.exceptions import Forbidden

        # Create a route that raises a Forbidden exception
        @app.route("/forbidden")
        def forbidden():
            raise Forbidden("Access denied")

        response = client.get("/forbidden")

        assert response.status_code == 403
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert data["error"] == "Forbidden"
        assert data["message"] == "You do not have permission to access this resource."
        assert data["status_code"] == 403

    def test_unexpected_exception_handler(self, app, client):
        """Test that unexpected exceptions are handled properly."""

        # Create a route that raises a custom exception
        @app.route("/custom-error")
        def custom_error():
            raise ValueError("Custom error message")

        response = client.get("/custom-error")

        assert response.status_code == 500
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert data["error"] == "Internal Server Error"
        assert (
            data["message"] == "An unexpected error occurred. Please try again later."
        )
        assert data["status_code"] == 500

    def test_error_handlers_registration(self):
        """Test that error handlers can be registered with a Flask app."""
        app = Flask(__name__)

        # Register error handlers
        register_error_handlers(app)

        # Verify that error handlers are registered
        assert 404 in app.error_handler_spec[None]
        assert 500 in app.error_handler_spec[None]
        # Exception handler is registered under None key in the nested dict
        assert Exception in app.error_handler_spec[None][None]

    def test_error_response_structure(self, client):
        """Test that all error responses have consistent structure."""
        response = client.get("/nonexistent-route")

        assert response.status_code == 404
        data = json.loads(response.data)

        # Verify required fields are present
        required_fields = ["error", "message", "status_code"]
        for field in required_fields:
            assert field in data
            assert data[field] is not None

        # Verify data types
        assert isinstance(data["error"], str)
        assert isinstance(data["message"], str)
        assert isinstance(data["status_code"], int)

    def test_logging_on_errors(self, app, client, caplog):
        """Test that errors are properly logged."""

        # Create a route that raises an exception
        @app.route("/log-test")
        def log_test():
            raise Exception("Test logging")

        with caplog.at_level("ERROR"):
            response = client.get("/log-test")

        assert response.status_code == 500

        # Check that error was logged
        assert len(caplog.records) > 0
        error_logs = [
            record for record in caplog.records if record.levelname == "ERROR"
        ]
        assert len(error_logs) > 0
        assert "Test logging" in str(error_logs[0].message)
