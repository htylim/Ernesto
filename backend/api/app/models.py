import secrets
from . import db


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