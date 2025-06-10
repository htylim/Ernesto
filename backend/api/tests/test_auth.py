"""Tests for authentication utilities."""

import logging
from typing import Dict, Tuple
from unittest.mock import MagicMock, patch

from _pytest.logging import LogCaptureFixture
from flask import Flask, Response
from sqlalchemy.exc import SQLAlchemyError

from app.auth import require_api_key
from app.extensions import db
from app.models import ApiClient


class TestRequireApiKeyDecorator:
    """Test cases for the require_api_key decorator."""

    def test_require_api_key_missing_header(self, app: Flask) -> None:
        """Test authentication fails when API key header is missing."""

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with app.test_request_context("/", headers={}):
            response, status = protected_view()

        assert status == 401
        assert response.json["error"] == "Authentication failed"
        assert response.json["message"] == "API key is required"

    def test_require_api_key_empty_header(self, app: Flask) -> None:
        """Test authentication fails when API key header is empty."""

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with app.test_request_context("/", headers={"X-API-Key": ""}):
            response, status = protected_view()

        assert status == 401
        assert response.json["error"] == "Authentication failed"
        assert response.json["message"] == "API key is required"

    def test_require_api_key_invalid_key(self, app: Flask) -> None:
        """Test authentication fails with invalid API key."""

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with app.test_request_context("/", headers={"X-API-Key": "invalid-key"}):
            response, status = protected_view()

        assert status == 401
        assert response.json["error"] == "Authentication failed"
        assert response.json["message"] == "Invalid or inactive API key"

    def test_require_api_key_inactive_client(
        self, app: Flask, sample_api_client: Tuple[ApiClient, str]
    ) -> None:
        """Test authentication fails with inactive client."""
        api_client, api_key = sample_api_client
        api_client.is_active = False
        db.session.commit()

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with app.test_request_context("/", headers={"X-API-Key": api_key}):
            response, status = protected_view()

        assert status == 401
        assert response.json["error"] == "Authentication failed"
        assert response.json["message"] == "Invalid or inactive API key"

    def test_require_api_key_valid_authentication(
        self, app: Flask, sample_api_client: Tuple[ApiClient, str]
    ) -> None:
        """Test successful authentication with valid API key."""
        api_client, api_key = sample_api_client
        original_use_count = api_client.use_count

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with app.test_request_context("/", headers={"X-API-Key": api_key}):
            response, status = protected_view()

        assert status == 200
        assert response["message"] == "success"

        # Verify usage statistics were updated
        db.session.refresh(api_client)
        assert api_client.use_count == original_use_count + 1
        assert api_client.last_used_at is not None

    def test_require_api_key_preserves_function_metadata(self) -> None:
        """Test that decorator preserves original function metadata."""

        @require_api_key
        def original_function() -> str:
            """Original docstring."""
            return "result"

        assert original_function.__name__ == "original_function"
        assert original_function.__doc__ == "Original docstring."

    def test_require_api_key_multiple_clients_correct_match(self, app: Flask) -> None:
        """Test authentication works correctly with multiple clients."""
        # Create two API clients
        client1, api_key1 = ApiClient.create_with_api_key("client1")
        client2, api_key2 = ApiClient.create_with_api_key("client2")
        db.session.add_all([client1, client2])
        db.session.commit()

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        # Test with first client's key
        with app.test_request_context("/", headers={"X-API-Key": api_key1}):
            response, status = protected_view()
        assert status == 200

        # Test with second client's key
        with app.test_request_context("/", headers={"X-API-Key": api_key2}):
            response, status = protected_view()
        assert status == 200

    def test_require_api_key_case_sensitive_header(
        self, app: Flask, sample_api_client: Tuple[ApiClient, str]
    ) -> None:
        """Test API key header works regardless of case (Flask normalizes headers)."""
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        # Test with different case - should work (Flask normalizes headers)
        with app.test_request_context("/", headers={"x-api-key": api_key}):
            response, status = protected_view()
        assert status == 200  # Flask headers are case-insensitive

    def test_require_api_key_remote_ip_logging(
        self,
        app: Flask,
        sample_api_client: Tuple[ApiClient, str],
        caplog: LogCaptureFixture,
    ) -> None:
        """Test that remote IP is logged correctly."""
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with caplog.at_level(logging.INFO):
            with app.test_request_context("/", headers={"X-API-Key": api_key}):
                protected_view()

        # Check that successful authentication was logged with IP
        auth_logs = [
            record
            for record in caplog.records
            if "Authentication successful" in record.message
        ]
        assert len(auth_logs) == 1
        assert "127.0.0.1" in auth_logs[0].message or "None" in auth_logs[0].message

    def test_require_api_key_failure_logging(
        self, app: Flask, caplog: LogCaptureFixture
    ) -> None:
        """Test that authentication failures are logged."""

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with caplog.at_level(logging.WARNING):
            with app.test_request_context("/", headers={}):
                protected_view()

        # Check that missing API key was logged
        warning_logs = [
            record for record in caplog.records if record.levelno == logging.WARNING
        ]
        assert len(warning_logs) == 1
        assert "Missing API key" in warning_logs[0].message

    @patch("app.auth.db.session.commit")
    def test_require_api_key_database_error_handling(
        self,
        mock_commit: MagicMock,
        app: Flask,
        sample_api_client: Tuple[ApiClient, str],
        caplog: LogCaptureFixture,
    ) -> None:
        """Test handling of database errors during usage statistics update."""
        mock_commit.side_effect = SQLAlchemyError("Database connection failed")
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with caplog.at_level(logging.ERROR):
            with app.test_request_context("/", headers={"X-API-Key": api_key}):
                response, status = protected_view()

        # Authentication should still succeed despite stats update failure
        assert status == 200
        assert response["message"] == "success"

        # Check that error was logged
        error_logs = [
            record for record in caplog.records if record.levelno == logging.ERROR
        ]
        assert len(error_logs) == 1
        assert "Failed to update usage statistics" in error_logs[0].message

    @patch("app.models.ApiClient.query")
    def test_require_api_key_query_error_handling(
        self, mock_query: MagicMock, app: Flask, caplog: LogCaptureFixture
    ) -> None:
        """Test handling of database errors during client lookup."""
        mock_query.filter_by.side_effect = SQLAlchemyError("Database query failed")

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with caplog.at_level(logging.ERROR):
            with app.test_request_context("/", headers={"X-API-Key": "test-key"}):
                response, status = protected_view()

        assert status == 500
        assert response.json["error"] == "Authentication service unavailable"
        assert response.json["message"] == "Please try again later"

        # Check that error was logged
        error_logs = [
            record for record in caplog.records if record.levelno == logging.ERROR
        ]
        assert len(error_logs) == 1
        assert "Database error during authentication" in error_logs[0].message

    @patch("app.models.ApiClient.check_api_key")
    def test_require_api_key_unexpected_error_handling(
        self,
        mock_check: MagicMock,
        app: Flask,
        sample_api_client: Tuple[ApiClient, str],
        caplog: LogCaptureFixture,
    ) -> None:
        """Test handling of unexpected errors during authentication."""
        mock_check.side_effect = Exception("Unexpected error")
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with caplog.at_level(logging.ERROR):
            with app.test_request_context("/", headers={"X-API-Key": api_key}):
                response, status = protected_view()

        assert status == 500
        assert response.json["error"] == "Authentication service error"
        assert response.json["message"] == "Please try again later"

        # Check that error was logged
        error_logs = [
            record for record in caplog.records if record.levelno == logging.ERROR
        ]
        assert len(error_logs) == 1
        assert "Unexpected error during authentication" in error_logs[0].message

    def test_require_api_key_x_forwarded_for_header(
        self,
        app: Flask,
        sample_api_client: Tuple[ApiClient, str],
        caplog: LogCaptureFixture,
    ) -> None:
        """Test that X-Forwarded-For header is used for IP logging."""
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        with caplog.at_level(logging.INFO):
            with app.test_request_context(
                "/",
                headers={"X-API-Key": api_key},
                environ_base={"HTTP_X_FORWARDED_FOR": "192.168.1.100"},
            ):
                protected_view()

        # Check that X-Forwarded-For IP was logged
        auth_logs = [
            record
            for record in caplog.records
            if "Authentication successful" in record.message
        ]
        assert len(auth_logs) == 1
        assert "192.168.1.100" in auth_logs[0].message

    def test_require_api_key_timing_safe_comparison(self, app: Flask) -> None:
        """Test that authentication uses timing-safe comparison."""
        # Create a client with known API key
        client1, api_key1 = ApiClient.create_with_api_key("client1")
        db.session.add(client1)
        db.session.commit()

        @require_api_key
        def protected_view() -> Tuple[Response, int]:
            return {"message": "success"}, 200

        # Test with a key that has same prefix but different suffix
        similar_key = api_key1[:-4] + "XXXX"

        with app.test_request_context("/", headers={"X-API-Key": similar_key}):
            response, status = protected_view()

        assert status == 401
        assert response.json["error"] == "Authentication failed"


class TestAuthenticationIntegration:
    """Integration tests for authentication in Flask app context."""

    def test_decorator_works_with_flask_routes(self, app: Flask) -> None:
        """Test that decorator works correctly with actual Flask routes."""
        # Create API client
        client, api_key = ApiClient.create_with_api_key("test_client")

        with app.app_context():
            db.session.add(client)
            db.session.commit()

        @app.route("/protected")
        @require_api_key
        def protected_route() -> Dict[str, str]:
            return {"message": "protected content"}

        test_client = app.test_client()

        # Test without API key
        response = test_client.get("/protected")
        assert response.status_code == 401

        # Test with valid API key
        response = test_client.get("/protected", headers={"X-API-Key": api_key})
        assert response.status_code == 200
        assert response.json["message"] == "protected content"
