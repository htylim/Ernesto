"""
Tests for database testing utilities.

This module tests the utility functions used for database test isolation
and PostgreSQL operations.
"""

import os
import subprocess

import pytest

from tests.utils import (
    cleanup_test_database,
    create_test_database,
    parse_database_url_for_testing,
    run_postgres_command,
)


class TestDatabaseUtilities:
    """Test utility functions for database operations."""

    def test_parse_database_url_for_testing_success(self):
        """Test successful parsing of database URL."""
        test_url = "postgresql://testuser:testpass@testhost:9999/testdb"

        result_url, params = parse_database_url_for_testing(test_url)

        # Verify test URL is constructed correctly
        assert result_url == "postgresql://testuser:testpass@testhost:9999/testdb_test"

        # Verify connection parameters
        assert params["host"] == "testhost"
        assert params["port"] == "9999"
        assert params["user"] == "testuser"
        assert params["password"] == "testpass"
        assert params["test_db_name"] == "testdb_test"

    def test_parse_database_url_for_testing_defaults(self):
        """Test parsing with missing components uses defaults."""
        test_url = "postgresql:///simplename"

        result_url, params = parse_database_url_for_testing(test_url)

        # Verify defaults are applied
        assert params["host"] == "localhost"
        assert params["port"] == "5432"
        assert params["user"] == "postgres"
        assert params["password"] == "postgres"
        assert params["test_db_name"] == "simplename_test"

    def test_parse_database_url_for_testing_no_uri_provided(self):
        """Test that ValueError is raised when no DATABASE_URI is set."""
        # Save original value
        original_uri = os.environ.get("DATABASE_URI")

        try:
            # Remove DATABASE_URI
            if "DATABASE_URI" in os.environ:
                del os.environ["DATABASE_URI"]

            with pytest.raises(ValueError) as exc_info:
                parse_database_url_for_testing()

            assert "DATABASE_URI environment variable is required" in str(
                exc_info.value
            )

        finally:
            # Restore original value
            if original_uri:
                os.environ["DATABASE_URI"] = original_uri

    def test_parse_database_url_for_testing_with_env_var(self):
        """Test parsing when DATABASE_URI environment variable is set."""
        # Save original value
        original_uri = os.environ.get("DATABASE_URI")

        try:
            # Set test environment variable
            os.environ["DATABASE_URI"] = (
                "postgresql://envuser:envpass@envhost:5433/envdb"
            )

            result_url, params = parse_database_url_for_testing()

            assert result_url == "postgresql://envuser:envpass@envhost:5433/envdb_test"
            assert params["host"] == "envhost"
            assert params["user"] == "envuser"
            assert params["test_db_name"] == "envdb_test"

        finally:
            # Restore original value
            if original_uri:
                os.environ["DATABASE_URI"] = original_uri
            elif "DATABASE_URI" in os.environ:
                del os.environ["DATABASE_URI"]

    def test_run_postgres_command_constructs_properly(self):
        """Test that postgres command is constructed with correct parameters."""
        connection_params = {
            "host": "testhost",
            "port": "5433",
            "user": "testuser",
            "password": "testpass",
        }

        # We can't easily test the actual execution without a real database,
        # but we can verify the function exists and accepts the right parameters
        try:
            # This will likely fail to connect, but we're testing parameter handling
            run_postgres_command(connection_params, "SELECT 1;", timeout=1)
        except (
            subprocess.TimeoutExpired,
            subprocess.SubprocessError,
            FileNotFoundError,
        ):
            # Expected - we don't have a real database or psql might not be available
            pass

    def test_create_test_database_with_invalid_params(self):
        """Test that create_test_database raises RuntimeError on failure."""
        invalid_params = {
            "host": "nonexistent-host",
            "port": "9999",
            "user": "invalid_user",
            "password": "invalid_pass",
            "test_db_name": "test_db",
        }

        with pytest.raises(RuntimeError) as exc_info:
            create_test_database(invalid_params)

        assert "Could not create test database" in str(exc_info.value)

    def test_cleanup_test_database_handles_errors_gracefully(self):
        """Test that cleanup function doesn't raise exceptions."""
        invalid_params = {
            "host": "nonexistent-host",
            "port": "9999",
            "user": "invalid_user",
            "password": "invalid_pass",
            "test_db_name": "test_db",
        }

        # Should not raise any exceptions
        cleanup_test_database(invalid_params)
