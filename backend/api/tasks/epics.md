# Epic roadmap

High-level split of Epics for the implementation of the project described in `/README.md`

## [x] 1. Setup Flask Application Factory Pattern
Implement a modular Flask app using the application factory pattern. Include structured configuration management with environment-based settings, comprehensive error handling, logging setup, and extension registration to support different environments (development, testing, production).

## [x] 2. Setup Database Models with Flask-SQLAlchemy
Define SQLAlchemy models for Articles, Topics, and Sources entities with proper relationships, constraints, and UUID primary keys. Include timestamp fields, foreign key relationships, and validation. Ensure models follow Flask-SQLAlchemy patterns with proper `db.Model` inheritance.

## [x] 3. Implement Database Migrations with Flask-Alembic
Enable version-controlled schema changes using Flask-Alembic integration. Set up migration commands that work with the application factory pattern, configure migration environment, and create initial database schema migrations for all entities.

## [x] 4. Implement API Key Authentication System and Remove OAuth2 Components
Replace OAuth2 client credentials flow with API Key-based authentication system. Remove all OAuth2/JWT-related code and dependencies, enhance the existing ApiClient model and authentication middleware, create proper database migrations, and implement comprehensive API key management for the Chrome extension client. This includes cleaning up JWT configuration, removing unused Flask-JWT-Extended components, and ensuring robust API key validation with proper error handling and security features.

## [x] 5. Implement CORS Configuration for Chrome Extension
Install Flask-CORS dependency and configure comprehensive cross-origin resource sharing for Chrome extension client access. Set up environment-specific allowed origins configuration in BaseConfig classes (development: localhost patterns, production: extension-id patterns), implement proper preflight request handling for OPTIONS requests, and configure appropriate CORS headers (Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers). Include Chrome extension-specific origin patterns (chrome-extension://), credential handling configuration, and secure CORS policies with restrictive origin validation for production deployment. Add CORS configuration validation and comprehensive testing for cross-origin scenarios.

## [ ] 6. Migrate to Pydantic v2 for Validation and Serialization
Step 0: Upgrade runtime/tooling to Python 3.12 (latest patch). Update Docker base image, tooling targets (`pyproject.toml` Black/Ruff target-version `py312`, `pyrightconfig.json` `pythonVersion` 3.12), and README. Verify dependency compatibility on 3.12.

Then migrate from Flask-Marshmallow to Pydantic v2 (latest stable). Replace Marshmallow schemas and validators with Pydantic `BaseModel` request/response models; standardize JSON serialization via `model_dump()`/`model_dump_json()`; enable ORM attribute support with `from_attributes=True`; and ensure consistent typing for `uuid.UUID`, timezone-aware `datetime` (UTC), and `Enum`. Implement internal request validation decorators (`validate_query`, `validate_body`, `validate_path`) and a global handler for `pydantic.ValidationError` to return standardized 400 responses; do not add third‑party Flask-Pydantic packages. Remove Flask-Marshmallow and related adapters/dependencies, and refactor tests/fixtures to Pydantic while preserving existing public API response shapes for backwards compatibility. Assess `pydantic-settings` later as a separate, optional enhancement.

## [ ] 7. Implement Request Validation and Response Infrastructure  
Create comprehensive infrastructure for API request validation including query parameter validation, input validation patterns, standardized JSON response formatting, and consistent error response schemas. Implement reusable validation decorators and response formatters that will be used by all API endpoints.

## [ ] 8. Implement Database Seeding Utilities
Create database seeding utilities to populate development and testing environments with realistic sample data. Include scripts to generate sample articles, topics, sources, and API clients for development and testing purposes, making it easier to develop and test API endpoints with realistic data scenarios.

## [ ] 9. Implement Topics API Endpoints
Build complete endpoints for topic management including list retrieval sorted by coverage score, date range filtering, and individual topic detail views. Apply request validation for query parameters (start_date, end_date), implement response serialization using TopicSchema, and secure endpoints with API key authentication.

## [ ] 10. Implement Articles API Endpoints  
Create comprehensive article endpoints with list retrieval, filtering by topic and date range, sorting options, and individual article detail views. Include query parameter validation (start_date, end_date, topic_id, sort_by), nested topic/source serialization, efficient database queries, proper pagination support, and API key protection.

## [ ] 11. Implement Sources API Endpoints
Develop endpoints for news source management including complete source listing and individual source detail retrieval. Implement response formatting using SourceSchema, API key protection, and integration with article relationships.

## [ ] 12. Implement Production Configuration and Deployment Setup
Configure production-ready deployment settings for Google Cloud Run, set up Gunicorn WSGI server configuration, implement proper logging and monitoring, and create deployment scripts with environment-specific configurations. 