# EPIC: [ ] 6 Migrate to Pydantic v2 for Validation and Serialization

Migrate from Flask-Marshmallow to Pydantic v2. Replace Marshmallow schemas and validators with Pydantic `BaseModel` request/response models; standardize JSON serialization via `model_dump()`/`model_dump_json()`; enable ORM attribute support with `from_attributes=True`; and ensure consistent typing for `uuid.UUID`, timezone-aware `datetime` (UTC), and `Enum`. Implement internal request validation decorators (`validate_query`, `validate_body`, `validate_path`) and a global handler for `pydantic.ValidationError` to return standardized 400 responses; do not add third-party Flask-Pydantic packages. Remove Flask-Marshmallow and related adapters/dependencies, and refactor tests/fixtures to Pydantic while preserving existing public API response shapes for backwards compatibility. Assess `pydantic-settings` later as a separate, optional enhancement.


## Relevant Files

- `app/extensions.py` - Remove Flask-Marshmallow extension and related init; keep SQLAlchemy, Alembic, CORS.
- `app/error_handlers.py` - Add handler for `pydantic.ValidationError` -> standardized 400 JSON response.
- `app/routes.py` - Use request validation decorators to validate `query`, `path`, and `body` data.
- `app/models/*.py` - SQLAlchemy models used as ORM sources for `from_attributes=True` Pydantic models.
- `app/schemas/` - Current Marshmallow schemas to be deprecated and removed.
- `app/validation.py` (new) - Implement `validate_query`, `validate_body`, `validate_path` decorators using Pydantic v2.
- `app/schemas_pydantic/` (new)
  - `article.py`, `topic.py`, `source.py` - Pydantic v2 models for request/response with `from_attributes=True`.
  - `__init__.py` - Public exports of v2 schemas.
- `tests/schemas/` - Refactor tests to validate Pydantic models instead of Marshmallow.
- `tests/test_error_handlers.py` - Add cases for `pydantic.ValidationError` -> 400 response schema.
- `tests/test_extensions.py` - Remove assertions tied to Flask-Marshmallow.
- `requirements.txt` - Add `pydantic>=2`, remove `Flask-Marshmallow`, `marshmallow-sqlalchemy`.
- `README.md` - Update docs to reference Pydantic v2 usage and serialization guidance.
- `pyproject.toml`, `pyrightconfig.json`, `Dockerfile` - Already set to Python 3.12; only doc touch-ups if needed.


## Notes

- Maintain response shapes exactly as before (field names, nesting) to avoid breaking the Chrome extension.
- Use `uuid.UUID` for IDs; ensure JSON serialization emits strings.
- Use timezone-aware `datetime` in UTC; ensure JSON emits ISO 8601 with `Z`.
- Prefer `model_dump()` and `model_dump_json()`; avoid custom JSON encoders when possible.
- Do not introduce Flask-Pydantic wrappers; implement lightweight decorators internally.
- Enable `from_attributes=True` so Pydantic can serialize from SQLAlchemy model instances directly.
- Remove Marshmallow only after Pydantic tests are passing and imports are migrated.


## STORY and TASK Breakdown

- [x] 6.0 Preliminary Step 0 — Upgrade to Python 3.12
    - [x] 6.0.1 Update runtime/tooling to Python 3.12 (Dockerfile, `pyproject.toml`, `pyrightconfig.json`, README)
    - [x] 6.0.2 Verify dependency compatibility on Python 3.12
- [ ] 6.1 Introduce Pydantic v2 models for entities (Article, Topic, Source)
    - [ ] 6.1.1 Create `app/schemas_pydantic/` with `article.py`, `topic.py`, `source.py` using `from_attributes=True`
    - [ ] 6.1.2 Implement strict types: `uuid.UUID`, timezone-aware `datetime`, enums where applicable
    - [ ] 6.1.3 Provide helpers for `to_dict`/`to_json` thin wrappers around `model_dump()`/`model_dump_json()`
    - [ ] 6.1.4 Unit tests verifying shapes match legacy Marshmallow outputs
- [ ] 6.2 Implement request validation decorators
    - [ ] 6.2.1 Add `app/validation.py` with `validate_query`, `validate_body`, `validate_path` using Pydantic models
    - [ ] 6.2.2 Decorators attach validated model instances/`dict`s to the view or pass as kwargs
    - [ ] 6.2.3 Unit tests for valid/invalid payloads, missing/extra fields, type coercion, and enums
- [ ] 6.3 Add global Pydantic error handling
    - [ ] 6.3.1 In `app/error_handlers.py`, handle `pydantic.ValidationError` returning 400 with standardized error body
    - [ ] 6.3.2 Unit tests asserting error schema, status code, and logged messages
- [ ] 6.4 Replace Marshmallow usage and remove dependency
    - [ ] 6.4.1 Migrate imports in code and tests to use Pydantic models
    - [ ] 6.4.2 Remove `ma` setup from `app/extensions.py` and delete `app/schemas/` (Marshmallow) after tests pass
    - [ ] 6.4.3 Update `tests/test_extensions.py` to stop asserting on Marshmallow initialization
- [ ] 6.5 Dependencies and docs
    - [ ] 6.5.1 Update `requirements.txt`: add `pydantic>=2`, remove Marshmallow packages
    - [ ] 6.5.2 Update `README.md` with Pydantic guidance and examples
    - [ ] 6.5.3 Run full test suite; ensure lints/format pass and no import errors remain


## STORY: **6.0 Preliminary Step 0 — Upgrade to Python 3.12**

As a maintainer, I want the runtime/tooling on Python 3.12 so that Pydantic v2 is fully supported and consistent across environments.

Acceptance criteria:
- Dockerfile uses `python:3.12-slim` and runs clean.
- `pyproject.toml` targets `py312` for Black/Ruff.
- `pyrightconfig.json` `pythonVersion` is `3.12`.
- Dependencies install without conflicts on 3.12.

### TASK: **6.0.1 Update runtime/tooling to Python 3.12**

Ensure Docker, formatter, linter, and type checker target Python 3.12.

### TASK: **6.0.2 Verify dependency compatibility on Python 3.12**

Install dependencies, run tests, and resolve any 3.12-specific issues.


## STORY: **6.1 Introduce Pydantic v2 models for entities (Article, Topic, Source)**

As a backend developer, I want Pydantic v2 models that mirror our domain objects so that I can serialize and validate consistently without Marshmallow.

Acceptance criteria:
- `ArticleModel`, `TopicModel`, `SourceModel` defined with `from_attributes=True`.
- Fields use `uuid.UUID` and timezone-aware `datetime` (UTC) where applicable.
- `model_dump()` produces dicts matching legacy response shapes.
- Unit tests cover 1:1 shape parity for typical instances and `many=True` equivalents.

### TASK: **6.1.1 Create `app/schemas_pydantic/` with entity models**

Add Pydantic models for Article, Topic, Source with nested relationships to match legacy nesting.

### TASK: **6.1.2 Implement strict types**

Use precise types (`uuid.UUID`, `HttpUrl` for URLs, `datetime` with UTC) and enums if needed.

### TASK: **6.1.3 Provide `to_dict`/`to_json` helpers**

Thin wrappers around `model_dump()`/`model_dump_json()` to centralize defaults (e.g., exclude_none).

### TASK: **6.1.4 Unit tests for shape parity**

Refactor tests to assert Pydantic serialization output matches legacy field names and nesting.


## STORY: **6.2 Implement request validation decorators**

As a backend developer, I want simple decorators to validate incoming `query`, `path`, and `body` using Pydantic so that all routes have consistent validation.

Acceptance criteria:
- `validate_query`, `validate_body`, `validate_path` accept a Pydantic model class and validate incoming data.
- On success, pass validated model instance (or dict) to the view function.
- On failure, raise `pydantic.ValidationError` caught by global handler -> 400.
- Unit tests cover success and common failure cases.

### TASK: **6.2.1 Implement decorators in `app/validation.py`**

Build decorators that parse request components, instantiate models, and pass validated data.

### TASK: **6.2.2 Wire decorator outputs to views**

Ensure validated data is available to handlers via kwargs or a known attribute.

### TASK: **6.2.3 Unit tests for validation**

Tests for missing/extra fields, type errors, enum constraints, and coercion behavior.


## STORY: **6.3 Add global Pydantic error handling**

As a client integrator, I want consistent 400 responses for validation errors so that the Chrome extension can handle errors predictably.

Acceptance criteria:
- Global handler maps `pydantic.ValidationError` to 400.
- Error body includes a concise list of issues (field, message) and `status_code`.
- Tests verify schema and logging occurs.

### TASK: **6.3.1 Implement error handler in `app/error_handlers.py`**

Add handler function for `pydantic.ValidationError` returning standardized JSON.

### TASK: **6.3.2 Unit tests for error handling**

Simulate decorator failures to assert 400 responses and payload structure.


## STORY: **6.4 Replace Marshmallow usage and remove dependency**

As a maintainer, I want Marshmallow removed after parity is achieved so that the codebase depends solely on Pydantic for validation/serialization.

Acceptance criteria:
- No references to Flask-Marshmallow or Marshmallow SQLAlchemy remain.
- `app/extensions.py` no longer initializes Marshmallow.
- `app/schemas/` (Marshmallow) removed after tests are ported to Pydantic.
- Tests and imports updated accordingly.

### TASK: **6.4.1 Migrate imports to Pydantic**

Update all modules and tests to import from `app/schemas_pydantic`.

### TASK: **6.4.2 Remove Marshmallow integration**

Delete `ma` from `app/extensions.py` and remove `app/schemas/` after passing tests.

### TASK: **6.4.3 Update extension tests**

Remove assertions that check for Marshmallow initialization.


## STORY: **6.5 Dependencies and docs**

As a maintainer, I want dependencies and documentation updated so that contributors use Pydantic v2 correctly.

Acceptance criteria:
- `requirements.txt` includes `pydantic>=2` and excludes Marshmallow packages.
- README explains Pydantic patterns and shows examples.
- Test suite and linters pass on Python 3.12.

### TASK: **6.5.1 Update dependencies**

Add Pydantic, remove Marshmallow packages, run full install, and fix imports.

### TASK: **6.5.2 Update README**

Document `model_dump()`/`model_dump_json()`, `from_attributes=True`, and validation decorators usage.

### TASK: **6.5.3 Verify build and tests**

Run tests; ensure zero import errors and consistent response shapes.
