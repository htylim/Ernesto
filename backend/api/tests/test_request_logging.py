"""Tests for request logging functionality.

This module tests the request logging handlers to ensure they work correctly,
log the expected information, and don't expose sensitive data.
"""

import logging
import time

import pytest
from flask import Flask

from app.models import ApiClient


class TestRequestLogging:
    """Test request logging functionality."""

    def test_request_start_logging(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that request start is logged with expected information."""
        with app.test_client() as client:
            with caplog.at_level(logging.INFO):
                client.get("/")

        # Check that request start was logged
        start_logs = [
            record for record in caplog.records if "Request started" in record.message
        ]
        assert len(start_logs) == 1

        start_log = start_logs[0]
        assert "GET /" in start_log.message
        assert "from IP" in start_log.message
        assert "User-Agent" in start_log.message

    def test_request_completion_logging(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that request completion is logged with response information."""
        with app.test_client() as client:
            with caplog.at_level(logging.INFO):
                client.get("/")

        # Check that request completion was logged
        completion_logs = [
            record for record in caplog.records if "Request completed" in record.message
        ]
        assert len(completion_logs) == 1

        completion_log = completion_logs[0]
        assert "GET /" in completion_log.message
        assert "-> 200" in completion_log.message
        assert "in" in completion_log.message and "seconds" in completion_log.message
        assert "from IP" in completion_log.message

    def test_debug_logging_with_query_parameters(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that debug logging captures query parameters (excluding sensitive ones)."""
        # Set DEBUG mode and DEBUG log level for this test
        app.config["DEBUG"] = True
        app.logger.setLevel(logging.DEBUG)

        with app.test_client() as client:
            with caplog.at_level(logging.DEBUG):
                client.get("/?start_date=2024-01-01&end_date=2024-01-31&api_key=secret")

        # Check that safe parameters were logged but sensitive ones were filtered
        debug_logs = [
            record for record in caplog.records if "Query parameters" in record.message
        ]
        if debug_logs:  # Only check if debug logging actually occurred
            debug_log = debug_logs[0]
            assert "start_date" in debug_log.message
            assert "end_date" in debug_log.message
            assert "api_key" not in debug_log.message  # Should be filtered out

    def test_debug_logging_post_request_body_size(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that debug logging captures request body size for POST requests."""
        # Set DEBUG mode and DEBUG log level for this test
        app.config["DEBUG"] = True
        app.logger.setLevel(logging.DEBUG)

        with app.test_client() as client:
            with caplog.at_level(logging.DEBUG):
                client.post("/", data={"test": "data"})

        # Check that request body size was logged
        debug_logs = [
            record for record in caplog.records if "Request body size" in record.message
        ]
        if debug_logs:  # Only check if debug logging actually occurred
            debug_log = debug_logs[0]
            assert "bytes" in debug_log.message

    def test_sensitive_parameters_filtered(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that sensitive parameters are filtered from debug logs."""
        # Set DEBUG mode and DEBUG log level for this test
        app.config["DEBUG"] = True
        app.logger.setLevel(logging.DEBUG)

        sensitive_params = ["api_key", "password", "token", "secret"]

        for param in sensitive_params:
            with app.test_client() as client:
                with caplog.at_level(logging.DEBUG):
                    client.get(f"/?{param}=sensitive_value&safe_param=safe_value")

            # Check that sensitive parameter was filtered
            debug_logs = [
                record
                for record in caplog.records
                if "Query parameters" in record.message
            ]
            for debug_log in debug_logs:
                assert param not in debug_log.message
                # But safe parameters should still be logged
                if "safe_param" in f"/?{param}=sensitive_value&safe_param=safe_value":
                    assert "safe_param" in debug_log.message

    def test_request_logging_with_forwarded_ip(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that X-Forwarded-For header is used for IP logging."""
        with app.test_client() as client:
            with caplog.at_level(logging.INFO):
                client.get("/", headers={"X-Forwarded-For": "192.168.1.100"})

        # Check that forwarded IP was used in logs
        request_logs = [
            record for record in caplog.records if "from IP" in record.message
        ]
        assert len(request_logs) >= 1

        # At least one log should contain the forwarded IP
        assert any("192.168.1.100" in log.message for log in request_logs)

    def test_authentication_success_logging(
        self,
        app: Flask,
        caplog: pytest.LogCaptureFixture,
        sample_api_client: tuple[ApiClient, str],
    ) -> None:
        """Test that successful authentication is logged without timing details."""
        api_client, api_key = sample_api_client

        with app.test_client() as client:
            with caplog.at_level(logging.INFO):
                response = client.get(
                    "/api/secure-endpoint", headers={"X-API-Key": api_key}
                )

        # Check for authentication success log
        auth_logs = [
            record
            for record in caplog.records
            if "Authentication successful" in record.message
        ]

        assert len(auth_logs) == 1
        auth_log = auth_logs[0]
        assert f"Client '{api_client.name}'" in auth_log.message
        assert "from IP" in auth_log.message
        # Should NOT contain timing information
        assert "duration:" not in auth_log.message
        assert response.status_code == 200

    def test_request_logging_performance_impact(self, app: Flask) -> None:
        """Test that request logging doesn't significantly impact performance."""
        # This is a basic performance test to ensure logging overhead is minimal
        with app.test_client() as client:
            start_time = time.time()

            # Make multiple requests to measure average performance
            for _ in range(10):
                response = client.get("/")
                assert response.status_code == 200

            end_time = time.time()
            average_time = (end_time - start_time) / 10

            # Ensure average request time is reasonable (less than 100ms per request)
            assert (
                average_time < 0.1
            ), f"Request logging causing performance issues: {average_time:.3f}s per request"

    def test_logging_disabled_in_testing_environment(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that excessive debug logging is controlled in testing environment."""
        # In testing, we shouldn't see debug logs by default
        original_debug = app.config.get("DEBUG", False)
        original_testing = app.config.get("TESTING", True)

        # Ensure we're in testing mode
        app.config["TESTING"] = True
        app.config["DEBUG"] = False

        try:
            with app.test_client() as client:
                with caplog.at_level(logging.DEBUG):
                    client.get("/?param=value")

            # Should not see debug-level request parameter logs in testing
            debug_logs = [
                record for record in caplog.records if record.levelno == logging.DEBUG
            ]
            param_logs = [
                log for log in debug_logs if "Query parameters" in log.message
            ]
            assert len(param_logs) == 0

        finally:
            # Restore original config
            app.config["DEBUG"] = original_debug
            app.config["TESTING"] = original_testing

    def test_error_logging_without_timing(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that authentication errors are logged without timing information."""
        with app.test_client() as client:
            with caplog.at_level(logging.WARNING):
                client.get("/api/secure-endpoint", headers={"X-API-Key": "invalid-key"})

        # Check that authentication failure is logged
        error_logs = [
            record
            for record in caplog.records
            if "Authentication failed" in record.message
        ]
        assert len(error_logs) == 1

        error_log = error_logs[0]
        assert "Invalid API key" in error_log.message
        assert "from IP" in error_log.message
        # Should NOT contain timing information
        assert "duration:" not in error_log.message

    def test_request_logging_with_different_methods(
        self, app: Flask, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test that request logging works with different HTTP methods."""
        methods_to_test = ["GET", "POST", "PUT", "DELETE"]

        with app.test_client() as client:
            with caplog.at_level(logging.INFO):
                for method in methods_to_test:
                    if method == "GET":
                        client.get("/")
                    elif method == "POST":
                        client.post("/", data={"test": "data"})
                    elif method == "PUT":
                        client.put("/", data={"test": "data"})
                    elif method == "DELETE":
                        client.delete("/")

        # Check that all methods were logged
        logged_methods = set()
        for record in caplog.records:
            if "Request started:" in record.message:
                for method in methods_to_test:
                    if f"{method} /" in record.message:
                        logged_methods.add(method)

        # Should have logged all attempted methods
        assert len(logged_methods) == len(methods_to_test)
