from functools import wraps
from flask import jsonify, request
from .models import ApiClient


def require_api_key(f):
    """Decorator to require API key for routes.
    
    Args:
        f (function): The view function to decorate.
        
    Returns:
        function: The decorated function.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return jsonify({"error": "API key is missing"}), 401

        client = ApiClient.query.filter_by(api_key=api_key, is_active=True).first()

        if not client:
            return jsonify({"error": "Invalid or inactive API key"}), 401

        return f(*args, **kwargs)

    return decorated_function 