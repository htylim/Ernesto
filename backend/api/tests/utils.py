"""
Database testing utilities for test isolation and PostgreSQL operations.

This module provides utilities for creating isolated test databases and managing
database connections during testing, ensuring production data safety.
"""

import os
import subprocess
from urllib.parse import urlparse, urlunparse


def parse_database_url_for_testing(database_uri=None):
    """Parse database URL and create test database configuration.

    Args:
        database_uri: Database URI to parse. If None, gets from DATABASE_URI env var.

    Returns:
        tuple: (test_db_url, connection_params)

    Raises:
        ValueError: If DATABASE_URI is not set and no database_uri provided.
    """
    if database_uri is None:
        database_uri = os.getenv("DATABASE_URI")
        if not database_uri:
            raise ValueError(
                "DATABASE_URI environment variable is required for migration tests. "
                "Please set it to your PostgreSQL connection string."
            )

    parsed = urlparse(database_uri)
    test_db_name = f"{parsed.path[1:]}_test"  # Remove leading '/' and add '_test'

    # Reconstruct URL with test database name
    test_parsed = parsed._replace(path=f"/{test_db_name}")
    test_db_url = urlunparse(test_parsed)

    connection_params = {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port) if parsed.port else "5432",
        "user": parsed.username or "postgres",
        "password": parsed.password or "postgres",
        "test_db_name": test_db_name,
    }

    return test_db_url, connection_params


def run_postgres_command(connection_params, sql_command, timeout=30):
    """Execute a PostgreSQL command using psql.

    Args:
        connection_params: Dictionary with host, port, user, password
        sql_command: SQL command to execute
        timeout: Command timeout in seconds

    Returns:
        subprocess.CompletedProcess: Result of the command execution
    """
    env = os.environ.copy()
    env["PGPASSWORD"] = connection_params["password"]

    return subprocess.run(
        [
            "psql",
            "-h",
            connection_params["host"],
            "-p",
            connection_params["port"],
            "-U",
            connection_params["user"],
            "-c",
            sql_command,
        ],
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def create_test_database(connection_params):
    """Create a test database, dropping it first if it exists.

    Args:
        connection_params: Dictionary with database connection parameters

    Returns:
        bool: True if database was created successfully

    Raises:
        RuntimeError: If database creation fails
    """
    test_db_name = connection_params["test_db_name"]

    # Drop existing test database if it exists
    run_postgres_command(connection_params, f"DROP DATABASE IF EXISTS {test_db_name};")

    # Create new test database
    result = run_postgres_command(connection_params, f"CREATE DATABASE {test_db_name};")

    if result.returncode != 0:
        raise RuntimeError(f"Could not create test database: {result.stderr}")

    return True


def cleanup_test_database(connection_params):
    """Clean up test database by terminating connections and dropping it.

    Args:
        connection_params: Dictionary with database connection parameters
    """
    test_db_name = connection_params["test_db_name"]

    try:
        # Terminate connections to test database
        run_postgres_command(
            connection_params,
            f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{test_db_name}' AND pid <> pg_backend_pid();",
        )

        # Drop test database
        run_postgres_command(
            connection_params, f"DROP DATABASE IF EXISTS {test_db_name};"
        )
    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Best effort cleanup - don't fail the test if cleanup has issues
        pass
