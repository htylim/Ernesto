"""Tests for the ApiClient model.

This module tests ApiClient model validation, constraints, and data integrity,
including API key generation, hashing, and validation.
"""

import re
from datetime import datetime
from typing import TYPE_CHECKING

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app import ApiClient
from app.extensions import db

if TYPE_CHECKING:
    from flask import Flask


class TestApiClient:
    """Test ApiClient model for validation, constraints, and data integrity."""

    def test_api_client_model(self, app: "Flask") -> None:
        """Test ApiClient model creation and validation."""
        with app.app_context():
            api_client, api_key = ApiClient.create_with_api_key(name="test_client")
            db.session.add(api_client)
            db.session.commit()

            assert api_client.id is not None
            assert api_client.name == "test_client"
            assert api_client.hashed_api_key is not None
            assert api_client.check_api_key(api_key)
            assert not api_client.check_api_key("wrong_key")
            assert api_client.is_active is True
            assert api_client.created_at is not None
            assert api_client.last_used_at is None
            assert api_client.use_count == 0
            assert str(api_client) == "<ApiClient test_client>"

    def test_generate_api_key(self) -> None:
        """Test the API key generation method."""
        key1 = ApiClient.generate_api_key()
        key2 = ApiClient.generate_api_key()
        assert isinstance(key1, str)
        assert len(key1) > 20
        assert key1 != key2

        key_32 = ApiClient.generate_api_key(length=32)
        # The length of a url-safe base64-encoded string from n bytes
        # is about 4*n/3.
        assert len(key_32) >= 4 * 32 / 3
        # Check for URL-safe characters
        assert re.match(r"^[A-Za-z0-9_-]+$", key_32)

    def test_set_and_check_api_key(self) -> None:
        """Test setting and checking the API key."""
        api_client = ApiClient(name="key_test_client")
        api_key = ApiClient.generate_api_key()

        api_client.set_api_key(api_key)
        assert api_client.hashed_api_key is not None
        assert api_client.hashed_api_key != api_key
        assert api_client.check_api_key(api_key) is True
        assert api_client.check_api_key("not_the_key") is False

    def test_create_with_api_key(self) -> None:
        """Test the class method for creating a client with an API key."""
        api_client, api_key = ApiClient.create_with_api_key(name="factory_client")
        assert isinstance(api_client, ApiClient)
        assert isinstance(api_key, str)
        assert api_client.name == "factory_client"
        assert api_client.check_api_key(api_key)

    def test_api_client_defaults(self, app: "Flask") -> None:
        """Test ApiClient model default values."""
        with app.app_context():
            api_client, _ = ApiClient.create_with_api_key(name="minimal_client")
            db.session.add(api_client)
            db.session.commit()

            assert api_client.is_active is True
            assert api_client.created_at is not None
            assert api_client.use_count == 0
            assert api_client.last_used_at is None

    def test_api_client_unique_constraints(self, app: "Flask") -> None:
        """Test ApiClient unique constraint for name."""
        with app.app_context():
            client1, _ = ApiClient.create_with_api_key(name="client1")
            db.session.add(client1)
            db.session.commit()

            client2, _ = ApiClient.create_with_api_key(name="client1")
            db.session.add(client2)
            with pytest.raises(IntegrityError):
                db.session.commit()
            db.session.rollback()

    def test_api_client_database_schema(self, app: "Flask") -> None:
        """Test that ApiClient database schema matches model definition."""
        with app.app_context():
            inspector = inspect(db.engine)
            columns = {col["name"]: col for col in inspector.get_columns("api_clients")}
            assert "id" in columns
            assert "name" in columns
            assert "hashed_api_key" in columns
            assert "is_active" in columns
            assert "created_at" in columns
            assert "last_used_at" in columns
            assert "use_count" in columns
            assert columns["hashed_api_key"]["type"].length == 128

    def test_api_client_id_generation(self, app: "Flask") -> None:
        """Test that integer IDs are properly generated for ApiClient."""
        with app.app_context():
            client, _ = ApiClient.create_with_api_key(name="ID Test Client")
            db.session.add(client)
            db.session.commit()

            assert client.id is not None
            assert isinstance(client.id, int)

    def test_api_client_required_fields(self, app: "Flask") -> None:
        """Test that required fields are properly enforced for ApiClient."""
        with app.app_context():
            # Test missing name
            client_no_name = ApiClient(hashed_api_key="some_key")
            db.session.add(client_no_name)
            with pytest.raises(IntegrityError):
                db.session.commit()
            db.session.rollback()

            # Test missing hashed_api_key
            client_no_key = ApiClient(name="no_key_client")
            db.session.add(client_no_key)
            with pytest.raises(IntegrityError):
                db.session.commit()
            db.session.rollback()

    def test_api_client_string_length_constraints(self, app: "Flask") -> None:
        """Test string length constraints for ApiClient."""
        with app.app_context():
            long_name = "a" * 101
            client, _ = ApiClient.create_with_api_key(name=long_name)
            db.session.add(client)

            # This should raise an error in databases that enforce length
            try:
                db.session.commit()
                # If we get here, length constraints aren't enforced (e.g., SQLite)
                # To make the test useful, we should at least verify the object state
                # and then clean up.
                retrieved = db.session.get(ApiClient, client.id)
                assert len(retrieved.name) == 101
                db.session.delete(client)
                db.session.commit()
            except IntegrityError:
                # This is the expected behavior for databases like PostgreSQL
                db.session.rollback()
                assert (
                    db.session.query(ApiClient).filter_by(name=long_name).first()
                    is None
                )

    def test_api_client_null_handling(self, app: "Flask") -> None:
        """Test proper null value handling in ApiClient optional fields."""
        with app.app_context():
            client, _ = ApiClient.create_with_api_key(name="Null Test Client")
            db.session.add(client)
            db.session.commit()

            assert client.last_used_at is None

            # Update to set a value and then back to null
            client.last_used_at = datetime.utcnow()
            db.session.commit()
            assert client.last_used_at is not None

            client.last_used_at = None
            db.session.commit()
            assert client.last_used_at is None

    def test_api_client_data_consistency_after_rollback(self, app: "Flask") -> None:
        """Test ApiClient data consistency after transaction rollbacks."""
        with app.app_context():
            client, _ = ApiClient.create_with_api_key(name="Test Client")
            db.session.add(client)
            db.session.commit()

            original_count = db.session.query(ApiClient).count()
            original_id = client.id

            duplicate_client, _ = ApiClient.create_with_api_key(name="Test Client")
            db.session.add(duplicate_client)
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()

            assert db.session.query(ApiClient).count() == original_count
            remaining_client = (
                db.session.query(ApiClient).filter_by(name="Test Client").first()
            )
            assert remaining_client is not None
            assert remaining_client.id == original_id

    @pytest.mark.slow
    def test_api_client_concurrent_creation(self, app: "Flask") -> None:
        """Test ApiClient creation under simulated concurrent conditions."""
        with app.app_context():
            generated_ids = set()
            for i in range(10):
                client, _ = ApiClient.create_with_api_key(name=f"Concurrent Client {i}")
                db.session.add(client)
                db.session.commit()
                generated_ids.add(client.id)

            assert len(generated_ids) == 10

    @pytest.mark.slow
    def test_api_client_bulk_operations(self, app: "Flask") -> None:
        """Test bulk operations performance and integrity for ApiClient."""
        with app.app_context():
            clients = []
            for i in range(50):
                client, _ = ApiClient.create_with_api_key(name=f"Bulk Client {i}")
                clients.append(client)

            db.session.add_all(clients)
            db.session.commit()

            assert db.session.query(ApiClient).count() >= 50

    @pytest.mark.slow
    def test_api_client_query_performance(self, app: "Flask") -> None:
        """Test basic query performance for ApiClient."""
        with app.app_context():
            # Create test data
            clients = []
            for i in range(50):
                client, _ = ApiClient.create_with_api_key(
                    name=f"Performance Client {i}"
                )
                clients.append(client)
            db.session.add_all(clients)
            db.session.commit()

            # Filter by name
            name_clients = (
                db.session.query(ApiClient)
                .filter_by(name="Performance Client 25")
                .all()
            )
            assert len(name_clients) == 1

            # Filter by is_active
            active_clients = db.session.query(ApiClient).filter_by(is_active=True).all()
            assert len(active_clients) >= 50

    def test_api_client_foreign_key_constraints(self, app: "Flask") -> None:
        """Test foreign key constraints for ApiClient (if any)."""
        with app.app_context():
            inspector = inspect(db.engine)
            fks = inspector.get_foreign_keys("api_clients")
            assert len(fks) == 0
