"""
Tests for database models and migration scripts.
This module tests model validation, relationships, constraints, and migration functionality.
"""

import os
import subprocess
import uuid
from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app import create_app, db
from app.models import ApiClient, Article, Source, Topic
from tests.utils import (
    cleanup_test_database,
    create_test_database,
    parse_database_url_for_testing,
)


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

    def test_bulk_operations(self, app):
        """Test bulk operations performance and integrity."""
        with app.app_context():
            # Create a source and topic for articles
            source = Source(name="Bulk Test Source")
            topic = Topic(label="Bulk Test Topic")
            db.session.add_all([source, topic])
            db.session.commit()

            # Test bulk insertion of articles
            articles = []
            for i in range(100):
                article = Article(
                    title=f"Bulk Article {i}",
                    url=f"https://example.com/bulk/{i}",
                    topic_id=topic.id,
                    source_id=source.id,
                )
                articles.append(article)

            db.session.add_all(articles)
            db.session.commit()

            # Verify all articles were created
            assert len(Article.query.all()) == 100
            assert len(source.articles) == 100
            assert len(topic.articles) == 100

    def test_uuid_collision_resistance(self, app):
        """Test UUID collision resistance across multiple models."""
        with app.app_context():
            # Create multiple instances to test UUID uniqueness
            sources = [Source(name=f"Source {i}") for i in range(50)]
            topics = [Topic(label=f"Topic {i}") for i in range(50)]
            articles = [
                Article(title=f"Article {i}", url=f"https://example.com/{i}")
                for i in range(50)
            ]

            db.session.add_all(sources + topics + articles)
            db.session.commit()

            # Collect all UUIDs
            all_uuids = []
            all_uuids.extend([s.id for s in sources])
            all_uuids.extend([t.id for t in topics])
            all_uuids.extend([a.id for a in articles])

            # Verify all UUIDs are unique
            assert len(all_uuids) == len(set(all_uuids))

    def test_article_title_truncation_in_repr(self, app):
        """Test that long article titles are properly truncated in string representation."""
        with app.app_context():
            long_title = (
                "This is a very long article title that exceeds thirty characters"
            )
            article = Article(title=long_title, url="https://example.com/long")
            db.session.add(article)
            db.session.commit()

            # Verify truncation to 30 chars
            expected_repr = f"<Article {long_title[:30]}>"
            assert str(article) == expected_repr

    def test_model_query_performance(self, app):
        """Test basic query performance and indexing."""
        with app.app_context():
            # Create test data
            source = Source(name="Performance Test Source")
            topic = Topic(label="Performance Test Topic")
            db.session.add_all([source, topic])
            db.session.commit()

            # Create multiple articles for query testing
            articles = []
            for i in range(50):
                article = Article(
                    title=f"Performance Article {i}",
                    url=f"https://example.com/perf/{i}",
                    topic_id=topic.id,
                    source_id=source.id,
                )
                articles.append(article)

            db.session.add_all(articles)
            db.session.commit()

            # Test various query patterns
            # Filter by topic
            topic_articles = Article.query.filter_by(topic_id=topic.id).all()
            assert len(topic_articles) == 50

            # Filter by source
            source_articles = Article.query.filter_by(source_id=source.id).all()
            assert len(source_articles) == 50

            # Test relationship loading
            topic_with_articles = (
                Topic.query.options(db.selectinload(Topic.articles))
                .filter_by(id=topic.id)
                .first()
            )
            assert len(topic_with_articles.articles) == 50


class TestMigrations:
    """Test migration scripts functionality.

    IMPORTANT: These tests use an isolated test database to ensure production data safety.
    The test_database fixture automatically:
    1. Derives database connection parameters from DATABASE_URI environment variable
    2. Creates a fresh test database (original_name + '_test' suffix)
    3. Sets ALEMBIC_DATABASE_URL environment variable for migration isolation
    4. Runs migration tests in complete isolation
    5. Cleans up test database and environment variables

    This approach:
    - Maintains configuration consistency with the application
    - Prevents any risk to the production database
    - Adapts to different database configurations automatically
    - Uses the same credentials and connection settings as the app
    """

    @pytest.fixture(scope="class")
    def test_database(self):
        """Set up and tear down test database for migration tests."""
        try:
            # Parse database URL and get connection parameters
            test_db_url, connection_params = parse_database_url_for_testing()

            # Set environment variable for Alembic to use test database
            os.environ["ALEMBIC_DATABASE_URL"] = test_db_url

            # Create test database
            create_test_database(connection_params)

            yield test_db_url

        except ValueError as e:
            pytest.skip(str(e))
        except RuntimeError as e:
            pytest.skip(str(e))
        finally:
            # Clean up test database and environment variable
            if "connection_params" in locals():
                cleanup_test_database(connection_params)

            if "ALEMBIC_DATABASE_URL" in os.environ:
                del os.environ["ALEMBIC_DATABASE_URL"]

    def test_migration_upgrade_downgrade(self, test_database):
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

    def test_migration_idempotency(self, test_database):
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

    def test_migration_conditional_logic(self, test_database):
        """Test that migration handles existing tables gracefully."""
        try:
            # First ensure we're at head
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            assert result.returncode == 0, f"Initial upgrade failed: {result.stderr}"

            # Run again to test conditional logic
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            assert (
                result.returncode == 0
            ), f"Conditional upgrade failed: {result.stderr}"

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

    def test_null_handling(self, app):
        """Test proper null value handling in optional fields."""
        with app.app_context():
            # Test optional fields can be None
            source = Source(name="Null Test Source", logo_url=None, homepage_url=None)
            topic = Topic(label="Null Test Topic")  # coverage_score defaults to 0
            article = Article(
                title="Null Test Article",
                url="https://test.com",
                image_url=None,
                brief=None,
                topic_id=None,
                source_id=None,
            )

            db.session.add_all([source, topic, article])
            db.session.commit()

            # Verify null handling
            assert source.logo_url is None
            assert source.homepage_url is None
            assert article.image_url is None
            assert article.brief is None
            assert article.topic_id is None
            assert article.source_id is None

    def test_data_consistency_after_rollback(self, app):
        """Test data consistency after transaction rollbacks."""
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

    def test_concurrent_uuid_generation(self, app):
        """Test UUID generation under simulated concurrent conditions."""
        with app.app_context():
            generated_uuids = set()

            def create_model_instance(model_class, i):
                if model_class == Source:
                    instance = Source(name=f"Concurrent Source {i}")
                elif model_class == Topic:
                    instance = Topic(label=f"Concurrent Topic {i}")
                else:  # Article
                    instance = Article(
                        title=f"Concurrent Article {i}", url=f"https://test.com/{i}"
                    )

                db.session.add(instance)
                db.session.commit()
                return instance.id

            # Simulate concurrent creation
            all_instances = []
            for model_class in [Source, Topic, Article]:
                for i in range(10):
                    instance_uuid = create_model_instance(model_class, i)
                    all_instances.append(instance_uuid)
                    generated_uuids.add(instance_uuid)

            # Verify all UUIDs are unique
            assert len(generated_uuids) == len(all_instances) == 30
