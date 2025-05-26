"""
Tests for database migrations.
This module tests migration operations like upgrade, downgrade, and migration detection.
"""

from sqlalchemy import inspect

from app import alembic, db


class TestMigrations:
    """Test database migration operations."""

    def test_migration_upgrade_from_empty_db(self, empty_db_app):
        """Test applying migrations from an empty database to head."""
        with empty_db_app.app_context():
            # Verify database starts empty (no tables)
            inspector = inspect(db.engine)
            initial_tables = inspector.get_table_names()
            assert (
                len(initial_tables) == 0
            ), f"Expected empty DB, found tables: {initial_tables}"

            # Apply all migrations to head
            alembic.upgrade()

            # Verify database state after upgrade
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()

            # Should have our model tables plus alembic_version
            expected_tables = [
                "api_clients",
                "sources",
                "topics",
                "articles",
                "alembic_version",
            ]
            for table in expected_tables:
                assert table in tables, f"Table {table} not found after migration"

            # Verify we have the correct number of tables (no extra tables)
            assert len(tables) == len(
                expected_tables
            ), f"Expected {len(expected_tables)} tables, found {len(tables)}: {tables}"

    def test_migration_downgrade_to_base(self, empty_db_app):
        """Test rolling back all migrations to base (empty state)."""
        with empty_db_app.app_context():
            # First upgrade to head to have something to downgrade
            alembic.upgrade()

            # Verify tables exist after upgrade
            inspector = inspect(db.engine)
            tables_after_upgrade = inspector.get_table_names()
            assert len(tables_after_upgrade) > 0, "No tables found after upgrade"

            # Downgrade to base (removes all migrations)
            alembic.downgrade(target="base")

            # Verify database is back to empty state
            inspector = inspect(db.engine)
            tables_after_downgrade = inspector.get_table_names()

            # Should only have alembic_version table remaining (Flask-Alembic behavior)
            # or be completely empty depending on implementation
            assert (
                len(tables_after_downgrade) <= 1
            ), f"Expected empty or only alembic_version, found: {tables_after_downgrade}"
            if tables_after_downgrade:
                assert tables_after_downgrade == ["alembic_version"]

    def test_migration_step_by_step_downgrade(self, empty_db_app):
        """Test rolling back migrations one step at a time."""
        with empty_db_app.app_context():
            # First upgrade to head
            alembic.upgrade()

            # Get current revision (should be head)
            current_before = alembic.current()
            assert len(current_before) > 0, "No current revision found after upgrade"

            # Downgrade one step
            alembic.downgrade(target="-1")

            # Verify we moved back one revision
            current_after = alembic.current()
            assert (
                current_after != current_before
            ), "Revision didn't change after downgrade"

    def test_migration_heads_detection(self, empty_db_app):
        """Test getting migration heads."""
        with empty_db_app.app_context():
            # Get migration heads
            heads = alembic.heads()

            # Should return a tuple with at least one head
            assert hasattr(heads, "__iter__"), "Heads should be iterable"
            heads_list = list(heads)
            assert len(heads_list) > 0, "Should have at least one migration head"

            # Each head should be a Script object with revision attribute
            for head in heads_list:
                assert hasattr(
                    head, "revision"
                ), f"Head {head} should have revision attribute"
                assert isinstance(
                    head.revision, str
                ), f"Head revision {head.revision} should be a string"

    def test_current_revision_tracking(self, empty_db_app):
        """Test getting current database revision at different states."""
        with empty_db_app.app_context():
            # Initially, current revision should be empty tuple (no migrations applied)
            current_initial = alembic.current()
            assert (
                len(current_initial) == 0
            ), f"Expected empty tuple for empty DB, got: {current_initial}"

            # After upgrade, should have a current revision
            alembic.upgrade()
            current_after_upgrade = alembic.current()
            assert (
                len(current_after_upgrade) > 0
            ), "Should have current revision after upgrade"

            # Each current revision should be a Script object
            for revision in current_after_upgrade:
                assert hasattr(
                    revision, "revision"
                ), "Current revision should have revision attribute"
                assert isinstance(
                    revision.revision, str
                ), "Current revision should be a string"

    def test_models_detected_by_alembic(self, empty_db_app):
        """Test that Flask-Alembic can detect our models in metadata."""
        with empty_db_app.app_context():
            # Get SQLAlchemy metadata
            metadata = db.metadata

            # Verify our models are in the metadata
            table_names = list(metadata.tables.keys())
            expected_tables = ["api_clients", "sources", "topics", "articles"]

            for table in expected_tables:
                assert (
                    table in table_names
                ), f"Model table {table} not found in metadata"

    def test_migration_creates_correct_schema(self, empty_db_app):
        """Test that migrations create the correct database schema."""
        with empty_db_app.app_context():
            # Apply migrations
            alembic.upgrade()

            inspector = inspect(db.engine)

            # Test api_clients table structure
            api_clients_columns = {
                col["name"]: col for col in inspector.get_columns("api_clients")
            }
            assert "id" in api_clients_columns
            assert "name" in api_clients_columns
            assert "api_key" in api_clients_columns
            assert "is_active" in api_clients_columns
            assert "created_at" in api_clients_columns

            # Test sources table structure
            sources_columns = {
                col["name"]: col for col in inspector.get_columns("sources")
            }
            assert "id" in sources_columns
            assert "name" in sources_columns
            assert "logo_url" in sources_columns
            assert "homepage_url" in sources_columns
            assert "is_enabled" in sources_columns

            # Test topics table structure
            topics_columns = {
                col["name"]: col for col in inspector.get_columns("topics")
            }
            assert "id" in topics_columns
            assert "label" in topics_columns
            assert "added_at" in topics_columns
            assert "updated_at" in topics_columns
            assert "coverage_score" in topics_columns

            # Test articles table structure
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

    def test_migration_creates_foreign_keys(self, empty_db_app):
        """Test that migrations create proper foreign key relationships."""
        with empty_db_app.app_context():
            # Apply migrations
            alembic.upgrade()

            inspector = inspect(db.engine)

            # Test articles foreign keys
            articles_fks = inspector.get_foreign_keys("articles")

            # Should have foreign keys to topics and sources
            fk_tables = [fk["referred_table"] for fk in articles_fks]
            assert "topics" in fk_tables, "Missing foreign key to topics table"
            assert "sources" in fk_tables, "Missing foreign key to sources table"

    def test_migration_creates_indexes(self, empty_db_app):
        """Test that migrations create proper indexes."""
        with empty_db_app.app_context():
            # Apply migrations
            alembic.upgrade()

            inspector = inspect(db.engine)

            # Test articles indexes
            articles_indexes = inspector.get_indexes("articles")
            index_columns = [idx["column_names"] for idx in articles_indexes]

            # Should have indexes on foreign key columns
            assert ["topic_id"] in index_columns, "Missing index on topic_id"
            assert ["source_id"] in index_columns, "Missing index on source_id"

    def test_migration_idempotency(self, empty_db_app):
        """Test that running migrations multiple times is safe (idempotent)."""
        with empty_db_app.app_context():
            # Apply migrations first time
            alembic.upgrade()

            # Get table state after first migration
            inspector = inspect(db.engine)
            tables_first = set(inspector.get_table_names())
            current_first = alembic.current()

            # Apply migrations again (should be no-op)
            alembic.upgrade()

            # Verify state is unchanged
            inspector = inspect(db.engine)
            tables_second = set(inspector.get_table_names())
            current_second = alembic.current()

            assert (
                tables_first == tables_second
            ), "Tables changed after second migration run"
            assert (
                current_first == current_second
            ), "Current revision changed after second migration run"
