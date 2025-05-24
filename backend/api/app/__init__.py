import os

from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Load environment variables from .env file
load_dotenv()

# Initialize SQLAlchemy instance
db = SQLAlchemy()


def create_app(test_config=None):
    """Factory function that creates and configures the Flask application.

    Args:
        test_config (dict, optional): Test configuration to override default configs.

    Returns:
        Flask: Configured Flask application instance.
    """
    # Create the Flask application
    app = Flask(__name__)

    # Load default configuration
    if test_config is None:
        # Configure the SQLAlchemy connection to PostgreSQL
        # The format is: postgresql://username:password@host:port/database
        app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URI")

        # Disable modification tracking to improve performance
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = (
            os.getenv("SQLALCHEMY_TRACK_MODIFICATIONS", "False").lower() == "true"
        )
    else:
        # Load the test config if passed in
        app.config.from_mapping(test_config)

    # Initialize the app with the SQLAlchemy extension
    db.init_app(app)

    # Import models and routes here to avoid circular imports
    from app.routes import register_routes

    # Register routes
    register_routes(app)

    # Create the database and tables
    with app.app_context():
        db.create_all()

    return app
