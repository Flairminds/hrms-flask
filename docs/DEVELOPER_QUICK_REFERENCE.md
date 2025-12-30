# Developer Quick Reference - Code Quality Standards

**Last Updated:** 2025-12-30  
**Status:** Current Best Practices

---

## Error Handling in Controllers

### ✅ DO: Use Specific Exception Types

```python
from ..utils.logger import Logger

@staticmethod
def create_resource():
    Logger.info("Create resource request received")
    
    try:
        data = request.get_json()
        
        # Validate input
        if not data:
            Logger.warning("Empty request body")
            return jsonify({"Message": "Request body is required"}), 400
        
        # Call service
        result = SomeService.create(data)
        
        Logger.info("Resource created successfully", resource_id=result.id)
        return jsonify({"Message": "Success", "Id": result.id}), 201
        
    except ValueError as ve:
        # Validation errors (e.g., invalid email, wrong format)
        Logger.warning("Validation error", error=str(ve), data_keys=list(data.keys()))
        return jsonify({"Message": str(ve)}), 400
        
    except LookupError as le:
        # Not found errors (e.g., employee doesn't exist)
        Logger.warning("Resource not found", error=str(le))
        return jsonify({"Message": "Resource not found"}), 404
        
    except PermissionError as pe:
        # Authorization errors
        Logger.warning("Permission denied", error=str(pe))
        return jsonify({"Message": "Permission denied"}), 403
        
    except Exception as e:
        # Unexpected errors - log details but return generic message
        Logger.error("Unexpected error creating resource",
                    error=str(e),
                    error_type=type(e).__name__)
        return jsonify({
            "Message": "An error occurred. Please try again."
        }), 500
```

### ❌ DON'T: Expose Internal Errors

```python
# BAD - Exposes internal details
except Exception as e:
    return jsonify({"Message": f"Error: {str(e)}"}), 500

# GOOD - Hides internal details
except Exception as e:
    Logger.error("Error occurred", error=str(e))
    return jsonify({"Message": "An error occurred. Please try again."}), 500
```

---

## Logging with Logger

### Basic Usage

```python
from app.utils.logger import Logger

# Info - Normal operations
Logger.info("User logged in", user_id=user.id, role=user.role)

# Warning - Potential issues
Logger.warning("Invalid login attempt", username=username, ip=request.remote_addr)

# Error - Actual errors
Logger.error("Database query failed", query=query_name, error=str(e))

# Debug - Development only
Logger.debug("Processing data", data_size=len(data), step="validation")

# Critical - Severe issues
Logger.critical("Service unavailable", service="database", error=str(e))
```

### ✅ DO: Use Structured Metadata

```python
# GOOD - Structured metadata
Logger.info("Leave application submitted",
           employee_id=emp_id,
           leave_type=leave_type,
           days=num_days,
           transaction_id=tran_id)

# BAD - String concatenation
print(f"Leave application: {emp_id}, {leave_type}, {num_days} days")
```

### ✅ DO: Log in Try-Except Blocks

```python
try:
    result = process_data(data)
    Logger.info("Data processed successfully", record_count=len(result))
    return result
except ValueError as ve:
    Logger.warning("Validation failed", error=str(ve), data_type=type(data).__name__)
    raise
except Exception as e:
    Logger.error("Processing failed", error=str(e), error_type=type(e).__name__)
    raise
```

### ❌ DON'T: Log Sensitive Data

```python
# NEVER log passwords, tokens, or PII
Logger.info("User login", password=password)  # ❌ BAD
Logger.info("User login", user_id=user_id)     # ✅ GOOD

# NEVER log full credit card numbers
Logger.info("Payment", card=card_number)  # ❌ BAD
Logger.info("Payment", card_last4=card_number[-4:])  # ✅ GOOD
```

---

## Using Constants

### ✅ DO: Import and Use Constants

```python
from app.utils.constants import LeaveStatus, LeaveTypeID, FinancialYear
from datetime import date, datetime

# Use constants for status strings
if leave.status == LeaveStatus.PENDING:
    # process pending leave
    
# Use constants for leave type IDs
if leave.type == LeaveTypeID.SICK:
    # process sick leave
    
# Use dynamic FY calculation
current_year = datetime.now().year
fy_start = date(current_year, FinancialYear.START_MONTH, FinancialYear.START_DAY)

# Query with constants
query.filter(
    LeaveTransaction.status == LeaveStatus.APPROVED,
    LeaveTransaction.leave_type.in_([LeaveTypeID.SICK, LeaveTypeID.CASUAL]),
    LeaveTransaction.date > fy_start
)
```

### ❌ DON'T: Use Magic Values

```python
# BAD - Magic strings
if leave.status == 'Pending':
    
# BAD - Magic numbers
if leave.type == 1:
    
# BAD - Hardcoded dates
if leave.date > datetime(2025, 4, 1):
```

### Available Constants

```python
# Import from app.utils.constants

# Leave Status
LeaveStatus.PENDING
LeaveStatus.APPROVED
LeaveStatus.REJECTED
LeaveStatus.CANCELLED

# Leave Types
LeaveTypeID.SICK           # 1
LeaveTypeID.PRIVILEGE      # 2
LeaveTypeID.WFH            # 3
LeaveTypeID.COMP_OFF       # 4
LeaveTypeID.CASUAL         # 5
LeaveTypeID.LEAVE_WITHOUT_PAY  # 12
LeaveTypeID.UNPAID_LEAVE   # 13

# Employee Status
EmployeeStatus.ACTIVE
EmployeeStatus.TERMINATED
EmployeeStatus.RELIEVED

# Financial Year
FinancialYear.START_MONTH  # 4 (April)
FinancialYear.START_DAY    # 1
```

---

## Writing Tests

### Controller Tests

```python
import json
from unittest.mock import MagicMock

def test_create_resource_success(client, auth_header, mocker):
    """Test successful resource creation"""
    # Mock the service
    mocker.patch("app.controllers.my_controller.MyService.create", 
                 return_value={"id": 123})
    
    # Make request
    response = client.post("/api/resource", 
                          data=json.dumps({"name": "Test"}),
                          headers=auth_header(role="Admin"),
                          content_type="application/json")
    
    # Assert
    assert response.status_code == 201
    assert b"Success" in response.data

def test_create_resource_validation_error(client, auth_header, mocker):
    """Test validation error handling"""
    # Mock service to raise ValueError
    mocker.patch("app.controllers.my_controller.MyService.create", 
                 side_effect=ValueError("Invalid name"))
    
    response = client.post("/api/resource", 
                          data=json.dumps({"name": ""}),
                          headers=auth_header(role="Admin"),
                          content_type="application/json")
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "Invalid name" in data["Message"]

def test_create_resource_secure_errors(client, auth_header, mocker):
    """Test that internal errors are not exposed"""
    # Mock service to raise generic exception
    mocker.patch("app.controllers.my_controller.MyService.create", 
                 side_effect=Exception("Database connection failed"))
    
    response = client.post("/api/resource", 
                          data=json.dumps({"name": "Test"}),
                          headers=auth_header(role="Admin"),
                          content_type="application/json")
    
    assert response.status_code == 500
    data = json.loads(response.data)
    # Should NOT contain internal error message
    assert "Database connection failed" not in data["Message"]
    # Should contain generic message
    assert "An error occurred" in data["Message"]
```

### Service Tests

```python
def test_service_method_success(app, mocker):
    """Test service method success"""
    from app.services.my_service import MyService
    
    # Mock database
    mock_query = mocker.patch('app.services.my_service.db.session.query')
    mock_query.return_value.filter.return_value.first.return_value = MagicMock(id=1)
    
    result = MyService.get_resource(123)
    
    assert result is not None
    assert result.id == 1

def test_service_method_not_found(app, mocker):
    """Test service method not found"""
    from app.services.my_service import MyService
    
    # Mock database to return None
    mock_query = mocker.patch('app.services.my_service.db.session.query')
    mock_query.return_value.filter.return_value.first.return_value = None
    
    with pytest.raises(LookupError):
        MyService.get_resource(999)
```

---

## Common Patterns

### Transaction Pattern

```python
def create_with_transaction(data):
    """Create resource with proper transaction handling"""
    try:
        # Start implicit transaction
        new_resource = Resource(**data)
        db.session.add(new_resource)
        
        # Additional operations
        update_related_data(new_resource.id)
        
        # Commit transaction
        db.session.commit()
        
        Logger.info("Resource created", resource_id=new_resource.id)
        return new_resource.id
        
    except Exception as e:
        # Rollback on any error
        db.session.rollback()
        Logger.error("Failed to create resource", error=str(e))
        raise
```

### Upsert Pattern

```python
def upsert_resource(resource_id, data):
    """Update existing or create new resource"""
    try:
        # Try to find existing
        existing = Resource.query.filter_by(id=resource_id).first()
        
        if existing:
            # Update
            for key, value in data.items():
                setattr(existing, key, value)
            Logger.info("Resource updated", resource_id=resource_id)
        else:
            # Insert
            new_resource = Resource(id=resource_id, **data)
            db.session.add(new_resource)
            Logger.info("Resource created", resource_id=resource_id)
        
        db.session.commit()
        return resource_id
        
    except Exception as e:
        db.session.rollback()
        Logger.error("Upsert failed", resource_id=resource_id, error=str(e))
        raise
```

---

## Checklist for New Code

Before committing new code, verify:

- [ ] **Error Handling**: Uses specific exception types (ValueError, LookupError)
- [ ] **Logging**: Uses Logger, not print()
- [ ] **Security**: No internal errors exposed to users
- [ ] **Constants**: No magic strings or hardcoded values
- [ ] **Metadata**: Logger calls include context (IDs, types)
- [ ] **Tests**: Unit tests cover happy path and errors
- [ ] **Validation**: Input validation with proper error messages
- [ ] **Transactions**: Database operations use try/except with rollback

---

## Code Review Guidelines

When reviewing code:

1. **Security**: Check error messages don't expose internals
2. **Logging**: Verify Logger is used with appropriate level
3. **Constants**: No hardcoded strings/numbers for business logic
4. **Tests**: New code should have tests
5. **Consistency**: Follows patterns in this guide

---

## Getting Help

- **Logging Guide**: `.agent/LOGGER_MIGRATION_GUIDE.md`
- **Coding Guidelines**: `.agent/CODING_GUIDELINES.md`
- **Review Report**: `docs/reviews/REVIEW_2025_12_30.md`
- **Deployment Guide**: `docs/reviews/DEPLOYMENT_CHECKLIST.md`

---

**Remember:** Good code is secure, testable, and maintainable. Follow these patterns to achieve all three! 🚀
