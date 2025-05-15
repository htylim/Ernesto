import os
import secrets
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configure the SQLAlchemy connection to PostgreSQL
# The format is: postgresql://username:password@host:port/database
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URI", "postgresql://postgres:postgres@db:5432/ernesto"
)

# Disable modification tracking to improve performance
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = (
    os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", "False").lower() == "true"
)

# Initialize SQLAlchemy with the Flask app
db = SQLAlchemy(app)


class ApiClient(db.Model):
    """Model for storing API clients and their access tokens."""

    __tablename__ = "api_clients"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    api_key = db.Column(db.String(64), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    @staticmethod
    def generate_api_key():
        """Generate a secure random API key."""
        return secrets.token_hex(32)  # 64 character hex string

    def __repr__(self):
        return f"<ApiClient {self.name}>"


def require_api_key(f):
    """Decorator to require API key for routes."""

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


@app.route("/")
def hello_world():
    """Basic test endpoint."""
    return "<p>Hello from the API!</p>"


@app.route("/api/secure-endpoint")
@require_api_key
def secure_endpoint():
    """Example of a protected endpoint that requires API key."""
    return jsonify({"message": "You have access to this secure endpoint"})


# Create the database and tables
with app.app_context():
    db.create_all()
