"""Authentication utilities for the Flask application.

This module provides decorators and utilities for API key authentication.
"""

import logging
from datetime import datetime
from functools import wraps
from typing import Callable, Tuple, TypeVar, Union

from flask import Response, jsonify, request
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
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            logger.warning(
                "Authentication failed: Missing API key from IP %s", remote_ip
            )
            return (
                jsonify(
                    {"error": "Authentication failed", "message": "API key is required"}
                ),
                401,
            )

        try:
            # Get all active clients (we need to check the hashed key for each)
            active_clients = ApiClient.query.filter_by(is_active=True).all()

            # Find matching client using secure comparison
            authenticated_client = None
            for client in active_clients:
                if client.check_api_key(api_key):
                    authenticated_client = client
                    break

            if not authenticated_client:
                logger.warning(
                    "Authentication failed: Invalid API key from IP %s", remote_ip
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

            # Update usage statistics
            try:
                authenticated_client.last_used_at = datetime.utcnow()
                authenticated_client.use_count += 1
                db.session.commit()

                logger.info(
                    "Authentication successful: Client '%s' from IP %s",
                    authenticated_client.name,
                    remote_ip,
                )
            except SQLAlchemyError as e:
                # Log the error but don't fail the request
                logger.error(
                    "Failed to update usage statistics for client '%s': %s",
                    authenticated_client.name,
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
