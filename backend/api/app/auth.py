"""Authentication utilities for the Flask application.

This module provides decorators and utilities for API key authentication.
"""

import logging
from datetime import datetime
from functools import wraps
from typing import Callable, Tuple, TypeVar, Union

from flask import Response, g, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models import ApiClient

# Type variable for the decorated function
F = TypeVar("F", bound=Callable[..., Union[Response, Tuple[Response, int], str]])

# Set up logger for authentication events
logger = logging.getLogger(__name__)


def require_api_key(f: F) -> F:
    """Require API key for routes with enhanced error handling and logging.

    This decorator validates API keys using secure comparison methods,
    logs authentication attempts, and updates usage statistics.

    Args:
        f: The view function to decorate.

    Returns:
        The decorated function.

    Raises:
        Returns 401 for missing, invalid, or inactive API keys.
        Returns 500 for database errors during authentication.

    """

    @wraps(f)
    def decorated_function(*args: object, **kwargs: object) -> Tuple[Response, int]:
        # Get remote IP for logging
        remote_ip = request.environ.get("HTTP_X_FORWARDED_FOR", request.remote_addr)

        # Check for API key in header
        api_key_header = request.headers.get("X-API-Key")
        if not api_key_header:
            logger.warning(
                "Authentication failed: Missing API key header from IP %s", remote_ip
            )
            return (
                jsonify(
                    {"error": "Authentication failed", "message": "API key is required"}
                ),
                401,
            )

        # Validate key format: <name>.<secret_key>
        if "." not in api_key_header:
            logger.warning(
                "Authentication failed: Invalid API key format from IP %s", remote_ip
            )
            return (
                jsonify(
                    {
                        "error": "Authentication failed",
                        "message": "Invalid API key format",
                    }
                ),
                401,
            )

        client_name, secret_key = api_key_header.split(".", 1)
        if not client_name or not secret_key:
            logger.warning(
                "Authentication failed: Malformed API key from IP %s", remote_ip
            )
            return (
                jsonify(
                    {
                        "error": "Authentication failed",
                        "message": "Malformed API key",
                    }
                ),
                401,
            )

        try:
            # Find the client by name (public identifier)
            client = ApiClient.query.filter_by(name=client_name, is_active=True).first()

            # Securely check the secret key
            if not client or not client.check_api_key(secret_key):
                logger.warning(
                    "Authentication failed: Invalid API key for client '%s' from IP %s",
                    client_name,
                    remote_ip,
                )
                return (
                    jsonify(
                        {
                            "error": "Authentication failed",
                            "message": "Invalid or inactive API key",
                        }
                    ),
                    401,
                )

            # Attach client to request context
            g.api_client = client

            # Update usage statistics
            try:
                client.last_used_at = datetime.utcnow()
                client.use_count += 1
                db.session.commit()

                logger.info(
                    "Authentication successful: Client '%s' from IP %s",
                    client.name,
                    remote_ip,
                )
            except SQLAlchemyError as e:
                # Log the error but don't fail the request
                logger.error(
                    "Failed to update usage statistics for client '%s': %s",
                    client.name,
                    str(e),
                )
                db.session.rollback()

            return f(*args, **kwargs)

        except SQLAlchemyError as e:
            logger.error(
                "Database error during authentication from IP %s: %s", remote_ip, str(e)
            )
            db.session.rollback()
            return (
                jsonify(
                    {
                        "error": "Authentication service unavailable",
                        "message": "Please try again later",
                    }
                ),
                500,
            )
        except Exception as e:
            logger.error(
                "Unexpected error during authentication from IP %s: %s",
                remote_ip,
                str(e),
            )
            return (
                jsonify(
                    {
                        "error": "Authentication service error",
                        "message": "Please try again later",
                    }
                ),
                500,
            )

    return decorated_function
