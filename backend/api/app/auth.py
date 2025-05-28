"""Authentication utilities for the Flask application.

This module provides decorators and utilities for API key authentication.
"""

from functools import wraps
from typing import Callable, Tuple, TypeVar, Union

from flask import Response, jsonify, request

from app.models import ApiClient

# Type variable for the decorated function
F = TypeVar("F", bound=Callable[..., Union[Response, Tuple[Response, int], str]])


def require_api_key(f: F) -> F:
    """Require API key for routes.

    Args:
        f: The view function to decorate.

    Returns:
        The decorated function.

    """

    @wraps(f)
    def decorated_function(
        *args: object, **kwargs: object
    ) -> Union[Response, Tuple[Response, int]]:
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return jsonify({"error": "API key is missing"}), 401

        client = ApiClient.query.filter_by(api_key=api_key, is_active=True).first()

        if not client:
            return jsonify({"error": "Invalid or inactive API key"}), 401

        return f(*args, **kwargs)  # type: ignore[return-value]

    return decorated_function  # type: ignore[return-value]
