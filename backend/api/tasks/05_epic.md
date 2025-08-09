# EPIC: [ ] 5. Implement CORS Configuration for Chrome Extension

Install Flask-CORS dependency and configure comprehensive cross-origin resource sharing for Chrome extension client access. Set up environment-specific allowed origins configuration in BaseConfig classes (development: localhost patterns, production: extension-id patterns), implement proper preflight request handling for OPTIONS requests, and configure appropriate CORS headers (Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers). Include Chrome extension-specific origin patterns (chrome-extension://), credential handling configuration, and secure CORS policies with restrictive origin validation for production deployment. Add CORS configuration validation and comprehensive testing for cross-origin scenarios.


## Relevant Files

- `requirements.txt` - Add Flask-CORS dependency for cross-origin resource sharing support.
- `app/config.py` - Add CORS-specific configuration settings to BaseConfig and environment-specific classes for allowed origins, headers, and methods.
- `app/extensions.py` - Initialize and configure Flask-CORS extension with the Flask application factory pattern.
- `app/__init__.py` - Integrate CORS configuration into the application factory during extension initialization.
- `tests/test_config.py` - Unit tests for CORS configuration validation across different environments.
- `tests/test_cors.py` - Comprehensive integration tests for CORS functionality including preflight requests, origin validation, and Chrome extension scenarios.
- `tests/test_extensions.py` - Tests for proper CORS extension initialization and configuration within the application factory.


## Notes

- Chrome extensions use `chrome-extension://` protocol with unique extension IDs in production
- Development environment should allow localhost origins for testing
- CORS preflight requests (OPTIONS) must be handled properly for all API endpoints
- Production CORS configuration must be restrictive and validate specific extension origins
- All CORS configuration should be environment-specific and testable
- Flask-CORS integrates seamlessly with Flask application factory pattern


## STORY and TASK Breakdown

- [x] 5.1 Add Flask-CORS Dependency and Basic Configuration
    - [x] 5.1.1 Add Flask-CORS to requirements.txt
    - [x] 5.1.2 Add CORS configuration variables to BaseConfig
    - [x] 5.1.3 Configure environment-specific CORS settings
    - [x] 5.1.4 Create unit tests for CORS configuration
- [x] 5.2 Implement CORS Extension Integration
    - [x] 5.2.1 Initialize Flask-CORS in extensions.py
    - [x] 5.2.2 Configure CORS headers and methods
    - [x] 5.2.3 Integrate CORS with application factory
    - [x] 5.2.4 Create unit tests for CORS extension integration
- [ ] 5.3 Implement Environment-Specific Origin Validation
    - [x] 5.3.1 Configure development CORS origins for localhost
    - [x] 5.3.2 Configure production CORS origins for Chrome extension
    - [x] 5.3.3 Add CORS configuration validation
    - [ ] 5.3.4 Create integration tests for origin validation and preflight requests


## STORY: **5.1 Add Flask-CORS Dependency and Basic Configuration**

As a Chrome extension developer, I want the API server to support CORS so that my extension can make cross-origin requests to the API endpoints.

**Acceptance Criteria:**
- Flask-CORS dependency is added to requirements.txt
- BaseConfig class includes CORS-related configuration variables
- Each environment (development, testing, production) has appropriate CORS settings
- CORS configuration follows Flask best practices and integrates with existing config system
- Configuration validation includes CORS settings verification
- Unit tests verify CORS configuration loading and validation across all environments


### Implementation Plan

This story will be implemented across four tasks, covering the addition of the `Flask-CORS` dependency, configuration setup, and testing.

### TASK: **5.1.1 Add Flask-CORS to requirements.txt**

Add the Flask-CORS dependency to the project's requirements.txt file to enable cross-origin resource sharing support for the Chrome extension client.

**Technical Implementation:**
1. **Modify `requirements.txt`**:
   - Add `Flask-CORS==6.0.1` to the `requirements.txt` file to include the necessary package for handling Cross-Origin Resource Sharing.

### TASK: **5.1.2 Add CORS configuration variables to BaseConfig**

Extend the BaseConfig class in `app/config.py` to include CORS-related configuration variables that will be inherited by all environment-specific configuration classes.

**Technical Implementation:**
1. **Edit `app/config.py`**:
   - In the `BaseConfig` class, add the following configuration variables with sensible defaults:
     - `CORS_ORIGINS`: An empty list `[]`. This will hold the list of allowed origins.
     - `CORS_METHODS`: A list of common HTTP methods, e.g., `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`.
     - `CORS_HEADERS`: A list of allowed headers, e.g., `["Content-Type", "X-API-Key"]`.
     - `CORS_SUPPORTS_CREDENTIALS`: `False`, as the API key authentication does not rely on cookies or traditional credentials.

### TASK: **5.1.3 Configure environment-specific CORS settings**

Configure appropriate CORS settings for each environment class (DevelopmentConfig, TestingConfig, ProductionConfig) with environment-appropriate allowed origins, headers, and methods.

**Technical Implementation:**
1. **Edit `app/config.py`**:
   - **`DevelopmentConfig`**:
     - Override `CORS_ORIGINS` with a list of patterns suitable for local development, such as `[r"http://localhost:.*", r"http://127.0.0.1:.*"]`. This will allow requests from any port on localhost.
   - **`TestingConfig`**:
     - `CORS_ORIGINS` will remain an empty list `[]`. Tests that require specific CORS origins can override this setting.
   - **`ProductionConfig`**:
     - `CORS_ORIGINS` will remain an empty list `[]`. This will be populated in Story 5.3 with the specific Chrome extension origin(s). This ensures a secure-by-default policy.

### TASK: **5.1.4 Create unit tests for CORS configuration**

Create comprehensive unit tests in `tests/test_config.py` to verify CORS configuration loading, validation, and environment-specific settings for all configuration classes.

**Technical Implementation:**
1. **Create/Modify `tests/test_config.py`**:
   - Add a new test class or extend an existing one to verify the CORS configuration.
   - **`test_development_config_cors`**:
     - Create a Flask app with `DevelopmentConfig`.
     - Assert that `app.config["CORS_ORIGINS"]` matches the expected development patterns.
     - Assert that other `CORS_*` settings are correctly loaded.
   - **`test_testing_config_cors`**:
     - Create a Flask app with `TestingConfig`.
     - Assert that `app.config["CORS_ORIGINS"]` is an empty list.
   - **`test_production_config_cors`**:
     - Create a Flask app with `ProductionConfig`.
     - Assert that `app.config["CORS_ORIGINS"]` is an empty list, enforcing the secure-by-default policy.


## STORY: **5.2 Implement CORS Extension Integration**

As a system administrator, I want CORS to be properly initialized and configured within the Flask application factory pattern so that cross-origin requests are handled consistently across all environments.

**Acceptance Criteria:**
- Flask-CORS extension is initialized in app/extensions.py following existing pattern
- CORS configuration supports all required HTTP methods (GET, POST, PUT, DELETE, OPTIONS)
- Appropriate CORS headers are configured (Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers)
- CORS extension integrates seamlessly with existing application factory
- Preflight OPTIONS requests are handled automatically by Flask-CORS
- Unit tests verify CORS extension initialization and configuration

### Implementation Plan

This story implements Flask-CORS extension integration following the existing Flask application factory pattern observed in the project. The implementation will follow the same patterns used by existing extensions (SQLAlchemy, Alembic, Marshmallow) in `app/extensions.py` and integrate with the application factory in `app/__init__.py`.

#### Prerequisites Validation
- ✅ Flask-CORS==6.0.1 already added to `requirements.txt` (Task 5.1.1)
- ✅ CORS configuration variables already added to `BaseConfig` (Task 5.1.2)
- ✅ Environment-specific CORS settings already configured (Task 5.1.3)

#### Task 5.2.1: Initialize Flask-CORS in extensions.py

**Technical Implementation:**
1. **Import Flask-CORS in `app/extensions.py`**:
   - Add `from flask_cors import CORS` import at the top with other extension imports
   - Follow the same import pattern as existing extensions

2. **Create CORS extension instance**:
   - Add `cors = CORS()` instance creation following the pattern of `db = SQLAlchemy()`, `alembic = Alembic()`, `ma = Marshmallow()`
   - Add comprehensive docstring explaining CORS purpose

3. **Update `init_extensions()` function**:
   - Add `cors.init_app(app)` call in the appropriate order
   - Position after `db.init_app(app)` and before `alembic.init_app(app)` to follow dependency order
   - CORS should be initialized early but after database setup

**Expected Code Changes:**
```python
# Add to imports section
from flask_cors import CORS

# Add after other extension instances
cors = CORS()

# Add to init_extensions() function
cors.init_app(app)
```

#### Task 5.2.2: Configure CORS headers and methods

**Technical Implementation:**
1. **Update Flask-CORS initialization in `init_extensions()` function**:
   - Configure CORS with settings from Flask config during initialization
   - Use the correct Flask-CORS parameter names
   - Ensure all required headers and methods are properly configured

2. **CORS Configuration Pattern**:
   - Configure CORS during initialization rather than in separate configure step
   - Map Flask config variables to correct Flask-CORS parameters:
     - `CORS_ORIGINS` → `origins` parameter
     - `CORS_METHODS` → `methods` parameter  
     - `CORS_HEADERS` → `allow_headers` parameter (corrected from previous)
     - `CORS_SUPPORTS_CREDENTIALS` → `supports_credentials` parameter

**Expected Code Changes:**
```python
def init_extensions(app: "Flask") -> None:
    # ... existing SQLAlchemy initialization ...
    
    # Initialize CORS with configuration from Flask config
    cors.init_app(app,
        origins=app.config.get('CORS_ORIGINS', []),
        methods=app.config.get('CORS_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
        allow_headers=app.config.get('CORS_HEADERS', ['Content-Type', 'X-API-Key']),
        supports_credentials=app.config.get('CORS_SUPPORTS_CREDENTIALS', False)
    )
    
    # Log CORS configuration for debugging
    if app.config.get('DEBUG'):
        app.logger.debug(f"CORS origins configured: {app.config.get('CORS_ORIGINS', [])}")
```

#### Task 5.2.3: Integrate CORS with application factory

**Technical Implementation:**
1. **Verify integration in `app/__init__.py`**:
   - Confirm that `_init_extensions()` function already calls `init_extensions()` from extensions module
   - No changes needed to `__init__.py` since CORS is now configured during initialization
   - Remove any references to separate `configure_extensions()` call for CORS

2. **Validate integration order**:
   - Ensure CORS is initialized after configuration is loaded but before route registration
   - Verify CORS configuration is applied during extension initialization phase

**Validation Steps:**
- CORS extension will be automatically integrated through existing `_init_extensions()` call
- Configuration will be applied during `cors.init_app()` call in `init_extensions()`
- No additional changes needed to application factory since configuration is handled during initialization
- Verify that CORS headers are present in HTTP responses during testing

#### Task 5.2.4: Create unit tests for CORS extension integration

**Technical Implementation:**
1. **Create `tests/test_extensions.py`** (if it doesn't exist):
   - Test CORS extension initialization with configuration parameters
   - Test CORS configuration loading from Flask config
   - Test CORS integration with application factory

2. **Test Cases (Updated)**:
   - **`test_cors_extension_initialization`**: Verify CORS instance is created and initialized with config
   - **`test_cors_configuration_loading`**: Verify CORS settings are loaded from Flask config during init
   - **`test_cors_integration_with_app_factory`**: Verify CORS is properly configured in application factory
   - **`test_cors_debug_logging`**: Verify debug logging works correctly in development

**Expected Test Structure:**
```python
def test_cors_extension_initialization(app):
    """Test that CORS extension is properly initialized with configuration."""
    from app.extensions import cors
    assert cors is not None
    # Verify CORS is configured with settings from Flask config
    
def test_cors_configuration_loading(app):
    """Test that CORS settings are loaded from Flask config during initialization."""
    # Test with different config values
    # Verify correct parameter mapping
    
def test_cors_integration_with_app_factory():
    """Test CORS integration with application factory pattern."""
    # Test creating app and verify CORS headers are present in responses
    # Test with different environment configurations
    
def test_cors_debug_logging(app, caplog):
    """Test CORS debug logging in development environment."""
    # Verify debug logging outputs correct CORS configuration
```

#### Implementation Standards

**Code Quality Requirements:**
1. **Type Hints**: Add proper type hints following existing patterns in `extensions.py`
2. **Documentation**: Add comprehensive docstrings for all new functions and variables
3. **Import Organization**: Maintain alphabetical import order and proper sectioning
4. **Error Handling**: Include proper error handling and logging for CORS configuration issues

**Testing Requirements:**
1. **Unit Tests**: All new functions must have corresponding unit tests
2. **Integration Tests**: Verify CORS works with application factory pattern
3. **Configuration Tests**: Test CORS with different environment configurations (dev, test, prod)

**Security Considerations (Updated):**
1. **Origin Validation**: Ensure CORS origins are properly validated from configuration
2. **Default Security**: Maintain secure defaults (empty origins list in production)
3. **Header Security**: Only allow necessary headers, avoid wildcard configurations
4. **Chrome Extension Origins**: 
   - Development: Use `["http://localhost:*", "http://127.0.0.1:*"]` for testing
   - Production: Use specific extension ID `["chrome-extension://your-extension-id"]`
   - Never use `["*"]` in production environments
5. **Credentials Handling**: Set `supports_credentials=False` since API key auth doesn't require cookies

**Performance Considerations:**
1. **Initialization Order**: CORS initialized early but after database setup
2. **Configuration Caching**: CORS configuration loaded once during app initialization  
3. **Request Processing**: Flask-CORS handles preflight requests efficiently
4. **Debug Logging**: Include debug logging for CORS configuration in development

### Summary of Best Practice Updates

**Key Corrections Made Based on Industry Research:**

1. **Configuration Timing**: Changed from separate `configure_extensions()` step to configuration during `cors.init_app()` initialization - this follows the standard Flask-CORS pattern.

2. **Parameter Name Correction**: Fixed `CORS_HEADERS` → `allow_headers` parameter mapping (was incorrectly listed as `headers`).

3. **Chrome Extension Origins**: Clarified that production should use specific extension IDs like `["chrome-extension://your-extension-id"]` rather than regex patterns.

4. **Security Defaults**: Emphasized secure-by-default approach with empty origins lists in production and explicit credential handling configuration.

5. **Debug Logging**: Added debug logging for CORS configuration to aid in development and troubleshooting.

This updated implementation plan now follows current Flask-CORS best practices as confirmed by official documentation and industry usage patterns.


## STORY: **5.3 Implement Environment-Specific Origin Validation**

As a security engineer, I want CORS origins to be strictly validated based on the deployment environment so that only authorized clients can access the API while maintaining development flexibility.

**Acceptance Criteria:**
- Development environment allows localhost and development server origins
- Testing environment allows test-specific origins
- Production environment restricts origins to specific Chrome extension IDs
- Chrome extension origin patterns (chrome-extension://) are properly supported
- CORS configuration validation prevents security misconfigurations
- Origin validation is restrictive by default in production
- Integration tests verify origin validation and preflight request handling for all environments

### TASK: **5.3.1 Configure development CORS origins for localhost**

Set up development-specific CORS origins in DevelopmentConfig to allow localhost and development server patterns for local Chrome extension testing and development workflows.

#### Implementation Plan

- Assumptions:
  - Development clients run on http, not https (e.g., `http://localhost:3000`, `http://127.0.0.1:8080`).
  - No need to allow `chrome-extension://` origins in development; localhost is sufficient for dev workflows.

- Steps:
  1. Validate current configuration in `app/config.py`:
     - Ensure `DevelopmentConfig.__init__` sets `self.CORS_ORIGINS = [r"http://localhost:.*", r"http://127.0.0.1:.*"]`.
     - Keep default CORS settings from `BaseConfig` as-is: `CORS_METHODS`, `CORS_HEADERS`, `CORS_SUPPORTS_CREDENTIALS`.
  2. Decide on https localhost support:
     - If dev clients use https locally, extend origins to include `r"https://localhost:.*"` and `r"https://127.0.0.1:.*"` and update tests accordingly. Otherwise, leave as-is to avoid over-permissive defaults.
  3. Confirm Flask-CORS wiring in `app/extensions.py`:
     - `cors.init_app(app, origins=app.config.get("CORS_ORIGINS"), methods=..., allow_headers=..., supports_credentials=...)` already maps correctly; no change required.
  4. Tests:
     - Keep `tests/test_config.py::test_development_config_cors` aligned with the configured patterns. If https variants are added, update expected list to match.
  5. Manual validation (local):
     - Run app with development config and issue requests with headers:
       - `Origin: http://localhost:3000` → expect `Access-Control-Allow-Origin: http://localhost:3000` in responses.
       - `Origin: http://127.0.0.1:8080` → expect same echo behavior.
       - `Origin: http://evil.com` → expect no CORS allow-origin header.

- Definition of Done:
  - `DevelopmentConfig` contains localhost and 127.0.0.1 regex origins (and https variants only if required).
  - Existing unit tests pass (`pytest -k test_development_config_cors`). Update tests only if origins list changes.
  - Manual spot-check confirms CORS behavior for allowed and disallowed origins.

### TASK: **5.3.2 Configure production CORS origins for Chrome extension**

Configure production CORS origins in ProductionConfig to restrict access to specific Chrome extension ID patterns using chrome-extension:// protocol for secure production deployment.

#### Implementation Plan

- Assumptions:
  - The Chrome extension uses one or more stable extension IDs in production.
  - We will not hardcode IDs; they must be provided via environment variables at deploy time.
  - Secure-by-default remains: if no IDs are provided, `CORS_ORIGINS` stays empty.

- Changes:
  1. `app/config.py` (ProductionConfig.__init__):
     - Read env var `CHROME_EXTENSION_IDS` (comma-separated list). Example: `CHROME_EXTENSION_IDS=abcdefghijklmnopabcdefghijklmnop,zyxwvutsrqponmlkjihgfedcbaabcd`.
     - Parse into list of IDs, strip whitespace, ignore empties.
     - Build `self.CORS_ORIGINS = [f"chrome-extension://{ext_id}"]` for each parsed ID.
     - Leave other `CORS_*` settings inherited.
     - Do NOT add format validation here beyond trimming; strong validation will be covered by Task 5.3.3.

  2. Config mapping behavior:
     - No change to `get_config()`; it will automatically pick up the new origins via ProductionConfig instance.

  3. Documentation:
     - Add brief note in `/README.md` under Configuration & Deployment about `CHROME_EXTENSION_IDS` for production.

- Unit Tests (config-only; integration tests are Task 5.3.4):
  - Update `tests/test_config.py` with new cases in `TestProductionConfig`:
    - `test_production_config_cors_default_empty`: ensure empty by default (existing test already verifies this; keep it).
    - `test_production_config_cors_with_extension_ids`:
      - Patch env with `CHROME_EXTENSION_IDS` containing one ID → `CORS_ORIGINS == ["chrome-extension://<id>"]`.
    - `test_production_config_cors_with_multiple_extension_ids`:
      - Patch env with two comma-separated IDs → `CORS_ORIGINS` contains both, order preserved.
    - `test_production_config_cors_ignores_empty_items`:
      - Patch env `" id1 , , id2  "` → empties ignored, whitespace trimmed.

- Manual Validation (production-like):
  - Start app with `FLASK_ENV=production`, `SECRET_KEY`, `DATABASE_URI`, and `CHROME_EXTENSION_IDS` set.
  - Send request with header `Origin: chrome-extension://<valid-id>` → expect `Access-Control-Allow-Origin: chrome-extension://<valid-id>`.
  - Send request with `Origin: chrome-extension://<invalid-id>` or `https://example.com` → expect no allow-origin header.

- Edge Cases:
  - If `CHROME_EXTENSION_IDS` unset or empty → `CORS_ORIGINS == []` (no origins allowed).
  - Duplicate IDs → de-dup not required but harmless; keep order as provided.
  - Uppercase IDs: Chrome IDs are lowercase; for now we do not coerce case. Validation/normalization will be handled in Task 5.3.3.

- Definition of Done:
  - Production config dynamically builds `CORS_ORIGINS` from `CHROME_EXTENSION_IDS` env var.
  - Existing tests still pass; new tests for Production CORS with extension IDs added and passing.
  - README updated to document the env var usage for deployment.

### TASK: **5.3.3 Add CORS configuration validation**

Extend the existing configuration validation system to include CORS settings verification, ensuring that CORS origins, methods, and headers are properly configured for each environment.

#### Implementation Plan

- Objectives:
  - Enforce secure CORS defaults, especially in production.
  - Prevent wildcard or http(s) origins in production.
  - Validate Chrome extension IDs format for production origins.

- Changes:
  1. `app/validators.py`:
     - Add new method `validate_cors_config(self) -> None` to `ConfigValidator` that:
       - Always disallows wildcard origins (`"*"`) as an error in production; warning in dev/test.
       - Always disallows wildcard headers (`"*"`) as an error in production; warning in dev/test.
       - Requires `"OPTIONS"` to be present in `CORS_METHODS` (error if missing in any env).
       - Production rules (DEBUG=False and TESTING=False):
         - `CORS_ORIGINS` must be non-empty.
         - Every origin must start with `chrome-extension://`.
         - Extract the ID part and validate it matches `^[a-p]{32}$` (Chrome extension ID charset and length).
         - `CORS_SUPPORTS_CREDENTIALS` must be False.
         - `CORS_HEADERS` must be a subset of `["Content-Type", "X-API-Key"]` (no `Authorization`, no `*`).
       - Development rules (DEBUG=True):
         - If `CORS_ORIGINS` present, they should match localhost patterns only:
           - Allow strings or regex patterns like `http://localhost:*`, `http://127.0.0.1:*`, or their `r"...:.*"` regex equivalents. Non-localhost origins → warning.
       - Testing rules (TESTING=True): keep permissive with warnings only.
     - Call `self.validate_cors_config()` from `validate_all()` after `validate_application_config()` and before `validate_environment_specific()`.

  2. Validation messages:
     - Use clear, actionable messages, e.g.,
       - "CORS_ORIGINS cannot be empty in production"
       - "Invalid production CORS origin: {origin}. Only chrome-extension://<32 a-p chars> allowed"
       - "CORS_SUPPORTS_CREDENTIALS must be False in production"
       - "CORS_HEADERS must only include: Content-Type, X-API-Key"

- Unit Tests:
  1. Update existing production validator tests in `tests/test_validators.py`:
     - `test_validate_environment_specific_production`: patch env to include `CHROME_EXTENSION_IDS` and assert no errors.
  2. Add new tests in `tests/test_validators.py` under a new class `TestValidateCorsConfig`:
     - `test_prod_cors_missing_ids_is_error`: Production config with no `CHROME_EXTENSION_IDS` → `validate_all()` raises ConfigurationError or returns error for empty `CORS_ORIGINS`.
     - `test_prod_cors_invalid_origin_scheme_is_error`: Force `config.CORS_ORIGINS=["https://example.com"]` → error about invalid production origin.
     - `test_prod_cors_invalid_extension_id_is_error`: Set `CHROME_EXTENSION_IDS` to `badid` (or inject bad origin on config) → ID regex failure.
     - `test_prod_cors_wildcard_origin_is_error`: `CORS_ORIGINS=["*"]` → error.
     - `test_prod_cors_headers_restricted`: Add `Authorization` to headers → error; only `Content-Type`, `X-API-Key` allowed.
     - `test_prod_cors_supports_credentials_false`: If `CORS_SUPPORTS_CREDENTIALS=True` → error.
     - `test_cors_methods_require_options`: Remove `OPTIONS` from methods → error in any env.
     - `test_dev_cors_localhost_patterns_warning_only`: In dev, add `https://example.com` origin → warning (not error).

- Test Setup Helpers:
  - Where simpler, bypass env and set values directly on a `ProductionConfig()` instance before running validation to simulate edge cases (e.g., forcing an invalid `CORS_ORIGINS`).

- Definition of Done:
  - New CORS validation executed as part of `validate_all()`.
  - Production misconfigurations are blocked with clear errors.
  - Dev/test produce warnings for non-critical issues; no false positives for expected localhost patterns.
  - Updated tests pass. No regressions to existing test suites.

### TASK: **5.3.4 Create integration tests for origin validation and preflight requests**

Create integration tests in `tests/test_cors.py` to verify actual CORS functionality including preflight OPTIONS requests, CORS headers in responses, origin validation across environments, and Chrome extension-specific scenarios.



