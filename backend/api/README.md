# Ernesto API Server

Flask/SQLAlchemy REST API server for the Ernesto news curation and summarization service.

## Overview

The API server provides backend services for the Ernesto platform, handling:
- Data storage and retrieval for news articles and topics
- Authentication and user preferences
- Article grouping and ranking algorithms
- Serving content to the Chrome extension

## Tech Stack

- **Framework**: Flask
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL
- **Authentication**: JWT

## API Endpoints

| Endpoint            | Method | Description 
|---------------------|--------|-------------------------------------------
| `/api/articles`     | GET    | Retrieve articles with optional filtering 
| `/api/topics`       | GET    | Get topics ranked by coverage 
| `/api/articles/:id` | GET    | Get article details and content 
| `/api/auth`         | POST   | User authentication 

## Development Setup

### Prerequisites

- Python 3.9+
- PostgreSQL
- Virtual environment tool (venv, conda, etc.)

### Installation

1. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. Initialize the database:
   ```
   flask db upgrade
   ```

5. Start the development server:
   ```
   flask run
   ```

## Testing

Run tests with:
```
pytest
```

## Related Components

- **Chrome Extension**: Frontend for user interaction (`/extension/`)
- **Worker Service**: Background processing for article collection (`/backend/worker/`)