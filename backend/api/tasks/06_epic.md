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

- Treat this as a clean migration to Pydantic v2 best practices, not a 1:1 Marshmallow parity port.
- Use `uuid.UUID` for IDs; JSON emits strings by default via Pydantic.
- Use timezone-aware `datetime` in UTC; ensure JSON emits RFC3339 with `Z`.
- Prefer native `model_dump()` and `model_dump_json()`; avoid ad-hoc helpers unless justified.
- Do not introduce Flask-Pydantic third-party wrappers; implement lightweight decorators internally (story 6.2).
- Enable `from_attributes=True` so Pydantic can serialize from SQLAlchemy model instances directly.
- Remove Marshmallow after Pydantic tests are passing and imports are migrated.


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

As a backend developer, I want Pydantic v2 models that cleanly represent our API contracts and map from ORM objects so that validation and serialization are explicit, strict, and decoupled from Marshmallow decisions.

Acceptance criteria:
- `ArticleModel`, `TopicModel`, `SourceModel` defined with `from_attributes=True`, `extra='forbid'`, and immutability (`frozen=True`).
- Fields use strict types (`uuid.UUID`, `HttpUrl`, timezone-aware `datetime` in UTC) where applicable.
- Default serialized shapes exclude `None` and avoid computed fields unless explicitly modeled.
- Unit tests cover:
  - Validation and coercion rules (UUIDs, URLs, datetimes -> UTC).
  - `model_validate(..., from_attributes=True)` from SQLAlchemy ORM instances.
  - Stable JSON shapes for list/detail contexts as documented in tests.

### TASK: **6.1.1 Create `app/schemas_pydantic/` with entity models**

Implementation plan:

- Create directory and exports
  - Add `app/schemas_pydantic/__init__.py` exporting `ArticleModel`, `TopicModel`, `SourceModel`, plus short nested refs (`TopicRef`, `SourceRef`) to prevent recursion.

- Base configuration
  - Use `pydantic.BaseModel` with `model_config = ConfigDict(from_attributes=True, populate_by_name=True, extra='forbid', frozen=True)`.

- Models and fields
  - `ArticleModel`
    - Fields: `id: UUID`, `title: str`, `url: HttpUrl`, `image_url: HttpUrl | None`, `brief: str | None`, `topic_id: UUID | None`, `source_id: UUID | None`, `added_at: datetime`.
    - Optional short refs: `topic: TopicRef | None`, `source: SourceRef | None` (disabled by default at selection layer; included only when explicitly supplied by route).
    - Serialization: `@field_serializer("added_at")` to emit RFC3339 UTC with trailing `Z`.
  - `TopicModel`
    - Fields: `id: UUID`, `label: str`, `added_at: datetime`, `updated_at: datetime`, `coverage_score: conint(ge=0)`.
    - Do not include aggregate/computed fields by default; define separate view models if needed later (story 9/10).
  - `SourceModel`
    - Fields: `id: UUID`, `logo_url: HttpUrl | None`, `name: str`, `homepage_url: HttpUrl | None`, `is_enabled: bool`.

- Lightweight refs to break cycles
  - `TopicRef`: minimal fields (`id`, `label`).
  - `SourceRef`: minimal fields (`id`, `name`, `logo_url`).

- Typing and tz rules
  - Enforce timezone-aware `datetime` (normalize to UTC) in validators; accept strings/naive datetimes and coerce to UTC.

- File layout
  - `app/schemas_pydantic/article.py`, `topic.py`, `source.py` each defining the primary model and ref model.

- Acceptance checks
  - `model_validate(instance, from_attributes=True)` succeeds for SQLAlchemy models.
  - `model_dump(exclude_none=True)` emits clean, minimal shapes without legacy Marshmallow-specific computed fields.

### TASK: **6.1.2 Implement strict types**

Implementation plan:

- UUIDs: use `uuid.UUID` for `id`, `topic_id`, `source_id`; ensure dumps are strings.
- URLs: use `pydantic.HttpUrl` for `url`, `image_url`, `logo_url`, `homepage_url`.
- Datetimes: `datetime` with tzinfo; validator coerces naive inputs to `UTC`; serialize as RFC3339 with `Z` via field serializers.
- Integers: `coverage_score: conint(ge=0)`; no arbitrary upper bound.
- Enums: none for current entities; revisit if domain adds enumerations.
- Forbid unexpected fields (`extra='forbid'`).

### TASK: **6.1.3 Provide `to_dict`/`to_json` helpers**

Implementation plan:

- Avoid thin wrappers; rely directly on `model_dump()`/`model_dump_json()` with `exclude_none=True` at call sites.
- Define a shared `BaseSchema` (subclass of `BaseModel`) with common `model_config` only; no custom serialization helpers.
- Centralize response formatting utilities in story 7 (validation/response infra) to keep entity models pure.

### TASK: **6.1.4 Unit tests for shape parity**

Implementation plan:

- Test layout: add `tests/schemas/test_pydantic_models.py`.
- Fixtures: create SQLAlchemy `Source`, `Topic`, `Article` instances linked together; persist with `db.session` if needed or use in-memory objects.
- Article tests
  - Validate from ORM: `ArticleModel.model_validate(article, from_attributes=True)`.
  - Assert `model_dump(exclude_none=True)` includes keys: `id`, `title`, `url`, `image_url`, `brief`, `topic_id`, `source_id`, `added_at`; and includes `topic`/`source` only when provided.
  - Assert `id` is a stringified UUID; `added_at` ends with `Z` and is UTC.
- Topic tests
  - Validate from ORM and assert fields only (no computed aggregates by default).
- Source tests
  - Validate from ORM and assert URL validation behavior.
- Linting/formatting
  - Run `ruff`, `black`, and `pyright` on added modules and tests.
- CI
  - Run `pytest -q` to ensure green before moving to story 6.2.


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
