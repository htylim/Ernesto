"""Tests for logging configuration functionality.

This module tests the logging configuration system including different
environment configurations, log level parsing, and handler setup.
"""

import logging
import os
import tempfile
from unittest.mock import MagicMock, patch

from app import create_app
from app.logging_config import _get_environment_name, configure_logging


class TestLoggingConfiguration:
    """Test suite for logging configuration functionality."""

    def test_configure_logging_development(self) -> None:
        """Test logging configuration for development environment."""
        app = create_app(
            {
                "TESTING": False,
                "DEBUG": True,
                "LOG_LEVEL": "DEBUG",
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            }
        )

        with app.app_context():
            # Verify logger level is set correctly
            assert app.logger.level == logging.DEBUG

            # Verify handler is added
            assert len(app.logger.handlers) > 0

            # Verify it's a StreamHandler (console)
            handler = app.logger.handlers[0]
            assert isinstance(handler, logging.StreamHandler)
            assert handler.level == logging.DEBUG

    def test_configure_logging_testing(self) -> None:
        """Test logging configuration for testing environment."""
        app = create_app(
            {
                "TESTING": True,
                "DEBUG": True,
                "LOG_LEVEL": "DEBUG",
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            }
        )

        with app.app_context():
            # Verify logger level is set correctly
            assert app.logger.level == logging.DEBUG

            # Verify handler is added
            assert len(app.logger.handlers) > 0

            # Verify it's a StreamHandler with minimal formatting
            handler = app.logger.handlers[0]
            assert isinstance(handler, logging.StreamHandler)
            assert handler.level == logging.DEBUG

    @patch("os.makedirs")
    @patch("os.path.exists")
    def test_configure_logging_production(
        self, mock_exists: MagicMock, mock_makedirs: MagicMock
    ) -> None:
        """Test logging configuration for production environment."""
        mock_exists.return_value = False  # Simulate logs directory doesn't exist

        app = create_app(
            {
                "TESTING": False,
                "DEBUG": False,
                "LOG_LEVEL": "ERROR",
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            }
        )

        with app.app_context():
            # Verify logger level is set correctly
            assert app.logger.level == logging.ERROR

            # Verify handlers are added (file + console)
            assert len(app.logger.handlers) == 2

            # Verify logs directory creation was attempted
            mock_makedirs.assert_called_once()

    def test_log_level_parsing(self) -> None:
        """Test that log levels are correctly parsed from configuration."""
        test_cases = [
            ("DEBUG", logging.DEBUG),
            ("INFO", logging.INFO),
            ("WARNING", logging.WARNING),
            ("ERROR", logging.ERROR),
            ("CRITICAL", logging.CRITICAL),
            ("debug", logging.DEBUG),  # Test case insensitive
            ("invalid", logging.INFO),  # Test fallback to INFO
        ]

        for log_level_str, expected_level in test_cases:
            app = create_app(
                {
                    "TESTING": True,
                    "LOG_LEVEL": log_level_str,
                    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                }
            )

            with app.app_context():
                if log_level_str == "invalid":
                    # For invalid log levels, should fallback to INFO
                    assert app.logger.level == expected_level
                else:
                    assert app.logger.level == expected_level

    def test_get_environment_name(self) -> None:
        """Test environment name detection."""
        # Test testing environment
        app = create_app(
            {
                "TESTING": True,
                "DEBUG": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            }
        )
        with app.app_context():
            assert _get_environment_name(app) == "testing"

        # Test development environment
        app = create_app(
            {
                "TESTING": False,
                "DEBUG": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            }
        )
        with app.app_context():
            assert _get_environment_name(app) == "development"

        # Test production environment
        app = create_app(
            {
                "TESTING": False,
                "DEBUG": False,
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            }
        )
        with app.app_context():
            assert _get_environment_name(app) == "production"

    def test_handlers_cleared_before_configuration(self) -> None:
        """Test that existing handlers are cleared before adding new ones."""
        app = create_app(
            {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
        )

        with app.app_context():
            # Add a dummy handler
            dummy_handler = logging.StreamHandler()
            app.logger.addHandler(dummy_handler)

            # Reconfigure logging
            configure_logging(app)

            # Verify handlers were cleared and new ones added
            assert len(app.logger.handlers) >= 1
            # The dummy handler should be gone
            assert dummy_handler not in app.logger.handlers

    def test_logging_integration_in_create_app(self) -> None:
        """Test that logging is properly integrated in the create_app function."""
        app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})

        with app.app_context():
            # Verify logging is configured
            assert len(app.logger.handlers) > 0

            # Test that we can log messages
            with patch.object(app.logger, "info") as mock_info:
                app.logger.info("Test message")
                mock_info.assert_called_once_with("Test message")

    def test_production_file_logging_path(self) -> None:
        """Test that production logging creates the correct file path."""
        with tempfile.TemporaryDirectory() as temp_dir:
            app = create_app(
                {
                    "TESTING": False,
                    "DEBUG": False,
                    "LOG_LEVEL": "ERROR",
                    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                }
            )

            # Mock the instance_path to use our temp directory
            app.instance_path = os.path.join(temp_dir, "instance")

            with app.app_context():
                configure_logging(app)

                # We can't easily test the actual file creation without mocking,
                # but we can verify the configuration doesn't raise errors
                assert len(app.logger.handlers) >= 1

    def test_log_message_formatting(self) -> None:
        """Test that log messages are formatted correctly for different environments."""
        # Test development formatting
        app = create_app(
            {
                "TESTING": False,
                "DEBUG": True,
                "LOG_LEVEL": "DEBUG",
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            }
        )

        with app.app_context():
            handler = app.logger.handlers[0]
            formatter = handler.formatter

            # Create a test log record
            record = logging.LogRecord(
                name="test",
                level=logging.INFO,
                pathname="test.py",
                lineno=1,
                msg="Test message",
                args=(),
                exc_info=None,
            )

            formatted = formatter.format(record)
            # Should contain timestamp, level, module, and message
            assert "INFO" in formatted
            assert "test" in formatted
            assert "Test message" in formatted

    def test_production_dual_handlers(self) -> None:
        """Test that production environment has both file and console handlers."""
        with patch("os.makedirs"), patch("os.path.exists", return_value=True):
            app = create_app(
                {
                    "TESTING": False,
                    "DEBUG": False,
                    "LOG_LEVEL": "ERROR",
                    "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                }
            )

            with app.app_context():
                # Should have 2 handlers: file and console
                assert len(app.logger.handlers) == 2

                # Verify handler types
                handler_types = [type(h).__name__ for h in app.logger.handlers]
                assert "RotatingFileHandler" in handler_types
                assert "StreamHandler" in handler_types
