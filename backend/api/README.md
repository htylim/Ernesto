# Ernesto API Server

Flask/SQLAlchemy REST API server for the Ernesto news curation and summarization service.

## Overview

The Ernesto API service is the backend component of the "Ernesto news-curating solution". Its primary purpose is to provide the Ernesto Chrome extension with curated news data, enabling users to efficiently stay informed about weekly events and issues.

The core problem it addresses is information overload from daily news. Ernesto allows users to consume news weekly by:
- Aggregating articles from multiple news sources
- Identifying key events/issues (Topics) that occurred during the week
- Coalescing all articles related to each event/issue
- Measuring "news relevancy" by the level of coverage across sources (number of articles per topic)
- Ultimately, providing users with a curated list of summarized events/issues, reducing reading time and keeping them comprehensively updated

The API service interacts with a PostgreSQL database, which is populated by a separate Worker Service responsible for scraping and processing news articles. The sole consumer of this API is the Ernesto Chrome extension, which acts as a confidential client.

## System Architecture

### System Components

1. **Flask API Server**: The core component this service defines. Handles all API requests from the Chrome extension. Written in Python using Flask framework with Flask-SQLAlchemy ORM and Flask-Alembic for database migrations.

2. **PostgreSQL Database**: Shared database storing articles, topics, and sources. Populated by the Worker Service.

3. **Worker Service**: Google Lambda functions responsible for scraping news articles from various sources, processing them (extracting content, identifying topics, calculating coverage score), and storing them in the PostgreSQL database.

4. **Chrome Extension**: The user-facing client application. Acts as a confidential client to the API.

5. **Google Cloud Services (GCS)**: Hosting platform for the API (Cloud Run preferred) and the worker functions.

### Technology Stack & Flask Best Practices

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

## Core Features & Data Models

### Entities

The API exposes the following resources, reflecting the underlying database structure:

#### Articles
- `id`: UUID, Primary Key
- `title`: TEXT, Title of the article
- `url`: URL, Direct link to the original article
- `image_url`: URL, Link to a representative image for the article
- `brief`: TEXT, A short summary or abstract of the article
- `topic_id`: UUID, Foreign Key referencing the Topics entity
- `source_id`: UUID, Foreign Key referencing the Sources entity
- `added_at`: TIMESTAMP, When the article was added to the system

#### Sources
- `id`: UUID, Primary Key
- `logo_url`: URL, Link to the news source's logo
- `name`: TEXT, Name of the news source
- `homepage_url`: URL, Link to the news source's homepage
- `is_enabled`: BOOLEAN, Whether the source is currently active for scraping

#### Topics (Events/Issues)
- `id`: UUID, Primary Key
- `label`: TEXT, A concise name or label for the event/issue
- `added_at`: TIMESTAMP, When the topic was first identified (date of the earliest article)
- `updated_at`: TIMESTAMP, When the topic was last updated (new article added)
- `coverage_score`: INTEGER, Number of articles associated with this topic (indicates relevancy)

### Database Relationships
- `Articles.topic_id` → `Topics.id` (Many-to-One)
- `Articles.source_id` → `Sources.id` (Many-to-One)
- `Topics.coverage_score` is the count of articles associated with each topic

**Implementation Notes:**
- Models inherit from `db.Model` (Flask-SQLAlchemy base class)
- Use Flask-SQLAlchemy's `db.Column`, `db.relationship()`, etc.
- Session management handled automatically by Flask-SQLAlchemy's `db.session`
- Migrations managed through Flask-Alembic integration

## API Reference

### Authentication

#### `POST /api/auth/token`
Authenticates the Chrome extension client using OAuth 2.0 Client Credentials Grant Flow.

**Request Body:**
```json
{
  "client_id": "chrome_extension_client_id",
  "client_secret": "chrome_extension_client_secret", 
  "grant_type": "client_credentials"
}
```

**Response:**
```json
{
  "access_token": "jwt_token_here",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Topics

#### `GET /api/topics`
Retrieves a list of topics, sorted by coverage score (descending).

**Query Parameters:**
- `start_date` (YYYY-MM-DD, mandatory)
- `end_date` (YYYY-MM-DD, mandatory)

**Response:** List of Topic objects
**Authentication:** Required

#### `GET /api/topics/{topic_id}`
Retrieves details for a specific topic.

**Path Parameter:** `topic_id` (UUID)
**Response:** Single Topic object
**Authentication:** Required

### Articles

#### `GET /api/articles`
Retrieves a list of articles.

**Query Parameters:**
- `start_date` (YYYY-MM-DD, mandatory)
- `end_date` (YYYY-MM-DD, mandatory)
- `topic_id` (UUID, optional): Filter articles by a specific topic
- `sort_by` (optional): "date_desc", "date_asc", default: "date_desc" by `added_at`

**Response:** List of Article objects
**Authentication:** Required

#### `GET /api/articles/{article_id}`
Retrieves details for a specific article.

**Path Parameter:** `article_id` (UUID)
**Response:** Single Article object
**Authentication:** Required

### Sources

#### `GET /api/sources`
Retrieves a list of all news sources.

**Response:** List of Source objects
**Authentication:** Required

#### `GET /api/sources/{source_id}`
Retrieves details for a specific news source.

**Path Parameter:** `source_id` (UUID)
**Response:** Single Source object
**Authentication:** Required

### Future Enhancements

- `GET /api/topics/{topic_id}/summary`: Comprehensive, coalesced summary of all articles under a topic
- Enhanced `/api/topics` with representative `image_url` and `mini_brief`
- Enhanced sorting/filtering options for articles

## Authentication & Security

### Mechanism
OAuth 2.0 Client Credentials Grant Flow using JWTs (JSON Web Tokens) as access tokens, implemented with Flask-JWT-Extended.

### Authentication Flow
1. Chrome Extension requests an access token from `/api/auth/token` by sending `client_id`, `client_secret`, and `grant_type="client_credentials"`
2. API server validates the client credentials using Flask-JWT-Extended
3. If valid, API server generates a JWT using Flask-JWT-Extended and returns it to the extension
4. Chrome Extension stores the JWT securely and includes it in the `Authorization: Bearer <token>` header for all subsequent requests

This provides a secure way for the extension (a machine client) to access the API using Flask's ecosystem tools.

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

### Development Guidelines

- We are encouraged to make any modifications deemed necessary to improve the codebase, architecture, or workflow
- All development should follow modern coding and web development best practices, with particular attention to Flask and SQLAlchemy conventions
- As implementation progresses, create unit tests to verify all new functionality and changes
- Maintain a clean, maintainable, and well-tested codebase that adheres to industry standards
- Proactively remove unused code and files, avoiding the accumulation of "dead" code

## Database Management

This project uses Flask-Alembic for database migrations, which provides Flask-specific integration with Alembic.

### Common Commands

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

### Flask-SQLAlchemy Model Usage

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

## Testing

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

## Application Structure

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

## Configuration & Deployment

### Flask Configuration

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

### Infrastructure Requirements

- Deployment on Google Cloud Services (Cloud Run is the preferred option for the Flask API)
- PostgreSQL instance (e.g., Google Cloud SQL)
- Standard logging and monitoring setup within GCS
- Development environment uses Docker, with Ruff for linting and Black for formatting
- Flask development server for local development, Gunicorn for production deployment

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