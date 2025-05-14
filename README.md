# Ernesto

News curation and summarization service that helps you stay informed about what matters most.

## Overview

Ernesto aggregates news from various sources, analyzes coverage patterns, and presents a curated experience based on topic importance. News stories are automatically grouped by topic and ranked by coverage level, with the most widely covered stories highlighted as most significant.

Users access a personalized news homepage through the Ernesto Chrome extension, which also provides AI-powered summarization and interactive Q&A capabilities.

## Key Features

- **Automated News Aggregation**: Collects articles from diverse sources every few hours
- **Topic-Based Grouping**: Intelligently organizes news by subject matter
- **Coverage-Based Ranking**: Prioritizes widely covered topics
- **Article Summarization**: Provides concise summaries of lengthy articles
- **Interactive Q&A**: Allows users to ask questions about news content

## Repository Structure

This monorepo contains the following components:

| Directory             | Description 
|-----------------------|-----------------------------------------------------------
| `/extension/`         | Chrome extension frontend for user interaction 
| `/backend/api/`       | Flask/SQLAlchemy REST API and database services
| `/backend/worker/`    | GCP Lambda functions for periodic scraping and processing

Refer to each directory's README.md for detailed documentation and setup instructions.
