---
description: Automatically checks code changes and updates/adds test cases for automated testing
---

# Update Test Cases Workflow

This workflow automatically identifies code changes and ensures comprehensive test coverage by updating existing tests or creating new ones.

## When to Use This Workflow

- After adding new features, methods, or endpoints
- After refactoring existing code
- After fixing bugs (to prevent regression)
- After updating business logic or validation rules
- After changing error handling patterns
- Before merging code to main branch

## Prerequisites

1. Code changes committed or staged
2. Existing test infrastructure in `tests/` directory
3. Python testing framework (pytest) installed
4. Understanding of the code changes made

## Workflow Steps

### Step 1: Identify Code Changes

**A. Check Git Changes**
```bash
# View modified files
git status

# View detailed changes
git diff

# View changes in specific file
git diff app/services/your_service.py
```

**B. Categorize Changes**

Identify the type of changes:
- [ ] New service methods
- [ ] New API endpoints (routes)
- [ ] Modified business logic
- [ ] New validation rules
- [ ] Error handling changes
- [ ] New models or database changes
- [ ] Bug fixes
- [ ] Refactoring

### Step 2: Analyze Test Coverage Gaps

**A. Find Corresponding Test File**

Mapping pattern:
```
app/services/policy_service.py    → tests/test_policy.py
app/services/goals_service.py     → tests/test_goals.py
app/routes/leave_route.py         → tests/test_leave.py
app/controllers/hr_controller.py  → tests/test_hr.py
```

**B. Check Existing Coverage**

```bash
# Run tests with coverage
pytest tests/test_yourmodule.py --cov=app.services.your_service --cov-report=term-missing

# View which lines are not covered
pytest --cov=app --cov-report=html
# Open htmlcov/index.html to see detailed coverage
```

**C. Identify Missing Tests**

For each new/modified method, check if tests exist for:
- [ ] Happy path (normal, expected behavior)
- [ ] Edge cases (boundary values, empty inputs)
- [ ] Error cases (invalid inputs, exceptions)
- [ ] Validation failures
- [ ] Database errors
- [ ] Permission/authorization checks

### Step 3: Design Test Cases

**For Each New/Modified Function:**

**A. Happy Path Tests**
```python
# Test successful execution with valid inputs
def test_method_name_success():
    """Test successful [operation] with valid data."""
    # Arrange: Setup test data
    # Act: Call the method
    # Assert: Verify expected results
```

**B. Validation Tests**
```python
# Test input validation
def test_method_name_missing_required_field():
    """Test that ValueError is raised when required field is missing."""
    
def test_method_name_invalid_format():
    """Test that ValueError is raised for invalid format."""
```

**C. Error Handling Tests**
```python
# Test exception handling
def test_method_name_database_error():
    """Test handling of database errors."""
    
def test_method_name_not_found():
    """Test handling when resource not found."""
```

**D. Edge Case Tests**
```python
# Test boundary conditions
def test_method_name_empty_list():
    """Test behavior with empty input list."""
    
def test_method_name_maximum_length():
    """Test behavior at maximum allowed length."""
```

### Step 4: Write Test Cases

**A. Use Project Testing Patterns**

Based on existing `tests/` structure, follow this pattern:

```python
import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.your_service import YourService
from app.models.your_model import YourModel

class TestYourService:
    """Test suite for YourService."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        with patch('app.services.your_service.db.session') as mock:
            yield mock
    
    def test_new_method_success(self, mock_db_session):
        """Test successful execution of new method."""
        # Arrange
        test_data = {"key": "value"}
        expected_result = {"result": "success"}
        
        # Mock database queries
        mock_db_session.query.return_value.filter_by.return_value.first.return_value = Mock()
        
        # Act
        result = YourService.new_method(test_data)
        
        # Assert
        assert result == expected_result
        mock_db_session.commit.assert_called_once()
    
    def test_new_method_validation_error(self):
        """Test that ValueError is raised for invalid input."""
        # Arrange
        invalid_data = {}
        
        # Act & Assert
        with pytest.raises(ValueError, match="required field"):
            YourService.new_method(invalid_data)
    
    def test_new_method_database_error(self, mock_db_session):
        """Test handling of database errors."""
        # Arrange
        test_data = {"key": "value"}
        mock_db_session.commit.side_effect = SQLAlchemyError("DB Error")
        
        # Act & Assert
        with pytest.raises(SQLAlchemyError):
            YourService.new_method(test_data)
        
        # Verify rollback was called
        mock_db_session.rollback.assert_called_once()
```

**B. Test Naming Convention**

```python
# Pattern: test_[method_name]_[scenario]_[expected_result]

def test_add_employee_valid_data_success()
def test_add_employee_missing_email_raises_value_error()
def test_add_employee_duplicate_id_raises_integrity_error()
def test_get_employee_nonexistent_id_returns_none()
def test_update_employee_database_error_rolls_back()
```

### Step 5: Update Tests for Code Changes

**Scenario A: New Method Added**

```python
# 1. Add test class if service is new
class TestNewService:
    """Test suite for NewService."""

# 2. Add tests for the new method
def test_new_method_all_scenarios(self):
    # Add 3-5 test methods covering different scenarios
```

**Scenario B: Method Modified (Business Logic Changed)**

```python
# 1. Review existing test
def test_existing_method_old_logic():
    # Old test that may now fail
    
# 2. Update test to match new logic
def test_existing_method_new_logic():
    # Updated assertions
    # New edge cases if logic changed
```

**Scenario C: New Validation Added**

```python
# Add test for the new validation
def test_method_new_validation_rule():
    """Test that new validation rule is enforced."""
    invalid_data = {"field": "invalid_value"}
    
    with pytest.raises(ValueError, match="validation message"):
        YourService.method(invalid_data)
```

**Scenario D: Error Handling Improved**

```python
# Add test for new error handling
def test_method_specific_exception_handling():
    """Test that specific exception is caught and handled."""
    # Mock to raise specific exception
    # Verify it's caught and logged properly
    # Verify appropriate action taken
```

### Step 6: Test API Endpoints (If Routes Changed)

**For New/Modified Routes:**

```python
import json
from app import create_app

class TestYourRoutes:
    """Test suite for your routes."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        app = create_app('testing')
        return app.test_client()
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers."""
        # Return headers with valid JWT token
        return {'Authorization': 'Bearer test_token'}
    
    def test_endpoint_success(self, client, auth_headers):
        """Test successful API call."""
        # Arrange
        payload = {"key": "value"}
        
        # Act
        response = client.post(
            '/api/endpoint',
            data=json.dumps(payload),
            headers=auth_headers,
            content_type='application/json'
        )
        
        # Assert
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['result'] == 'success'
    
    def test_endpoint_unauthorized(self, client):
        """Test endpoint requires authentication."""
        response = client.post('/api/endpoint')
        assert response.status_code == 401
    
    def test_endpoint_validation_error(self, client, auth_headers):
        """Test validation error returns 400."""
        invalid_payload = {}
        
        response = client.post(
            '/api/endpoint',
            data=json.dumps(invalid_payload),
            headers=auth_headers,
            content_type='application/json'
        )
        
        assert response.status_code == 400
```

### Step 7: Run and Verify Tests

**A. Run New/Updated Tests**

```bash
# Run specific test file
pytest tests/test_your_module.py -v

# Run specific test class
pytest tests/test_your_module.py::TestYourService -v

# Run specific test method
pytest tests/test_your_module.py::TestYourService::test_method_success -v

# Run with coverage
pytest tests/test_your_module.py --cov=app.services.your_service --cov-report=term-missing
```

**B. Verify Test Results**

Check that:
- [ ] All tests pass
- [ ] Coverage increased (or maintained at 80%+)
- [ ] No flaky tests (run multiple times)
- [ ] Tests run in reasonable time

**C. Run Full Test Suite**

```bash
# Run all tests to ensure no regressions
pytest tests/ -v

# Run with coverage for entire app
pytest tests/ --cov=app --cov-report=html
```

### Step 8: Document Test Coverage

**Update Test Documentation:**

```python
# At the top of test file, document what's tested:
"""
Test suite for YourService.

Coverage:
- method_one: ✅ Happy path, validation, errors
- method_two: ✅ Happy path, edge cases
- method_three: ✅ All scenarios
- NEW: method_four: ✅ Happy path, validation, errors

Updated: 2025-12-30
"""
```

## Quick Reference: Test Patterns by Change Type

### 1. New Service Method

```python
class TestNewMethod:
    def test_success_case(self): pass
    def test_validation_error(self): pass  
    def test_database_error(self): pass
    def test_not_found(self): pass
    def test_edge_case_empty_input(self): pass
```

### 2. New API Endpoint

```python
def test_endpoint_success_200(self): pass
def test_endpoint_unauthorized_401(self): pass
def test_endpoint_forbidden_403(self): pass
def test_endpoint_validation_error_400(self): pass
def test_endpoint_not_found_404(self): pass
def test_endpoint_server_error_500(self): pass
```

### 3. Added Validation

```python
def test_validates_required_field(self): pass
def test_validates_format(self): pass
def test_validates_length(self): pass
def test_validates_range(self): pass
```

### 4. Error Handling Update

```python
def test_catches_specific_exception(self): pass
def test_logs_error_properly(self): pass
def test_rolls_back_transaction(self): pass
def test_returns_appropriate_error(self): pass
```

### 5. Bug Fix

```python
def test_bug_fix_regression_prevention(self):
    """Test that bug #123 does not occur again."""
    # Reproduce the bug scenario
    # Verify fix works
```

## Testing Best Practices

### ✅ DO:

1. **One Assertion Per Concept**: Test one thing at a time
2. **Descriptive Names**: Test name should describe what's being tested
3. **AAA Pattern**: Arrange, Act, Assert
4. **Mock External Dependencies**: Database, APIs, email, etc.
5. **Test Edge Cases**: Empty strings, None, max values, etc.
6. **Clean Up**: Use fixtures for setup/teardown
7. **Fast Tests**: Mock slow operations
8. **Deterministic**: Tests should always give same result

### ❌ DON'T:

1. **Don't Test Framework Code**: Test your code, not Flask/SQLAlchemy
2. **Don't Test Multiple Scenarios in One Test**: Split them
3. **Don't Use Real Database**: Use mocks or test database
4. **Don't Ignore Flaky Tests**: Fix or remove them
5. **Don't Test Implementation Details**: Test behavior, not internals
6. **Don't Skip Error Cases**: They're most important!

## Checklist for Test Updates

Use this checklist when updating tests:

- [ ] Identified all changed files
- [ ] Found corresponding test files
- [ ] Checked current test coverage
- [ ] Wrote tests for happy path
- [ ] Wrote tests for validation errors
- [ ] Wrote tests for edge cases
- [ ] Wrote tests for error handling
- [ ] Updated existing tests if logic changed
- [ ] Ran new tests - all passing
- [ ] Ran full test suite - no regressions
- [ ] Coverage maintained/improved
- [ ] Documented test coverage updates
- [ ] Committed tests with code changes

## Common Test Scenarios

### Testing Logger Calls

```python
@patch('app.services.your_service.Logger')
def test_method_logs_info(self, mock_logger):
    """Test that method logs appropriate info."""
    YourService.method()
    
    mock_logger.info.assert_called_once_with(
        "Expected log message",
        param1="value1"
    )
```

### Testing Database Rollback

```python
def test_method_rolls_back_on_error(self, mock_db_session):
    """Test transaction rollback on error."""
    mock_db_session.commit.side_effect = SQLAlchemyError()
    
    with pytest.raises(SQLAlchemyError):
        YourService.method()
    
    mock_db_session.rollback.assert_called_once()
```

### Testing with Multiple Mocks

```python
@patch('app.services.your_service.EmailService')
@patch('app.services.your_service.db.session')
def test_method_with_multiple_dependencies(self, mock_db, mock_email):
    """Test method that uses multiple services."""
    # Setup mocks
    # Call method
    # Verify both mocks were used correctly
```

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/tests.yml
test:
  runs-on: ubuntu-latest
  steps:
    - name: Run tests
      run: pytest tests/ -v --cov=app --cov-report=xml
    
    - name: Check coverage threshold
      run: |
        coverage report --fail-under=80
```

---

**Last Updated:** 2025-12-30  
**Workflow Version:** 1.0
