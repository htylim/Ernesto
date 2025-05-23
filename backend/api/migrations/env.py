import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app import create_app, db

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
# ---
# Ensure Flask app context is pushed so Flask-SQLAlchemy models are registered with metadata
app = create_app()
app.app_context().push()
# ---
target_metadata = db.Model.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

# Note: UUID columns are supported via sqlalchemy.dialects.postgresql.UUID


def get_database_url():
    """Get database URL using best practices:

    1. First check ALEMBIC_DATABASE_URL (testing override)
    2. Use Flask app's configuration (same as application)
    3. This ensures consistency and avoids hardcoded credentials
    """
    # Priority 1: Environment override for testing
    alembic_url = os.getenv("ALEMBIC_DATABASE_URL")
    if alembic_url:
        return alembic_url

    # Priority 2: Use Flask app's database configuration
    # This ensures Alembic uses the exact same configuration as your app
    return app.config["SQLALCHEMY_DATABASE_URI"]


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Get database URL using best practices (no hardcoded values)
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Get configuration section from alembic.ini
    configuration = config.get_section(config.config_ini_section, {})

    # Set database URL from Flask app configuration (best practices)
    database_url = get_database_url()
    configuration["sqlalchemy.url"] = database_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
