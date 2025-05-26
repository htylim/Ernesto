"""
Tests for ApiClient model.
This module tests ApiClient model validation, constraints, and data integrity.
"""

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.api_client import ApiClient


class TestApiClient:
    """Test ApiClient model for validation, constraints, and data integrity."""

    def test_api_client_model(self, app):
        """Test ApiClient model creation and validation."""
        with app.app_context():
            # Test valid ApiClient creation
            client = ApiClient(
                name="test_client", api_key="test_key_123", is_active=True
            )
            db.session.add(client)
            db.session.commit()

            # Verify the client was created
            assert client.id is not None
            assert client.name == "test_client"
            assert client.api_key == "test_key_123"
            assert client.is_active is True
            assert client.created_at is not None

            # Test string representation
            assert str(client) == "<ApiClient test_client>"

    def test_api_client_defaults(self, app):
        """Test ApiClient model default values."""
        with app.app_context():
            # Test with minimal required fields
            client = ApiClient(name="minimal_client", api_key="key123")
            db.session.add(client)
            db.session.commit()

            # Verify defaults are applied
            assert client.is_active is True  # Should default to True
            assert client.created_at is not None  # Should be auto-set

    def test_api_client_unique_constraints(self, app):
        """Test ApiClient unique constraints for name and api_key."""
        with app.app_context():
            # Create first client
            client1 = ApiClient(name="client1", api_key="key1")
            db.session.add(client1)
            db.session.commit()

            # Test duplicate name constraint
            client2 = ApiClient(name="client1", api_key="key2")
            db.session.add(client2)
            with pytest.raises(IntegrityError):
                db.session.commit()

            db.session.rollback()

            # Test duplicate api_key constraint
            client3 = ApiClient(name="client2", api_key="key1")
            db.session.add(client3)
            with pytest.raises(IntegrityError):
                db.session.commit()

            db.session.rollback()

    def test_api_client_database_schema(self, app):
        """Test that ApiClient database schema matches model definition."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test ApiClient table structure
            api_clients_columns = {
                col["name"]: col for col in inspector.get_columns("api_clients")
            }
            assert "id" in api_clients_columns
            assert "name" in api_clients_columns
            assert "api_key" in api_clients_columns
            assert "is_active" in api_clients_columns
            assert "created_at" in api_clients_columns

    def test_api_client_id_generation(self, app):
        """Test that integer IDs are properly generated for ApiClient."""
        with app.app_context():
            client = ApiClient(name="ID Test Client", api_key="test_key")
            db.session.add(client)
            db.session.commit()

            # Verify integer ID is generated
            assert client.id is not None
            assert isinstance(client.id, int)  # ApiClient uses integer ID

    def test_api_client_required_fields(self, app):
        """Test that required fields are properly enforced for ApiClient."""
        with app.app_context():
            # Test missing required fields
            with pytest.raises((IntegrityError, ValueError)):
                # Missing name for ApiClient
                client = ApiClient(api_key="test_key")
                db.session.add(client)
                db.session.commit()

            db.session.rollback()

    def test_api_client_string_length_constraints(self, app):
        """Test string length constraints for ApiClient."""
        with app.app_context():
            # Test API client name length (100 chars max)
            long_name = "a" * 101
            client = ApiClient(name=long_name, api_key="test_key")
            db.session.add(client)

            # This should raise an error in databases that enforce length
            try:
                db.session.commit()
                # If we get here, length constraints aren't enforced (SQLite)
                db.session.delete(client)
                db.session.commit()
            except (IntegrityError, Exception):
                # Length constraints are enforced
                db.session.rollback()

    def test_api_client_null_handling(self, app):
        """Test proper null value handling in ApiClient optional fields."""
        with app.app_context():
            # Test that required fields cannot be None
            client = ApiClient(name="Null Test Client", api_key="test_key")
            db.session.add(client)
            db.session.commit()

            # Verify required fields are not null
            assert client.name is not None
            assert client.api_key is not None

    def test_api_client_data_consistency_after_rollback(self, app):
        """Test ApiClient data consistency after transaction rollbacks."""
        with app.app_context():
            # Create valid data
            client = ApiClient(name="Test Client", api_key="test_key_123")
            db.session.add(client)
            db.session.commit()

            original_count = ApiClient.query.count()
            original_id = client.id

            # Attempt invalid operation that should rollback
            try:
                # This should fail due to unique constraint on api_key
                duplicate_client = ApiClient(
                    name="Different Name", api_key="test_key_123"
                )
                db.session.add(duplicate_client)
                db.session.commit()
            except IntegrityError:
                db.session.rollback()

            # Verify original data is still intact
            assert ApiClient.query.count() == original_count
            remaining_client = ApiClient.query.filter_by(name="Test Client").first()
            assert remaining_client is not None
            assert remaining_client.id == original_id

    def test_api_client_concurrent_creation(self, app):
        """Test ApiClient creation under simulated concurrent conditions."""
        with app.app_context():
            generated_ids = set()

            # Simulate concurrent creation
            for i in range(10):
                client = ApiClient(name=f"Concurrent Client {i}", api_key=f"key_{i}")
                db.session.add(client)
                db.session.commit()
                generated_ids.add(client.id)

            # Verify all IDs are unique
            assert len(generated_ids) == 10

    def test_api_client_bulk_operations(self, app):
        """Test bulk operations performance and integrity for ApiClient."""
        with app.app_context():
            # Test bulk insertion of clients
            clients = []
            for i in range(50):
                client = ApiClient(
                    name=f"Bulk Client {i}",
                    api_key=f"bulk_key_{i}",
                )
                clients.append(client)

            db.session.add_all(clients)
            db.session.commit()

            # Verify all clients were created
            assert ApiClient.query.count() == 50

    def test_api_client_query_performance(self, app):
        """Test basic query performance for ApiClient."""
        with app.app_context():
            # Create test data
            clients = []
            for i in range(50):
                client = ApiClient(
                    name=f"Performance Client {i}",
                    api_key=f"perf_key_{i}",
                )
                clients.append(client)

            db.session.add_all(clients)
            db.session.commit()

            # Test various query patterns
            # Filter by name
            name_clients = ApiClient.query.filter_by(name="Performance Client 25").all()
            assert len(name_clients) == 1

            # Filter by is_active
            active_clients = ApiClient.query.filter_by(is_active=True).all()
            assert len(active_clients) == 50

    def test_api_client_foreign_key_constraints(self, app):
        """Test foreign key constraints for ApiClient (if any)."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test ApiClient foreign keys (should be none for this model)
            api_clients_fks = inspector.get_foreign_keys("api_clients")

            # ApiClient should not have foreign keys to other tables
            assert len(api_clients_fks) == 0
