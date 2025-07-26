"""Tests for authentication utilities."""

import logging
from unittest.mock import MagicMock, patch

from _pytest.logging import LogCaptureFixture
from flask import Flask, Response, g, jsonify
from sqlalchemy.exc import SQLAlchemyError

from app.auth import require_api_key
from app.extensions import db
from app.models.api_client import ApiClient


class TestRequireApiKeyDecorator:
    """Test cases for the require_api_key decorator."""

    def test_require_api_key_missing_header(self, app: Flask) -> None:
        """Test authentication fails when API key header is missing."""

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        with app.test_request_context("/", headers={}):
            response, status = protected_view()

        assert status == 401
        json = response.get_json()
        assert json["error"] == "Authentication failed"
        assert json["message"] == "API key is required"

    def test_require_api_key_empty_header(self, app: Flask) -> None:
        """Test authentication fails when API key header is empty."""

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        with app.test_request_context("/", headers={"X-API-Key": ""}):
            response, status = protected_view()

        assert status == 401
        json = response.get_json()
        assert json["error"] == "Authentication failed"
        assert json["message"] == "API key is required"

    def test_require_api_key_invalid_format(self, app: Flask) -> None:
        """Test authentication fails when API key format is invalid."""

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        with app.test_request_context("/", headers={"X-API-Key": "invalid-format"}):
            response, status = protected_view()

        assert status == 401
        json = response.get_json()
        assert json["error"] == "Authentication failed"
        assert json["message"] == "Invalid API key format"

    def test_require_api_key_malformed_key(self, app: Flask) -> None:
        """Test authentication fails when API key is malformed."""

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        # Test with missing secret part
        with app.test_request_context("/", headers={"X-API-Key": "client_name."}):
            response, status = protected_view()
        assert status == 401
        assert response.json["message"] == "Malformed API key"

        # Test with missing name part
        with app.test_request_context("/", headers={"X-API-Key": ".secret_key"}):
            response, status = protected_view()
        assert status == 401
        assert response.json["message"] == "Malformed API key"

    def test_require_api_key_invalid_key(self, app: Flask) -> None:
        """Test authentication fails with invalid API key."""

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        with app.test_request_context(
            "/", headers={"X-API-Key": "unknown_client.invalid-key"}
        ):
            response, status = protected_view()

        assert status == 401
        assert response.json["error"] == "Authentication failed"
        assert response.json["message"] == "Invalid or inactive API key"

    def test_require_api_key_inactive_client(
        self, app: Flask, sample_api_client: tuple[ApiClient, str]
    ) -> None:
        """Test authentication fails with inactive client."""
        api_client, api_key = sample_api_client
        api_client.is_active = False
        db.session.commit()

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        headers = {"X-API-Key": f"{api_client.name}.{api_key}"}
        with app.test_request_context("/", headers=headers):
            response, status = protected_view()

        assert status == 401
        assert response.json["error"] == "Authentication failed"
        assert response.json["message"] == "Invalid or inactive API key"

    def test_require_api_key_valid_authentication(
        self, app: Flask, sample_api_client: tuple[ApiClient, str]
    ) -> None:
        """Test successful authentication with valid API key."""
        api_client, api_key = sample_api_client
        original_use_count = api_client.use_count

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            assert g.api_client is not None
            assert g.api_client.name == api_client.name
            return jsonify({"message": "success"}), 200

        headers = {"X-API-Key": f"{api_client.name}.{api_key}"}
        with app.test_request_context("/", headers=headers):
            response, status = protected_view()

        assert status == 200
        assert response.json["message"] == "success"

        # Verify usage statistics were updated
        db.session.refresh(api_client)
        assert api_client.use_count == original_use_count + 1
        assert api_client.last_used_at is not None

    def test_require_api_key_preserves_function_metadata(self) -> None:
        """Test that decorator preserves original function metadata."""

        @require_api_key
        def original_function() -> Response:
            """Original docstring."""
            return Response("result")

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
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        # Test with first client's key
        headers1 = {"X-API-Key": f"{client1.name}.{api_key1}"}
        with app.test_request_context("/", headers=headers1):
            _response, status = protected_view()
        assert status == 200

        # Test with second client's key
        headers2 = {"X-API-Key": f"{client2.name}.{api_key2}"}
        with app.test_request_context("/", headers=headers2):
            _response, status = protected_view()
        assert status == 200

    def test_require_api_key_case_sensitive_header(
        self, app: Flask, sample_api_client: tuple[ApiClient, str]
    ) -> None:
        """Test API key header works regardless of case (Flask normalizes headers)."""
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        # Test with different case - should work (Flask normalizes headers)
        headers = {"x-api-key": f"{api_client.name}.{api_key}"}
        with app.test_request_context("/", headers=headers):
            _response, status = protected_view()
        assert status == 200  # Flask headers are case-insensitive

    def test_require_api_key_remote_ip_logging(
        self,
        app: Flask,
        sample_api_client: tuple[ApiClient, str],
        caplog: LogCaptureFixture,
    ) -> None:
        """Test that remote IP is logged correctly."""
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        with caplog.at_level(logging.INFO):
            headers = {"X-API-Key": f"{api_client.name}.{api_key}"}
            with app.test_request_context("/", headers=headers):
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
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

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
        sample_api_client: tuple[ApiClient, str],
        caplog: LogCaptureFixture,
    ) -> None:
        """Test handling of database errors during usage statistics update."""
        mock_commit.side_effect = SQLAlchemyError("Database connection failed")
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        with caplog.at_level(logging.ERROR):
            headers = {"X-API-Key": f"{api_client.name}.{api_key}"}
            with app.test_request_context("/", headers=headers):
                response, status = protected_view()

        # Authentication should still succeed despite stats update failure
        assert status == 200
        assert response.json["message"] == "success"

        # Check that error was logged
        error_logs = [
            record for record in caplog.records if record.levelno == logging.ERROR
        ]
        assert len(error_logs) == 1
        assert "Failed to update usage statistics" in error_logs[0].message

    @patch("app.models.api_client.ApiClient.query")
    def test_require_api_key_query_error_handling(
        self, mock_query: MagicMock, app: Flask, caplog: LogCaptureFixture
    ) -> None:
        """Test graceful handling of database query errors."""
        mock_query.filter_by.side_effect = SQLAlchemyError("DB connection failed")

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        with app.test_request_context(
            "/", headers={"X-API-Key": "client_name.some_key"}
        ):
            response, status = protected_view()

        assert status == 500
        assert "Authentication service unavailable" in response.json["error"]
        assert "DB connection failed" in caplog.text

    @patch("app.models.api_client.ApiClient.check_api_key")
    def test_require_api_key_unexpected_error_handling(
        self,
        mock_check: MagicMock,
        app: Flask,
        sample_api_client: tuple[ApiClient, str],
    ) -> None:
        """Test graceful handling of unexpected errors."""
        mock_check.side_effect = Exception("Unexpected error")
        api_client, api_key = sample_api_client

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        headers = {"X-API-Key": f"{api_client.name}.{api_key}"}
        with app.test_request_context("/", headers=headers):
            response, status = protected_view()

        assert status == 500
        assert "Authentication service error" in response.json["error"]

    def test_require_api_key_x_forwarded_for_header(
        self,
        app: Flask,
        sample_api_client: tuple[ApiClient, str],
        caplog: LogCaptureFixture,
    ) -> None:
        """Test that X-Forwarded-For header is used for IP logging."""
        api_client, api_key = sample_api_client
        forwarded_ip = "192.168.1.100"

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        with caplog.at_level(logging.INFO):
            headers = {
                "X-API-Key": f"{api_client.name}.{api_key}",
                "X-Forwarded-For": forwarded_ip,
            }
            with app.test_request_context("/", headers=headers):
                protected_view()

        # Check that the forwarded IP was logged
        auth_logs = [
            record
            for record in caplog.records
            if "Authentication successful" in record.message
        ]
        assert len(auth_logs) == 1
        assert "Authentication successful" in auth_logs[0].message
        assert forwarded_ip in auth_logs[0].message

    def test_require_api_key_timing_safe_comparison(self, app: Flask) -> None:
        """Ensure decorator relies on a secure comparison method.

        This test verifies that the decorator's logic proceeds to a point
        where a secure check (like bcrypt) would be called, rather than
        failing early based on an insecure direct comparison.
        """
        client, _api_key = ApiClient.create_with_api_key("timing-client")
        db.session.add(client)
        db.session.commit()

        @require_api_key
        def protected_view() -> tuple[Response, int]:
            return jsonify({"message": "success"}), 200

        # Correct client name, but wrong key. Should still reach check_api_key.
        headers = {"X-API-Key": f"{client.name}.wrong-key"}
        with patch.object(ApiClient, "check_api_key", return_value=False) as mock_check:
            with app.test_request_context("/", headers=headers):
                _response, status = protected_view()

        assert status == 401
        mock_check.assert_called_once_with("wrong-key")


class TestAuthenticationIntegration:
    """Integration tests for authentication with Flask routes."""

    def test_decorator_works_with_flask_routes(self, app: Flask) -> None:
        """Test that the decorator correctly protects a Flask route."""
        # Setup test client in the database
        client, api_key = ApiClient.create_with_api_key("test-client")
        db.session.add(client)
        db.session.commit()

        @app.route("/protected")
        @require_api_key
        def protected_route() -> Response:  # pyright: ignore[reportUnusedFunction]
            return jsonify({"message": "Access granted"})

        with app.test_client() as test_client:
            # Test without API key
            response = test_client.get("/protected")
            assert response.status_code == 401
            assert "API key is required" in response.json["message"]

            # Test with invalid API key
            response = test_client.get(
                "/protected", headers={"X-API-Key": "invalid.key"}
            )
            assert response.status_code == 401
            assert "Invalid or inactive API key" in response.json["message"]

            # Test with valid API key
            headers = {"X-API-Key": f"{client.name}.{api_key}"}
            response = test_client.get("/protected", headers=headers)
            assert response.status_code == 200
            assert response.json["message"] == "Access granted"
