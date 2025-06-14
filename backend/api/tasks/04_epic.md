# EPIC: [ ] 4 Implement API Key Authentication System and Remove OAuth2 Components

Replace OAuth2 client credentials flow with API Key-based authentication system. Remove all OAuth2/JWT-related code and dependencies, enhance the existing ApiClient model and authentication middleware, create proper database migrations, and implement comprehensive API key management for the Chrome extension client. This includes cleaning up JWT configuration, removing unused Flask-JWT-Extended components, and ensuring robust API key validation with proper error handling and security features.


## Relevant Files

- `app/models/api_client.py` - Contains the ApiClient model that needs API key generation method and enhanced functionality for secure API key management.
- `tests/models/test_api_client.py` - Unit tests for ApiClient model that need to be updated to include API key generation testing.
- `app/auth.py` - Contains the existing API key authentication decorator that needs to be enhanced with better error handling and security features.
- `tests/test_auth.py` - Authentication tests that need to be created/updated for API key-only authentication system.
- `app/extensions.py` - Flask extensions file that needs JWT components removed and cleaned up to focus on core extensions only.
- `app/config.py` - Configuration file that needs all JWT-related settings removed and replaced with API key-specific configurations.
- `tests/test_config.py` - Configuration tests that need JWT test cases removed and API key configuration tests added.
- `app/validators.py` - Validation utilities that need JWT validation methods removed and API key validation added.
- `tests/test_validators.py` - Validator tests that need JWT test cases removed and API key validation tests added.
- `requirements.txt` - Dependencies file that needs Flask-JWT-Extended removed from the project dependencies.
- `pyproject.toml` - Project configuration that needs JWT-related warnings and test configurations cleaned up.
- `generate_api_key.py` - CLI script for generating API keys that needs to be updated to use the enhanced ApiClient model.


## Notes

- API key authentication is simpler and more appropriate for the single Chrome extension client use case than JWT/OAuth2
- API keys should be cryptographically secure, randomly generated, and stored as hashed values in the database
- The existing `require_api_key` decorator should be enhanced with rate limiting, request logging, and better security features
- All JWT configuration and validation code must be completely removed to avoid confusion and reduce codebase complexity
- Database migrations may be needed if any JWT-related fields exist in the database schema
- The ApiClient model should include methods for secure API key generation, validation, and management
- Error responses should be consistent and informative without revealing sensitive information


## STORY and TASK Breakdown

- [x] 4.1 Remove JWT/OAuth2 Dependencies and Configuration
    - [x] 4.1.1 Remove Flask-JWT-Extended from requirements.txt
    - [x] 4.1.2 Remove JWT imports and initialization from app/extensions.py
    - [x] 4.1.3 Remove all JWT-related configuration from app/config.py
    - [x] 4.1.4 Clean up JWT test configurations from pyproject.toml
- [x] 4.2 Enhance ApiClient Model with API Key Generation
    - [x] 4.2.1 Add generate_api_key class method to ApiClient model
    - [x] 4.2.2 Add API key validation and security methods
    - [x] 4.2.3 Add API key hashing functionality for secure storage
    - [x] 4.2.4 Add rate limiting and usage tracking fields
- [x] 4.3 Udate Authentication Middleware and pSecurity
    - [x] 4.3.1 Enhance require_api_key decorator with better error handling
    - [x] 4.3.2 Add request logging and rate limiting capabilities
    - [x] 4.3.3 Implement secure API key comparison methods
    - [s] 4.3.4 Add authentication failure tracking and security features **SKIP**
- [x] 4.4 Remove JWT Validation and Clean Up Validators
    - [x] 4.4.1 Remove all JWT validation methods from app/validators.py
    - [s] 4.4.2 Add API key configuration validation **SKIP**
    - [x] 4.4.3 Remove JWT-related warning configurations
    - [s] 4.4.4 Add API key strength validation **SKIP**
- [ ] 4.5 Update Tests for API Key Authentication
    - [x] 4.5.1 Remove all JWT-related tests from test_config.py
    - [x] 4.5.2 Remove JWT validation tests from test_validators.py
    - [ ] 4.5.3 Update ApiClient model tests for new API key functionality
    - [ ] 4.5.4 Create comprehensive auth.py tests for API key authentication
- [ ] 4.6 Create Database Migration for JWT Cleanup
    - [ ] 4.6.1 Generate migration to remove any JWT-related database fields
    - [ ] 4.6.2 Ensure ApiClient table structure supports enhanced API key features
    - [ ] 4.6.3 Test migration rollback functionality
    - [ ] 4.6.4 Verify database integrity after migration


## STORY: **4.1 Remove JWT/OAuth2 Dependencies and Configuration**

Remove all JWT and OAuth2 related dependencies, imports, and configuration from the project to eliminate unnecessary complexity and focus on API key authentication.


### TASK: **4.1.1 Remove Flask-JWT-Extended from requirements.txt**

Remove the Flask-JWT-Extended>=4.6.0 dependency from requirements.txt as it's no longer needed for API key-based authentication.


### TASK: **4.1.2 Remove JWT imports and initialization from app/extensions.py**

Remove flask_jwt_extended imports and JWTManager initialization from the extensions file, along with all JWT configuration warnings and setup code.


### TASK: **4.1.3 Remove all JWT-related configuration from app/config.py**

Remove all JWT_* configuration variables from BaseConfig, DevelopmentConfig, TestingConfig, and ProductionConfig classes to clean up the configuration system.


### TASK: **4.1.4 Clean up JWT test configurations from pyproject.toml**

Remove JWT-related warning suppressions and test configurations from pyproject.toml to clean up the project configuration.


## STORY: **4.2 Enhance ApiClient Model with API Key Generation**

Enhance the ApiClient model with secure API key generation, validation, and management capabilities to support robust API key authentication.


### TASK: **4.2.1 Add generate_api_key class method to ApiClient model**

Implement a `generate_api_key()` class method that creates cryptographically secure, randomly generated API keys using appropriate security libraries.


### TASK: **4.2.2 Add API key validation and security methods**

Add methods for validating API key format, checking key strength, and implementing secure comparison operations to prevent timing attacks.


### TASK: **4.2.3 Add API key hashing functionality for secure storage**

Implement API key hashing using bcrypt or similar secure hashing algorithms to store hashed versions of API keys in the database instead of plain text.


### TASK: **4.2.4 Add rate limiting and usage tracking fields**

Add optional fields and methods for tracking API key usage, implementing rate limiting, and monitoring authentication attempts for security purposes.


## STORY: **4.3 Update Authentication Middleware and Security**

Enhance the existing API key authentication system with improved security features, error handling, and monitoring capabilities.


### TASK: **4.3.1 Enhance require_api_key decorator with better error handling**

**IMPLEMENTATION SCOPE:** Improve the existing `require_api_key` decorator with more robust error handling and consistent error responses.

**WHAT WILL BE IMPLEMENTED:**
- Better error handling with informative but secure error messages
- Consistent JSON error response format
- Proper logging of authentication attempts
- Fix critical bug where decorator looks for plain text API keys but model stores hashed ones

**WHAT WILL NOT BE IMPLEMENTED:**
- Security headers (not needed for API-only backend serving single Chrome extension client)
- Complex error categorization (overkill for toy project)


### TASK: **4.3.2 Add request logging and rate limiting capabilities**

**IMPLEMENTATION SCOPE:** Implement basic request logging for development monitoring and debugging purposes.

**WHAT WILL BE IMPLEMENTED:**
- Basic request logging for authentication attempts (success/failure)
- Simple logging using Python's standard logging module
- Log remote IP addresses for basic monitoring
- Update existing usage statistics in ApiClient model (last_used_at, use_count)

**WHAT WILL NOT BE IMPLEMENTED:**
- Rate limiting functionality (not needed since we control the only client - our Chrome extension)
- Complex logging infrastructure with external services
- Brute force attack prevention (controlled environment with single trusted client)
- Advanced monitoring and alerting systems

**RATIONALE:** This is a toy project with our own Chrome extension as the only client, so rate limiting and complex security monitoring are unnecessary overhead.

**IMPLEMENTATION PLAN:**

Looking at the current `app/auth.py`, I can see that basic logging has already been implemented in the `require_api_key` decorator. The current implementation includes:

1. **Already Implemented:**
   - Authentication success/failure logging with IP addresses
   - Usage statistics updates (last_used_at, use_count)
   - Error logging for database issues
   - Proper logging levels (INFO for success, WARNING for auth failures, ERROR for database issues)

2. **Missing Components to Complete Task:**
   - Enhanced logging configuration in Flask app
   - Request-level logging beyond just authentication
   - Structured logging format for better development debugging
   - Log rotation and file output configuration

**Step-by-Step Implementation Plan:**

**Step 1: Add Application-Level Request Logging**
- Create Flask `before_request` handler to log incoming requests
- Log: timestamp, IP address, HTTP method, request path, and user agent
- Create Flask `after_request` handler to log response information
- Log: response status code, response size (if available), and request completion

**Step 2: Add Debug-Level Logging for Development**
- Add DEBUG level logs for request parameters and headers (excluding sensitive data)
- Log query parameters for GET requests
- Log request body size for POST/PUT requests (not content for security)
- Add timing information for database operations in auth decorator

**Step 3: Update Tests**
- Test that new logging calls work correctly without breaking functionality
- Verify log messages contain expected information (IP, method, path, status)
- Test that sensitive information (API keys, request bodies) are not logged
- Ensure logging doesn't impact authentication performance

**Step 4: Verify Implementation**
- Test with actual API requests to verify logging output appears correctly
- Verify different log levels work appropriately in development vs testing
- Ensure logging provides useful debugging information for development
- Check that logs don't contain sensitive information

**Files to Modify:**
- `app/__init__.py` - Add global before_request and after_request handlers for ALL requests
- `tests/` - Add tests to verify request logging works correctly

This implementation focuses on adding useful logging calls within the existing logging framework, providing better visibility into request flow and authentication activity for development and debugging purposes.


### TASK: **4.3.3 Implement secure API key comparison methods**

**IMPLEMENTATION SCOPE:** Fix critical authentication bug and implement secure API key validation using the existing ApiClient model methods.

**WHAT WILL BE IMPLEMENTED:**
- Fix critical bug where decorator searches for plain text API keys but model stores hashed versions
- Use the existing `ApiClient.check_api_key()` method which implements secure bcrypt comparison
- Implement proper flow: retrieve client first, then validate API key using secure comparison
- Ensure timing-safe comparison operations to prevent timing attacks
- Update the decorator to work correctly with the enhanced ApiClient model from task 4.2

**RATIONALE:** This is a critical fix - the current authentication system is completely broken because it tries to match plain text keys against hashed storage. This must be implemented to have working authentication at all.

**IMPLEMENTATION PLAN:**

The core of this task is to refactor the `require_api_key` decorator in `app/auth.py` to use a secure, two-part API key system (`public_id.secret_key`) and perform a timing-attack-resistant comparison.

**Step 1: Analyze `ApiClient` Model and `require_api_key` Decorator**
- Review `app/models/api_client.py` to confirm that the model, as implemented in Story 4.2, includes:
    - A `public_id` field (e.g., `db.Column(db.String, unique=True, nullable=False)`) for safe client lookups.
    - The `api_key_hash` field to store the hashed secret.
    - A `check_api_key(secret_key)` method that uses a secure comparison function like `bcrypt.checkpw()`.
- Review `app/auth.py` and identify the current `require_api_key` decorator, which likely contains the flawed logic: `ApiClient.query.filter_by(api_key=api_key, ...)`.

**Step 2: Refactor `require_api_key` Decorator**
- Modify the decorator to implement the following logic:
    1. Retrieve the full key from the `X-API-Key` header.
    2. Check if the key exists and is in the format `<public_id>.<secret_key>`. Return a 401 error with a generic message if not.
    3. Parse the key to extract `public_id` and `secret_key`.
    4. Query the database for an active client using the `public_id`:
       ```python
       client = ApiClient.query.filter_by(public_id=public_id, is_active=True).first()
       ```
    5. If no client is found, return a 401 error.
    6. Call the secure comparison method: `if client and client.check_api_key(secret_key):`.
    7. If the check passes, attach the client object to Flask's request context for use in downstream logic: `g.api_client = client`.
    8. If the check fails, return a 401 error.

**Step 3: Update `generate_api_key.py` Script**
- The CLI script from task 4.2.1 must be adjusted to ensure it outputs the full, user-facing API key in the `public_id.secret_key` format. The user should only ever see this combined key.

**Step 4: Update Unit Tests in `tests/test_auth.py`**
- Create or update tests for the `require_api_key` decorator to cover all scenarios:
    - **Success:** A valid `X-API-Key` provides access.
    - **Failure (401 Unauthorized):**
        - Missing `X-API-Key` header.
        - Malformed key (e.g., missing `.`, empty parts).
        - Unknown `public_id`.
        - Correct `public_id` but incorrect `secret_key`.
        - Client is marked as inactive (`is_active=False`).
    - **Context:** Verify that `g.api_client` is correctly populated with the `ApiClient` object on successful authentication.

**Step 5: Verify Implementation**
- Run all tests, including linting and formatting checks, to ensure the changes are correct and adhere to code quality standards.
- Manually test the authentication flow using an API client like Postman or `curl` to confirm the end-to-end functionality.


### TASK: **4.3.4 Add authentication failure tracking and security features**

**IMPLEMENTATION SCOPE:** SKIPPED - Not needed for toy project with controlled client environment.

**WHAT WILL NOT BE IMPLEMENTED:**
- Failed authentication attempt tracking
- Temporary account lockouts for suspicious activity
- Brute force attack detection
- Complex security monitoring and alerting
- IP-based blocking or throttling
- Security event storage and analysis

**RATIONALE:** This is a toy project where we control the only client (our Chrome extension). These enterprise-level security features would be overkill and add unnecessary complexity. Simple logging in 4.3.2 provides sufficient visibility for development purposes. If this becomes a production system with multiple clients, these features can be added later.


## STORY: **4.4 Remove JWT Validation and Clean Up Validators**

Remove all JWT-related validation code from the validators module and replace with API key-specific validation functionality.

✅ Complete - All JWT validation code removed and test references cleaned up


### TASK: **4.4.1 Remove all JWT validation methods from app/validators.py**

Remove `validate_jwt_config()` method and all related JWT validation logic from the ConfigValidator class.

✅ Complete - No JWT validation methods found in `app/validators.py`. All JWT validation logic has been successfully removed.


### TASK: **4.4.2 Add API key configuration validation**

Add validation methods for API key-related configuration settings to ensure proper security configuration.

🚫 SKIPPED - No API key configuration variables exist in the application. API key functionality is handled entirely at the model/authentication level (ApiClient model + auth decorator), not through application configuration, so there are no API key-related settings to validate.


### TASK: **4.4.3 Remove JWT-related warning configurations**

Remove all JWT-related warning and error message configurations from the validator system.

✅ Complete - All JWT-related warning configurations have been removed from the validator system. Cleaned up remaining JWT references in test documentation.


### TASK: **4.4.4 Add API key strength validation**

Implement validation for API key strength requirements and security best practices in configuration.

🚫 SKIPPED - No API key configuration exists in `app/config.py` to validate. API key strength validation is handled in the ApiClient model's `generate_api_key()` method using cryptographically secure random generation, not through configuration validation.


## STORY: **4.5 Update Tests for API Key Authentication**

Update all test files to remove JWT-related tests and add comprehensive testing for the new API key authentication system.


### TASK: **4.5.1 Remove all JWT-related tests from test_config.py**

Remove TestJWTExtensionIntegration class and all JWT configuration tests from the configuration test file.


### TASK: **4.5.2 Remove JWT validation tests from test_validators.py**

Remove TestValidateJwtConfig class and all JWT validation test methods from the validators test file.


### TASK: **4.5.3 Update ApiClient model tests for new API key functionality**

Add comprehensive tests for the new API key generation, validation, and security methods in the ApiClient model.


### TASK: **4.5.4 Create comprehensive auth.py tests for API key authentication**

Create or enhance tests for the authentication middleware, covering all security features, error handling, and edge cases.


## STORY: **4.6 Create Database Migration for JWT Cleanup**

Ensure the database schema is properly updated to support the enhanced API key system and remove any JWT-related artifacts.


### TASK: **4.6.1 Generate migration to remove any JWT-related database fields**

Create a database migration to remove any JWT-related fields if they exist in the current schema.


### TASK: **4.6.2 Ensure ApiClient table structure supports enhanced API key features**

Verify that the api_clients table has all necessary fields for the enhanced API key functionality, adding fields if needed.


### TASK: **4.6.3 Test migration rollback functionality**

Ensure that the migration can be safely rolled back without data loss or corruption.


### TASK: **4.6.4 Verify database integrity after migration**

Test the database integrity and ensure all constraints and relationships remain valid after the migration. 