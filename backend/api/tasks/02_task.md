# [ ] 2 Setup Database Models with Flask-SQLAlchemy

Define SQLAlchemy models for Articles, Topics, and Sources entities with proper relationships, constraints, and UUID primary keys. Include timestamp fields, foreign key relationships, and validation. Ensure models follow Flask-SQLAlchemy patterns with proper `db.Model` inheritance.

## Relevant Files

- `app/models/__init__.py` - Package initialization for models, exports all model classes for easy importing from other parts of the application.
- `app/models/article.py` - Article model definition with UUID primary key, foreign key relationships to Topic and Source, and timestamp fields.
- `app/models/topic.py` - Topic model definition with UUID primary key, coverage score calculation, and timestamp tracking for creation and updates.
- `app/models/source.py` - Source model definition with UUID primary key, news source metadata (name, logo, homepage), and active status tracking.
- `tests/models/__init__.py` - Test package initialization for model tests.
- `tests/models/test_article.py` - Unit tests for Article model including validation, relationships, and database operations.
- `tests/models/test_topic.py` - Unit tests for Topic model including coverage score functionality and timestamp handling.
- `tests/models/test_source.py` - Unit tests for Source model including validation and metadata handling.
- `app/__init__.py` - Application factory where Flask-SQLAlchemy db instance is initialized and models are imported.

## Notes

- All models must inherit from `db.Model` (Flask-SQLAlchemy base class)
- Use UUID primary keys for all entities as specified in the README
- Implement proper foreign key relationships with cascading deletes where appropriate
- Add proper constraints and validation for required fields
- Include `__repr__` methods for better debugging and logging
- Follow Flask-SQLAlchemy naming conventions for table names and columns
- Ensure proper timestamp handling with SQLAlchemy's `DateTime` and `func.now()`
- Use Flask-SQLAlchemy's `db.Column`, `db.relationship()`, and `db.ForeignKey()` for model definitions

## Tasks

- [ ] 2.1 Setup Models Package Structure
    - [ ] 2.1.1 Create models package directory
    - [ ] 2.1.2 Create models package initialization file
    - [ ] 2.1.3 Setup database instance import in application factory
- [ ] 2.2 Implement Source Model
    - [ ] 2.2.1 Create Source model class structure
    - [ ] 2.2.2 Define Source model fields and constraints
    - [ ] 2.2.3 Add Source model methods and validation
- [ ] 2.3 Implement Topic Model
    - [ ] 2.3.1 Create Topic model class structure
    - [ ] 2.3.2 Define Topic model fields and constraints
    - [ ] 2.3.3 Add Topic model methods and validation
- [ ] 2.4 Implement Article Model
    - [ ] 2.4.1 Create Article model class structure
    - [ ] 2.4.2 Define Article model fields and constraints
    - [ ] 2.4.3 Add Article model foreign key relationships
    - [ ] 2.4.4 Add Article model methods and validation
- [ ] 2.5 Setup Model Tests
    - [ ] 2.5.1 Create test models package structure
    - [ ] 2.5.2 Implement Source model tests
    - [ ] 2.5.3 Implement Topic model tests
    - [ ] 2.5.4 Implement Article model tests
    - [ ] 2.5.5 Implement relationship tests

## **2.1 Setup Models Package Structure**

Establish the foundational structure for Flask-SQLAlchemy models with proper package organization and database instance initialization.

### **2.1.1 Create models package directory**
Create the `app/models/` directory to house all SQLAlchemy model definitions, following Flask best practices for modular organization.

### **2.1.2 Create models package initialization file**
Create `app/models/__init__.py` to initialize the models package and provide centralized imports for all model classes, enabling clean imports from other application modules.

### **2.1.3 Setup database instance import in application factory**
Ensure the Flask-SQLAlchemy `db` instance is properly imported and accessible in the models package, typically through the application factory pattern in `app/__init__.py`.

## **2.2 Implement Source Model**

Create the Source model representing news sources with proper fields, constraints, and Flask-SQLAlchemy integration.

### **2.2.1 Create Source model class structure**
Create `app/models/source.py` with the Source model class inheriting from `db.Model`, including proper table name definition and Flask-SQLAlchemy imports.

### **2.2.2 Define Source model fields and constraints**
Implement all required fields for the Source model: UUID primary key, name (TEXT), logo_url (URL), homepage_url (URL), and is_enabled (BOOLEAN) with appropriate constraints and nullable settings.

### **2.2.3 Add Source model methods and validation**
Add `__repr__` method for debugging, any necessary validation methods, and class methods for common database operations following Flask-SQLAlchemy patterns.

## **2.3 Implement Topic Model**

Create the Topic model representing news topics/events with timestamp tracking and coverage score functionality.

### **2.3.1 Create Topic model class structure**
Create `app/models/topic.py` with the Topic model class inheriting from `db.Model`, including proper table name definition and Flask-SQLAlchemy imports.

### **2.3.2 Define Topic model fields and constraints**
Implement all required fields for the Topic model: UUID primary key, label (TEXT), added_at (TIMESTAMP), updated_at (TIMESTAMP), and coverage_score (INTEGER) with appropriate constraints and default values.

### **2.3.3 Add Topic model methods and validation**
Add `__repr__` method, timestamp update handlers, coverage score calculation methods, and any necessary validation following Flask-SQLAlchemy patterns.

## **2.4 Implement Article Model**

Create the Article model with foreign key relationships to Topic and Source models, representing individual news articles.

### **2.4.1 Create Article model class structure**
Create `app/models/article.py` with the Article model class inheriting from `db.Model`, including proper table name definition and Flask-SQLAlchemy imports.

### **2.4.2 Define Article model fields and constraints**
Implement all required fields for the Article model: UUID primary key, title (TEXT), url (URL), image_url (URL), brief (TEXT), and added_at (TIMESTAMP) with appropriate constraints.

### **2.4.3 Add Article model foreign key relationships**
Define foreign key relationships to Topic and Source models using Flask-SQLAlchemy's `db.ForeignKey()` and `db.relationship()`, ensuring proper cascading behavior and back-references.

### **2.4.4 Add Article model methods and validation**
Add `__repr__` method, URL validation methods, and any necessary database operation methods following Flask-SQLAlchemy patterns.

## **2.5 Setup Model Tests**

Create comprehensive test coverage for all models using Flask's test client and pytest framework.

### **2.5.1 Create test models package structure**
Create the `tests/models/` directory structure with proper `__init__.py` files to organize model tests following Flask testing conventions.

### **2.5.2 Implement Source model tests**
Create `tests/models/test_source.py` with comprehensive tests for Source model creation, validation, field constraints, and database operations using Flask test patterns.

### **2.5.3 Implement Topic model tests**
Create `tests/models/test_topic.py` with tests for Topic model creation, timestamp handling, coverage score functionality, and validation using Flask test patterns.

### **2.5.4 Implement Article model tests**
Create `tests/models/test_article.py` with tests for Article model creation, field validation, URL validation, and database operations using Flask test patterns.

### **2.5.5 Implement relationship tests**
Add comprehensive tests for foreign key relationships, cascading deletes, back-references, and cross-model operations ensuring proper Flask-SQLAlchemy relationship behavior. 