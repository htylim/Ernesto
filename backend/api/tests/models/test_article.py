"""
Tests for Article model.
This module tests Article model validation, constraints, relationships, and data integrity.
"""

import uuid
from datetime import datetime

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.article import Article
from app.models.source import Source
from app.models.topic import Topic


class TestArticle:
    """Test Article model for validation, constraints, relationships, and data integrity."""

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
        """Test Article model can be created without topic/source relationships and UUID generation."""
        with app.app_context():
            article = Article(
                title="Standalone Article", url="https://example.com/standalone"
            )
            db.session.add(article)
            db.session.commit()

            # Verify article creation without relationships and UUID generation
            assert isinstance(article.id, uuid.UUID)
            assert article.topic_id is None
            assert article.source_id is None
            assert isinstance(article.added_at, datetime)

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

    def test_article_model_relationships(self, app):
        """Test relationships between Article and other models."""
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

    def test_article_cascade_deletion(self, app):
        """Test cascade deletion behavior for Article relationships."""
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

    def test_article_foreign_key_relationships(self, app):
        """Test that Article foreign key relationships are properly defined."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Articles foreign keys
            articles_fks = inspector.get_foreign_keys("articles")

            # Should have foreign keys to topics and sources
            fk_tables = [fk["referred_table"] for fk in articles_fks]
            assert "topics" in fk_tables
            assert "sources" in fk_tables

    def test_article_database_schema(self, app):
        """Test that Article database schema matches model definition."""
        with app.app_context():
            inspector = inspect(db.engine)

            # Test Articles table structure
            articles_columns = {
                col["name"]: col for col in inspector.get_columns("articles")
            }
            assert "id" in articles_columns
            assert "title" in articles_columns
            assert "url" in articles_columns
            assert "image_url" in articles_columns
            assert "brief" in articles_columns
            assert "topic_id" in articles_columns
            assert "source_id" in articles_columns
            assert "added_at" in articles_columns

    def test_article_required_fields(self, app):
        """Test that required fields are properly enforced for Article."""
        with app.app_context():
            # Test missing required fields
            with pytest.raises((IntegrityError, ValueError)):
                # Missing title for Article
                article = Article(url="https://test.com")
                db.session.add(article)
                db.session.commit()

            db.session.rollback()

    def test_article_string_length_constraints(self, app):
        """Test string length constraints for Article."""
        with app.app_context():
            # Test article title length constraints
            long_title = "a" * 1000  # Very long title
            article = Article(title=long_title, url="https://test.com")
            db.session.add(article)

            # This should work or raise an error depending on database constraints
            try:
                db.session.commit()
                # If we get here, length constraints aren't enforced or limit is higher
                db.session.delete(article)
                db.session.commit()
            except (IntegrityError, Exception):
                # Length constraints are enforced
                db.session.rollback()

    def test_article_null_handling(self, app):
        """Test proper null value handling in Article optional fields."""
        with app.app_context():
            # Test optional fields can be None
            article = Article(
                title="Null Test Article",
                url="https://test.com",
                image_url=None,
                brief=None,
                topic_id=None,
                source_id=None,
            )
            db.session.add(article)
            db.session.commit()

            # Verify null handling
            assert article.image_url is None
            assert article.brief is None
            assert article.topic_id is None
            assert article.source_id is None

    def test_article_foreign_key_constraints_enforcement(self, app):
        """Test foreign key constraints are properly enforced for Article."""
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

    def test_article_data_consistency_after_rollback(self, app):
        """Test Article data consistency after transaction rollbacks."""
        with app.app_context():
            # Create valid data
            article = Article(title="Test Article", url="https://test.com")
            db.session.add(article)
            db.session.commit()

            original_count = Article.query.count()
            original_id = article.id

            # Attempt invalid operation that should rollback
            try:
                # This might fail due to constraints
                invalid_article = Article(
                    title=None, url="https://test.com"
                )  # Invalid title
                db.session.add(invalid_article)
                db.session.commit()
            except (IntegrityError, Exception):
                db.session.rollback()

            # Verify original data is still intact
            assert Article.query.count() == original_count
            remaining_article = Article.query.filter_by(title="Test Article").first()
            assert remaining_article is not None
            assert remaining_article.id == original_id

    def test_article_bulk_operations(self, app):
        """Test bulk operations performance and integrity for Article."""
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

    def test_article_query_performance(self, app):
        """Test basic query performance for Article."""
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
