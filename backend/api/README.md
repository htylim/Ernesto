# Ernesto API Server

Flask/SQLAlchemy REST API server for the Ernesto news curation and summarization service.

## Overview

The API server provides backend services for the Ernesto platform, handling:
- Data storage and retrieval for news articles and topics
- Authentication and user preferences
- Article grouping and ranking algorithms
- Serving content to the Chrome extension

## Tech Stack & Flask Best Practices

This project follows Flask ecosystem best practices and uses:

- **Framework**: Flask with application factory pattern
- **ORM**: Flask-SQLAlchemy (Flask-specific SQLAlchemy integration)
- **Database Migrations**: Flask-Alembic (Flask-specific Alembic integration)
- **Database**: PostgreSQL
- **Authentication**: Flask-JWT-Extended for JWT token management
- **Session Management**: Flask-SQLAlchemy's `db.session` (automatic request-scoped)
- **Configuration**: Flask's native configuration system with environment variables
- **Application Structure**: Blueprint-based modular organization
- **Testing**: Flask's built-in test client and pytest
- **Development**: Flask development server, Gunicorn for production

**Key Flask Best Practices Implemented:**
- Application factory pattern for better testability and configuration management
- Flask-SQLAlchemy for automatic session management and Flask integration
- Blueprint organization for modular code structure
- Flask's request context for proper session scoping
- Environment-based configuration using Flask's config system
- Proper error handling with Flask error handlers

## API Endpoints

| Endpoint            | Method | Description 
|---------------------|--------|-------------------------------------------
| `/api/auth/token`   | POST   | Client credentials authentication (OAuth 2.0)
| `/api/articles`     | GET    | Retrieve articles with optional filtering 
| `/api/articles/:id` | GET    | Get article details and content 
| `/api/topics`       | GET    | Get topics ranked by coverage 
| `/api/topics/:id`   | GET    | Get topic details
| `/api/sources`      | GET    | Get news sources
| `/api/sources/:id`  | GET    | Get source details

## Development Setup

### Prerequisites

- Python 3.9+
- PostgreSQL
- Virtual environment tool (venv, conda, etc.)

### Installation

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. Initialize the database using Flask-Alembic:
   ```bash
   flask db upgrade
   ```

5. Start the Flask development server:
   ```bash
   flask run
   ```

## Database Management with Flask-Alembic

This project uses Flask-Alembic for database migrations, which provides Flask-specific integration with Alembic. Common commands:

```bash
# Apply all pending migrations
flask db upgrade

# Rollback to previous migration
flask db downgrade

# Generate a new migration after model changes
flask db revision "Description of changes"

# Check current migration status
flask db current

# View migration history
flask db history
```

**Flask-SQLAlchemy Model Usage:**
```python
# Models inherit from db.Model (Flask-SQLAlchemy)
from app import db

class Article(db.Model):
    __tablename__ = 'articles'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    
    # Use Flask-SQLAlchemy's db.session for operations
    @classmethod
    def create(cls, title):
        article = cls(title=title)
        db.session.add(article)
        db.session.commit()
        return article
```

For more detailed database operations, see the [database operations guide](.cursor/rules/database.mdc).

## Testing with Flask

Run tests using Flask's test client:
```bash
pytest
```

Run specific test categories:
```bash
# Migration tests
pytest tests/test_migrations.py -v

# Model tests (Flask-SQLAlchemy)
pytest tests/models/ -v

# API endpoint tests (Flask routes)
pytest tests/api/ -v
```

**Flask Testing Example:**
```python
def test_article_creation(client, app):
    """Test article creation using Flask test client."""
    with app.app_context():
        response = client.post('/api/articles', 
                             json={'title': 'Test Article'})
        assert response.status_code == 201
```

## Flask Application Structure

```
app/
├── __init__.py          # Application factory
├── models/              # Flask-SQLAlchemy models
│   ├── __init__.py
│   ├── article.py
│   ├── topic.py
│   └── source.py
├── api/                 # Flask Blueprints for API routes
│   ├── __init__.py
│   ├── auth.py
│   ├── articles.py
│   ├── topics.py
│   └── sources.py
├── auth/                # Flask-JWT-Extended authentication
│   └── __init__.py
└── config.py            # Flask configuration
```

## Configuration

Flask configuration is managed through environment variables and Flask's config system:

```python
# config.py
import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

# app/__init__.py
def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
```

## Related Components

- **Chrome Extension**: Frontend for user interaction (`/extension/`)
- **Worker Service**: Background processing for article collection (`/backend/worker/`)

## Flask Ecosystem Dependencies

Key Flask-specific packages used:
- `Flask` - Core web framework
- `Flask-SQLAlchemy` - Flask-specific SQLAlchemy integration
- `Flask-Alembic` - Flask-specific Alembic integration  
- `Flask-JWT-Extended` - JWT authentication for Flask
- `Flask-CORS` - Cross-origin resource sharing
- `Flask-Limiter` - Rate limiting (future enhancement)