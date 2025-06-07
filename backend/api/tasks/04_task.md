# [ ] 4 Implement OAuth 2.0 Client Credentials Authentication with JWT

Add support for OAuth2 client credentials flow using Flask-JWT-Extended. Implement secure client credential validation, JWT token generation and verification, and proper token expiration handling for the Chrome extension client.

## Relevant Files

- `app/auth/__init__.py` - Blueprint registration for authentication routes and module initialization.
- `app/auth/routes.py` - OAuth2 client credentials token endpoint implementation and JWT generation logic.
- `app/auth/models.py` - Client credentials model for storing and validating Chrome extension client information.
- `app/auth/validators.py` - Client credential validation functions and OAuth2 flow validation logic.
- `app/auth/decorators.py` - JWT verification decorators for protecting API endpoints with token validation.
- `app/config.py` - JWT configuration settings including secret keys, token expiration, and security settings.
- `tests/auth/test_routes.py` - Unit tests for authentication endpoints and OAuth2 flow implementation.
- `tests/auth/test_models.py` - Unit tests for client credentials model and validation logic.
- `tests/auth/test_validators.py` - Unit tests for client credential validation functions.
- `tests/auth/test_decorators.py` - Unit tests for JWT verification decorators and token validation.

## Notes

- Follow OAuth 2.0 Client Credentials Grant specification (RFC 6749, Section 4.4)
- Use Flask-JWT-Extended for JWT token management and validation
- Client credentials should be securely stored and validated
- JWT tokens should include proper claims (sub, iat, exp, aud)
- Implement proper error responses following OAuth 2.0 error format
- All authentication endpoints should handle CORS for Chrome extension requests
- Unit tests should be placed under `/tests/auth/`, following the pattern `tests/auth/test_*.py`
- Use `pytest` for running authentication-related tests

## Tasks

- [ ] 4.1 Setup Flask-JWT-Extended Configuration
    - [ ] 4.1.1 Install Flask-JWT-Extended dependency
    - [ ] 4.1.2 Add JWT configuration to config classes
    - [ ] 4.1.3 Initialize JWT extension in application factory
    - [ ] 4.1.4 Configure JWT error handlers
- [ ] 4.2 Implement Client Credentials Model
    - [ ] 4.2.1 Create client credentials database model
    - [ ] 4.2.2 Add client credential validation methods
    - [ ] 4.2.3 Create database migration for client model
    - [ ] 4.2.4 Seed initial Chrome extension client credentials
- [ ] 4.3 Implement OAuth2 Token Endpoint
    - [ ] 4.3.1 Create authentication blueprint
    - [ ] 4.3.2 Implement POST /api/auth/token endpoint
    - [ ] 4.3.3 Add client credentials validation logic
    - [ ] 4.3.4 Implement JWT token generation
    - [ ] 4.3.5 Add proper OAuth2 error responses
- [ ] 4.4 Implement JWT Verification Decorators
    - [ ] 4.4.1 Create JWT required decorator
    - [ ] 4.4.2 Add token validation and error handling
    - [ ] 4.4.3 Implement request context management
    - [ ] 4.4.4 Add CORS handling for authenticated routes
- [ ] 4.5 Implement Comprehensive Testing
    - [ ] 4.5.1 Create authentication test fixtures
    - [ ] 4.5.2 Test OAuth2 token endpoint functionality
    - [ ] 4.5.3 Test JWT verification and protection
    - [ ] 4.5.4 Test authentication error scenarios

## **4.1 Setup Flask-JWT-Extended Configuration**

Configure Flask-JWT-Extended extension with proper security settings and error handling for OAuth2 client credentials flow.

### **4.1.1 Install Flask-JWT-Extended dependency**
Add Flask-JWT-Extended to `requirements.txt` with appropriate version specification for JWT token management.

### **4.1.2 Add JWT configuration to config classes**
Update `app/config.py` to include JWT configuration parameters:
- JWT secret key from environment variables
- Token expiration settings (3600 seconds for access tokens)
- JWT algorithm specification (HS256)
- Token location configuration (headers only)
- JWT error message customization

### **4.1.3 Initialize JWT extension in application factory**
Update `app/__init__.py` to initialize Flask-JWT-Extended in the `create_app()` function with proper extension registration.

### **4.1.4 Configure JWT error handlers**
Implement custom JWT error handlers for expired tokens, invalid tokens, and missing tokens with proper OAuth2 error format responses.

## **4.2 Implement Client Credentials Model**

Create database model and validation logic for storing and managing Chrome extension client credentials.

### **4.2.1 Create client credentials database model**
Create `app/auth/models.py` with a `Client` model containing:
- `id`: UUID primary key
- `client_id`: Unique string identifier for the Chrome extension
- `client_secret_hash`: Hashed client secret using bcrypt
- `is_active`: Boolean flag for enabling/disabling clients
- `created_at` and `updated_at` timestamps

### **4.2.2 Add client credential validation methods**
Implement methods in the `Client` model:
- `verify_secret()`: Validate client secret against stored hash
- `is_valid()`: Check if client is active and credentials are valid
- Class method for client lookup by client_id

### **4.2.3 Create database migration for client model**
Generate Flask-Alembic migration for the client credentials table with proper constraints and indexes.

### **4.2.4 Seed initial Chrome extension client credentials**
Create utility function or migration to seed initial client credentials for the Chrome extension with secure client_id and client_secret.

## **4.3 Implement OAuth2 Token Endpoint**

Create the OAuth2 client credentials token endpoint following RFC 6749 specification.

### **4.3.1 Create authentication blueprint**
Create `app/auth/__init__.py` and `app/auth/routes.py` with proper blueprint registration and URL prefix `/api/auth`.

### **4.3.2 Implement POST /api/auth/token endpoint**
Create token endpoint that accepts:
- `client_id`: Chrome extension client identifier
- `client_secret`: Client secret for validation
- `grant_type`: Must be "client_credentials"
Content-Type: application/x-www-form-urlencoded or application/json

### **4.3.3 Add client credentials validation logic**
Implement validation in `app/auth/validators.py`:
- Validate grant_type is "client_credentials"
- Lookup client by client_id
- Verify client_secret against stored hash
- Check client is active and valid

### **4.3.4 Implement JWT token generation**
Use Flask-JWT-Extended to generate JWT tokens with:
- Subject (sub): client_id
- Issued at (iat): current timestamp
- Expiration (exp): 1 hour from issuance
- Audience (aud): API identifier

### **4.3.5 Add proper OAuth2 error responses**
Implement standardized OAuth2 error responses:
- `invalid_client`: Invalid client credentials
- `unsupported_grant_type`: Grant type not supported
- `invalid_request`: Malformed request

## **4.4 Implement JWT Verification Decorators**

Create decorators and middleware for protecting API endpoints with JWT token validation.

### **4.4.1 Create JWT required decorator**
Create `app/auth/decorators.py` with `jwt_required` decorator that:
- Extracts JWT token from Authorization header
- Validates token signature and expiration
- Sets current client context for protected routes

### **4.4.2 Add token validation and error handling**
Implement comprehensive token validation:
- Token format validation (Bearer scheme)
- JWT signature verification
- Token expiration checking
- Client existence validation

### **4.4.3 Implement request context management**
Use Flask's request context to store validated client information for use in protected routes.

### **4.4.4 Add CORS handling for authenticated routes**
Ensure proper CORS headers are included in authentication responses for Chrome extension cross-origin requests.

## **4.5 Implement Comprehensive Testing**

Create thorough test coverage for all authentication functionality and OAuth2 flow scenarios.

### **4.5.1 Create authentication test fixtures**
Create pytest fixtures in `tests/auth/conftest.py`:
- Valid client credentials
- Test JWT tokens
- Authentication headers
- Mock client instances

### **4.5.2 Test OAuth2 token endpoint functionality**
Test `POST /api/auth/token` endpoint:
- Valid client credentials return proper JWT token
- Token response includes correct fields (access_token, token_type, expires_in)
- Generated tokens are valid and properly formatted

### **4.5.3 Test JWT verification and protection**
Test JWT verification decorator:
- Valid tokens allow access to protected routes
- Token validation extracts correct client information
- Request context properly set with client data

### **4.5.4 Test authentication error scenarios**
Test comprehensive error handling:
- Invalid client_id returns proper OAuth2 error
- Invalid client_secret returns authentication error
- Expired tokens return proper error response
- Missing Authorization header returns error
- Invalid grant_type returns unsupported_grant_type error 