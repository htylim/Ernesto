# Ernesto Worker Service

GCP Lambda functions for periodic news scraping and processing for the Ernesto news curation service.

## Overview

The Worker Service handles background processing tasks for Ernesto, including:
- Periodic collection of news articles from diverse sources
- Analysis of news coverage patterns
- Topic-based grouping of related articles
- Coverage-based ranking of news topics
- Preprocessing of article data for the API

## Tech Stack

- **Runtime**: Google Cloud Functions (GCP Lambda)
- **Language**: Python
- **Scheduling**: Cloud Scheduler
- **Storage**: Cloud Storage
- **Database Integration**: SQLAlchemy (for API database updates)

## Core Functions

| Function      | Trigger                     | Description                                    |
|---------------|-----------------------------|------------------------------------------------|
| `scrape_news` | Scheduled (every few hours) | Collects articles from configured news sources |

## Development Setup

### Prerequisites

- Python 3.9+
- Google Cloud SDK
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
   # Edit .env with your GCP credentials and API keys
   ```

4. Run functions locally:
   ```
   functions-framework --target=scrape_news
   ```

## Deployment

Deploy functions to GCP:
```
gcloud functions deploy scrape_news --runtime python39 --trigger-topic news-scraping --env-vars-file .env.yaml
```

## Testing

Run tests with:
```
pytest
```

## Related Components

- **API Server**: Data storage and REST endpoints (`/backend/api/`)
- **Chrome Extension**: Frontend for user interaction (`/extension/`) 