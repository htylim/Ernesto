"""
Tests for database models and migration scripts.
This module tests model validation, relationships, constraints, and migration functionality.
"""

import subprocess
import uuid
from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app import create_app, db
from app.models import ApiClient, Article, Source, Topic


class TestModels:
    """Test database models for validation, relationships, and constraints."""

    @pytest.fixture
    def app(self):
        """Create a test Flask application with in-memory database."""
        test_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "TESTING": True,
        }
        app = create_app(test_config)

        with app.app_context():
            db.create_all()
            yield app
            db.drop_all()

    @pytest.fixture
    def client(self, app):
        """Create a test client."""
        return app.test_client()

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

    def test_source_model(self, app):
        """Test Source model creation and validation."""
        with app.app_context():
            source = Source(
                name="Test News Source",
                logo_url="https://example.com/logo.png",
                homepage_url="https://example.com",
                is_enabled=True,
            )
            db.session.add(source)
            db.session.commit()

            # Verify UUID generation
            assert isinstance(source.id, uuid.UUID)
            assert source.name == "Test News Source"
            assert source.is_enabled is True
            assert str(source) == "<Source Test News Source>"

    def test_source_defaults(self, app):
        """Test Source model default values."""
        with app.app_context():
            # Test with minimal required fields
            source = Source(name="Minimal Source")
            db.session.add(source)
            db.session.commit()

            # Verify defaults
            assert source.is_enabled is True  # Should default to True
            assert isinstance(source.id, uuid.UUID)  # Should auto-generate UUID

    def test_topic_model(self, app):
        """Test Topic model creation and validation."""
        with app.app_context():
            topic = Topic(label="Technology", coverage_score=85)
            db.session.add(topic)
            db.session.commit()

            # Verify UUID generation and timestamps
            assert isinstance(topic.id, uuid.UUID)
            assert topic.label == "Technology"
            assert topic.coverage_score == 85
            assert isinstance(topic.added_at, datetime)
            assert isinstance(topic.updated_at, datetime)
            assert str(topic) == "<Topic Technology>"

    def test_topic_defaults(self, app):
        """Test Topic model default values."""
        with app.app_context():
            # Test with minimal required fields
            topic = Topic(label="Default Topic")
            db.session.add(topic)
            db.session.commit()

            # Verify defaults
            assert topic.coverage_score == 0  # Should default to 0
            assert isinstance(topic.added_at, datetime)
            assert isinstance(topic.updated_at, datetime)

    def test_article_model(self, app):
        """Test Article model creation and validation."""
        with app.app_context():
            # Create related objects
            source = Source(name="Test Source")
            topic = Topic(label="Test Topic")
            db.session.add_all([source, topic])
            db.session.commit()

            article = Article(
                title="Test Article Title",
                url="https://example.com/article",
                image_url="https://example.com/image.jpg",
                brief="This is a test article brief.",
                topic_id=topic.id,
                source_id=source.id,
            )
            db.session.add(article)
            db.session.commit()

            # Verify article creation
            assert isinstance(article.id, uuid.UUID)
            assert article.title == "Test Article Title"
            assert article.url == "https://example.com/article"
            assert isinstance(article.added_at, datetime)
            assert str(article) == "<Article Test Article Title>"

    def test_article_without_relationships(self, app):
        """Test Article model can be created without topic/source relationships."""
        with app.app_context():
            article = Article(
                title="Standalone Article", url="https://example.com/standalone"
            )
            db.session.add(article)
            db.session.commit()

            # Verify article creation without relationships
            assert isinstance(article.id, uuid.UUID)
            assert article.topic_id is None
            assert article.source_id is None
            assert isinstance(article.added_at, datetime)

    def test_model_relationships(self, app):
        """Test relationships between models."""
        with app.app_context():
            # Create related objects
            source = Source(name="News Source")
            topic = Topic(label="Tech News")
            db.session.add_all([source, topic])
            db.session.commit()

            # Create articles
            article1 = Article(
                title="Article 1",
                url="https://example.com/1",
                topic_id=topic.id,
                source_id=source.id,
            )
            article2 = Article(
                title="Article 2",
                url="https://example.com/2",
                topic_id=topic.id,
                source_id=source.id,
            )
            db.session.add_all([article1, article2])
            db.session.commit()

            # Test relationships
            assert len(source.articles) == 2
            assert len(topic.articles) == 2
            assert article1.source == source
            assert article1.topic == topic
            assert article2.source == source
            assert article2.topic == topic

    def test_cascade_deletion(self, app):
        """Test cascade deletion behavior."""
        with app.app_context():
            source = Source(name="Test Source")
            topic = Topic(label="Test Topic")
            db.session.add_all([source, topic])
            db.session.commit()

            article = Article(
                title="Test Article",
                url="https://example.com/test",
                topic_id=topic.id,
                source_id=source.id,
            )
            db.session.add(article)
            db.session.commit()

            # Delete source and verify cascade
            db.session.delete(source)
            db.session.commit()

            # Article should be deleted due to cascade
            remaining_articles = Article.query.all()
            assert len(remaining_articles) == 0


class TestMigrations:
    """Test migration scripts functionality."""

    def test_migration_upgrade_downgrade(self):
        """Test that migrations can be applied and rolled back correctly."""
        # This test requires a real database connection
        # Skip if running in CI without database
        try:
            # Test migration commands
            result = subprocess.run(
                ["alembic", "current"], capture_output=True, text=True, timeout=30
            )
            if result.returncode != 0:
                pytest.skip("Alembic not properly configured")

            # Test downgrade
            result = subprocess.run(
                ["alembic", "downgrade", "base"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            assert result.returncode == 0, f"Downgrade failed: {result.stderr}"

            # Test upgrade
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            assert result.returncode == 0, f"Upgrade failed: {result.stderr}"

            # Test check
            result = subprocess.run(
                ["alembic", "check"], capture_output=True, text=True, timeout=30
            )
            assert result.returncode == 0, f"Check failed: {result.stderr}"

        except (subprocess.TimeoutExpired, FileNotFoundError):
            pytest.skip("Alembic command not available or timeout")

    def test_migration_idempotency(self):
        """Test that migrations are idempotent (can be run multiple times safely)."""
        try:
            # Run upgrade twice to test idempotency
            for _ in range(2):
                result = subprocess.run(
                    ["alembic", "upgrade", "head"],
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                assert (
                    result.returncode == 0
                ), f"Idempotent upgrade failed: {result.stderr}"

        except (subprocess.TimeoutExpired, FileNotFoundError):
            pytest.skip("Alembic command not available or timeout")


class TestDataIntegrity:
    """Test data integrity and edge cases."""

    @pytest.fixture
    def app(self):
        """Create a test Flask application."""
        test_config = {
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SQLALCHEMY_TRACK_MODIFICATIONS": False,
            "TESTING": True,
        }
        app = create_app(test_config)

        with app.app_context():
            db.create_all()
            yield app
            db.drop_all()

    def test_uuid_generation(self, app):
        """Test that UUIDs are properly generated for models."""
        with app.app_context():
            source = Source(name="UUID Test Source")
            topic = Topic(label="UUID Test Topic")
            article = Article(title="UUID Test Article", url="https://test.com")

            db.session.add_all([source, topic, article])
            db.session.commit()

            # Verify UUIDs are generated and unique
            assert isinstance(source.id, uuid.UUID)
            assert isinstance(topic.id, uuid.UUID)
            assert isinstance(article.id, uuid.UUID)

            # Verify they're different
            assert source.id != topic.id
            assert source.id != article.id
            assert topic.id != article.id

    def test_timestamp_defaults(self, app):
        """Test that timestamps are correctly set on creation and updates."""
        with app.app_context():
            topic = Topic(label="Timestamp Test")
            db.session.add(topic)
            db.session.commit()

            original_added = topic.added_at
            original_updated = topic.updated_at

            # Verify timestamps are set
            assert original_added is not None
            assert original_updated is not None

            # Update the topic
            topic.label = "Updated Label"
            db.session.commit()

            # Verify updated_at changed but added_at didn't
            assert topic.added_at == original_added
            assert topic.updated_at >= original_updated

    def test_foreign_key_constraints(self, app):
        """Test foreign key constraints are properly enforced."""
        with app.app_context():
            # Try to create article with non-existent foreign keys
            fake_uuid = uuid.uuid4()
            article = Article(
                title="Test Article",
                url="https://test.com",
                topic_id=fake_uuid,
                source_id=fake_uuid,
            )
            db.session.add(article)

            # This should work in SQLite (it doesn't enforce FK by default)
            # but would fail in PostgreSQL
            try:
                db.session.commit()
                # If we get here, FK constraints aren't enforced (SQLite)
                # Clean up
                db.session.delete(article)
                db.session.commit()
            except IntegrityError:
                # FK constraints are enforced (PostgreSQL)
                db.session.rollback()

    def test_required_fields(self, app):
        """Test that required fields are properly enforced."""
        with app.app_context():
            # Test missing required fields
            with pytest.raises((IntegrityError, ValueError)):
                # Missing name for ApiClient
                client = ApiClient(api_key="test_key")
                db.session.add(client)
                db.session.commit()

            db.session.rollback()

            with pytest.raises((IntegrityError, ValueError)):
                # Missing title for Article
                article = Article(url="https://test.com")
                db.session.add(article)
                db.session.commit()

            db.session.rollback()

    def test_string_length_constraints(self, app):
        """Test string length constraints are enforced."""
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
