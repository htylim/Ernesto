# [ ] 4 Implement API Key Authentication System and Remove OAuth2 Components

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

## Tasks

- [x] 4.1 Remove JWT/OAuth2 Dependencies and Configuration
    - [x] 4.1.1 Remove Flask-JWT-Extended from requirements.txt
    - [x] 4.1.2 Remove JWT imports and initialization from app/extensions.py
    - [x] 4.1.3 Remove all JWT-related configuration from app/config.py
    - [x] 4.1.4 Clean up JWT test configurations from pyproject.toml
- [ ] 4.2 Enhance ApiClient Model with API Key Generation
    - [ ] 4.2.1 Add generate_api_key class method to ApiClient model
    - [ ] 4.2.2 Add API key validation and security methods
    - [ ] 4.2.3 Add API key hashing functionality for secure storage
    - [ ] 4.2.4 Add rate limiting and usage tracking fields
- [ ] 4.3 Update Authentication Middleware and Security
    - [ ] 4.3.1 Enhance require_api_key decorator with better error handling
    - [ ] 4.3.2 Add request logging and rate limiting capabilities
    - [ ] 4.3.3 Implement secure API key comparison methods
    - [ ] 4.3.4 Add authentication failure tracking and security features
- [ ] 4.4 Remove JWT Validation and Clean Up Validators
    - [ ] 4.4.1 Remove all JWT validation methods from app/validators.py
    - [ ] 4.4.2 Add API key configuration validation
    - [ ] 4.4.3 Remove JWT-related warning configurations
    - [ ] 4.4.4 Add API key strength validation
- [ ] 4.5 Update Tests for API Key Authentication
    - [ ] 4.5.1 Remove all JWT-related tests from test_config.py
    - [ ] 4.5.2 Remove JWT validation tests from test_validators.py
    - [ ] 4.5.3 Update ApiClient model tests for new API key functionality
    - [ ] 4.5.4 Create comprehensive auth.py tests for API key authentication
- [ ] 4.6 Create Database Migration for JWT Cleanup
    - [ ] 4.6.1 Generate migration to remove any JWT-related database fields
    - [ ] 4.6.2 Ensure ApiClient table structure supports enhanced API key features
    - [ ] 4.6.3 Test migration rollback functionality
    - [ ] 4.6.4 Verify database integrity after migration

## **4.1 Remove JWT/OAuth2 Dependencies and Configuration**

Remove all JWT and OAuth2 related dependencies, imports, and configuration from the project to eliminate unnecessary complexity and focus on API key authentication.

### **4.1.1 Remove Flask-JWT-Extended from requirements.txt**
Remove the Flask-JWT-Extended>=4.6.0 dependency from requirements.txt as it's no longer needed for API key-based authentication.

### **4.1.2 Remove JWT imports and initialization from app/extensions.py**
Remove flask_jwt_extended imports and JWTManager initialization from the extensions file, along with all JWT configuration warnings and setup code.

### **4.1.3 Remove all JWT-related configuration from app/config.py**
Remove all JWT_* configuration variables from BaseConfig, DevelopmentConfig, TestingConfig, and ProductionConfig classes to clean up the configuration system.

### **4.1.4 Clean up JWT test configurations from pyproject.toml**
Remove JWT-related warning suppressions and test configurations from pyproject.toml to clean up the project configuration.

## **4.2 Enhance ApiClient Model with API Key Generation**

Enhance the ApiClient model with secure API key generation, validation, and management capabilities to support robust API key authentication.

### **4.2.1 Add generate_api_key class method to ApiClient model**
Implement a `generate_api_key()` class method that creates cryptographically secure, randomly generated API keys using appropriate security libraries.

### **4.2.2 Add API key validation and security methods**
Add methods for validating API key format, checking key strength, and implementing secure comparison operations to prevent timing attacks.

### **4.2.3 Add API key hashing functionality for secure storage**
Implement API key hashing using bcrypt or similar secure hashing algorithms to store hashed versions of API keys in the database instead of plain text.

### **4.2.4 Add rate limiting and usage tracking fields**
Add optional fields and methods for tracking API key usage, implementing rate limiting, and monitoring authentication attempts for security purposes.

## **4.3 Update Authentication Middleware and Security**

Enhance the existing API key authentication system with improved security features, error handling, and monitoring capabilities.

### **4.3.1 Enhance require_api_key decorator with better error handling**
Improve the existing `require_api_key` decorator with more robust error handling, consistent error responses, and proper security headers.

### **4.3.2 Add request logging and rate limiting capabilities**
Implement request logging for authentication attempts and add rate limiting functionality to prevent abuse and brute force attacks.

### **4.3.3 Implement secure API key comparison methods**
Use secure comparison functions that prevent timing attacks when validating API keys against stored hashed values.

### **4.3.4 Add authentication failure tracking and security features**
Implement tracking of failed authentication attempts and security features like temporary account lockouts for suspicious activity.

## **4.4 Remove JWT Validation and Clean Up Validators**

Remove all JWT-related validation code from the validators module and replace with API key-specific validation functionality.

### **4.4.1 Remove all JWT validation methods from app/validators.py**
Remove `validate_jwt_config()` method and all related JWT validation logic from the ConfigValidator class.

### **4.4.2 Add API key configuration validation**
Add validation methods for API key-related configuration settings to ensure proper security configuration.

### **4.4.3 Remove JWT-related warning configurations**
Remove all JWT-related warning and error message configurations from the validator system.

### **4.4.4 Add API key strength validation**
Implement validation for API key strength requirements and security best practices in configuration.

## **4.5 Update Tests for API Key Authentication**

Update all test files to remove JWT-related tests and add comprehensive testing for the new API key authentication system.

### **4.5.1 Remove all JWT-related tests from test_config.py**
Remove TestJWTExtensionIntegration class and all JWT configuration tests from the configuration test file.

### **4.5.2 Remove JWT validation tests from test_validators.py**
Remove TestValidateJwtConfig class and all JWT validation test methods from the validators test file.

### **4.5.3 Update ApiClient model tests for new API key functionality**
Add comprehensive tests for the new API key generation, validation, and security methods in the ApiClient model.

### **4.5.4 Create comprehensive auth.py tests for API key authentication**
Create or enhance tests for the authentication middleware, covering all security features, error handling, and edge cases.

## **4.6 Create Database Migration for JWT Cleanup**

Ensure the database schema is properly updated to support the enhanced API key system and remove any JWT-related artifacts.

### **4.6.1 Generate migration to remove any JWT-related database fields**
Create a database migration to remove any JWT-related fields if they exist in the current schema.

### **4.6.2 Ensure ApiClient table structure supports enhanced API key features**
Verify that the api_clients table has all necessary fields for the enhanced API key functionality, adding fields if needed.

### **4.6.3 Test migration rollback functionality**
Ensure that the migration can be safely rolled back without data loss or corruption.

### **4.6.4 Verify database integrity after migration**
Test the database integrity and ensure all constraints and relationships remain valid after the migration. 