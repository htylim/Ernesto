# Epic roadmap

High-level split of Epics for the implementation of the project described in `/README.md`

## [x] 1. Setup Flask Application Factory Pattern
Implement a modular Flask app using the application factory pattern. Include structured configuration management with environment-based settings, comprehensive error handling, logging setup, and extension registration to support different environments (development, testing, production).

## [x] 2. Setup Database Models with Flask-SQLAlchemy
Define SQLAlchemy models for Articles, Topics, and Sources entities with proper relationships, constraints, and UUID primary keys. Include timestamp fields, foreign key relationships, and validation. Ensure models follow Flask-SQLAlchemy patterns with proper `db.Model` inheritance.

## [x] 3. Implement Database Migrations with Flask-Alembic
Enable version-controlled schema changes using Flask-Alembic integration. Set up migration commands that work with the application factory pattern, configure migration environment, and create initial database schema migrations for all entities.

## [ ] 4. Implement API Key Authentication System and Remove OAuth2 Components
Replace OAuth2 client credentials flow with API Key-based authentication system. Remove all OAuth2/JWT-related code and dependencies, enhance the existing ApiClient model and authentication middleware, create proper database migrations, and implement comprehensive API key management for the Chrome extension client. This includes cleaning up JWT configuration, removing unused Flask-JWT-Extended components, and ensuring robust API key validation with proper error handling and security features.

## [ ] 5. Create Authentication Middleware and Protected Routes
Implement JWT verification decorators and middleware to secure API endpoints. Set up comprehensive error responses for authentication failures, proper CORS handling for cross-origin requests, and request context management for protected routes.

## [ ] 6. Implement Topics API Endpoints
Build complete endpoints for topic management including list retrieval sorted by coverage score, date range filtering, and individual topic detail views. Include proper query parameter validation, response serialization, and JWT-protected access.

## [ ] 7. Implement Articles API Endpoints  
Create comprehensive article endpoints with list retrieval, filtering by topic and date range, sorting options, and individual article detail views. Include nested topic/source serialization, efficient database queries, and proper pagination support.

## [ ] 8. Implement Sources API Endpoints
Develop endpoints for news source management including complete source listing and individual source detail retrieval. Ensure proper response formatting, JWT protection, and integration with article relationships.

## [ ] 9. Implement Request Validation and Response Serialization
Create comprehensive input validation for all API endpoints using proper Flask patterns. Implement consistent JSON response formatting, query parameter validation with proper error messages, and standardized API response schemas.

## [ ] 10. Setup Comprehensive Testing Framework
Establish complete testing infrastructure using Flask's test client and pytest. Create fixtures for database testing, authentication testing utilities, and comprehensive test coverage for all models, endpoints, and authentication flows.

## [ ] 11. Setup Development Environment and Tooling
Configure complete development environment with Docker containerization, code formatting using Black, linting with Ruff, and development workflow automation. Include database seeding utilities and development server configuration.

## [ ] 12. Implement Production Configuration and Deployment Setup
Configure production-ready deployment settings for Google Cloud Run, set up Gunicorn WSGI server configuration, implement proper logging and monitoring, and create deployment scripts with environment-specific configurations. 