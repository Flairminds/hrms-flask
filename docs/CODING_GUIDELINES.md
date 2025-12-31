# HRMS Flask - Coding Guidelines & Standards

## Table of Contents
1. [Code Structure & Organization](#code-structure--organization)
2. [Database Access - SQLAlchemy ORM](#database-access---sqlalchemy-orm)
3. [Service Layer Patterns](#service-layer-patterns)
4. [Naming Conventions](#naming-conventions)
5. [Error Handling](#error-handling)
6. [Security Best Practices](#security-best-practices)
7. [Documentation Standards](#documentation-standards)
8. [Testing Guidelines](#testing-guidelines)

---

## Code Structure & Organization

### Directory Structure
```
app/
├── models/          # SQLAlchemy ORM models
│   ├── hr.py       # HR-related models (Employee, Skill, etc.)
│   ├── leave.py    # Leave management models
│   ├── assets.py   # Asset management models
│   ├── documents.py # Document models
│   ├── account.py  # Account/auth models
│   └── feedback.py # Feedback models
├── services/        # Business logic layer
│   └── *_service.py # All service files
├── routes/          # API route definitions
│   └── *_routes.py  # Route blueprints
└── utils/           # Utility functions
    └── *.py
```

### File Organization Rules
1. **One class per service file** - Each `*_service.py` should contain a single service class
2. **Static methods preferred** - Use `@staticmethod` for service methods unless state is required
3. **Refactoring Trigger** - If a file exceeds 1000 lines, it **MUST** be refactored into smaller, logically grouped sub-modules.
4. **Import order**:
   ```python
   # Standard library imports
   from datetime import datetime
   from typing import Dict, List
   
   # Third-party imports
   from sqlalchemy import func, case
   
   # Local imports
   from .. import db
   from ..models.hr import Employee, Skill
   ```

---

## Database Access - SQLAlchemy ORM

### ✅ ALWAYS Use ORM (Preferred)

**DO THIS:**
```python
# Simple query
employee = Employee.query.filter_by(employee_id=emp_id).first()

# Query with JOIN
results = db.session.query(
    Employee.first_name,
    Skill.skill_name
).join(
    EmployeeSkill,
    Employee.employee_id == EmployeeSkill.employee_id
).filter(
    Employee.employment_status == 'Active'
).all()

# Insert
new_employee = Employee(
    employee_id='EMP001',
    first_name='John',
    last_name='Doe'
)
db.session.add(new_employee)
db.session.commit()

# Update
employee = Employee.query.get(emp_id)
employee.first_name = 'Jane'
db.session.commit()

# Delete
db.session.delete(employee)
db.session.commit()
```

### ❌ AVOID Raw SQL (Unless Absolutely Necessary)

**DON'T DO THIS:**
```python
# ❌ Raw SQL with text()
result = db.session.execute(
    text("SELECT * FROM employee WHERE employee_id = :id"),
    {"id": emp_id}
)
```

**EXCEPTIONS (when raw SQL is acceptable):**
1. **Stored Procedures** - Cannot be converted to ORM
   ```python
   # ACCEPTABLE: Stored procedure call
   query = text("EXEC GetMonthlyReport @Month=:month, @Year=:year")
   return db.session.execute(query, {"month": month, "year": year}).fetchall()
   ```

2. **Complex database-specific functions** - When ORM doesn't support specific DB features

### ORM Best Practices

#### 1. Use Proper Filtering
```python
# ✅ Good
Employee.query.filter_by(employee_id=emp_id).first()
Employee.query.filter(Employee.salary > 50000).all()

# ❌ Avoid
db.session.execute(text("SELECT * FROM employee WHERE employee_id = :id"))
```

#### 2. JOINs
```python
# ✅ Explicit JOIN
db.session.query(Employee, Skill).join(
    EmployeeSkill,
    Employee.employee_id == EmployeeSkill.employee_id
).join(
    Skill,
    EmployeeSkill.skill_id == Skill.skill_id
).all()

# ✅ Aliased queries for self-joins
Manager = db.aliased(Employee)
db.session.query(
    Employee.first_name,
    Manager.first_name.label('manager_name')
).join(
    Manager,
    Employee.manager_id == Manager.employee_id
).all()
```

#### 3. Aggregations
```python
# ✅ Use func for aggregations
from sqlalchemy import func

# Count
count = db.session.query(func.count(Employee.employee_id)).scalar()

# Max/Min
max_salary = db.session.query(func.max(Employee.salary)).scalar()

# Group by
results = db.session.query(
    Employee.department,
    func.count(Employee.employee_id)
).group_by(Employee.department).all()
```

#### 4. Upsert Pattern
```python
# ✅ Check and update or insert
existing = Employee.query.filter_by(employee_id=emp_id).first()

if existing:
    # Update
    existing.first_name = new_name
else:
    # Insert
    new_emp = Employee(employee_id=emp_id, first_name=new_name)
    db.session.add(new_emp)

db.session.commit()
```

#### 5. Bulk Operations
```python
# ✅ Bulk delete with filter
EmployeeSkill.query.filter_by(employee_id=emp_id).delete()
db.session.commit()

# ✅ Bulk update
Employee.query.filter(
    Employee.employment_status == 'Intern'
).update({Employee.employment_status: 'Probation'})
db.session.commit()
```

---

## Service Layer Patterns

### Mandatory Requirements

#### 1. ✅ ALWAYS Use Centralized Logger

**ALL services and controllers MUST use the centralized Logger service.**

```python
# ✅ REQUIRED - Import Logger in every service
from ..utils.logger import Logger

class SomeService:
    @staticmethod
    def some_method(param):
        Logger.info("Operation started", param=param)
        try:
            # ... business logic ...
            Logger.info("Operation completed successfully", param=param)
            return result
        except Exception as e:
            Logger.error("Operation failed", param=param, error=str(e))
            raise
```

**❌ NEVER use print() statements**
```python
# ❌ FORBIDDEN
print(f"Error occurred: {e}")
print("Processing employee...")

# ✅ CORRECT
Logger.error("Error occurred", error=str(e))
Logger.info("Processing employee", employee_id=emp_id)
```

**Log Level Guidelines:**

| Level | When to Use | Example |
|-------|-------------|---------|
| `DEBUG` | Detailed diagnostic info (disabled in production) | `Logger.debug("Query execution started", query_type="SELECT")` |
| `INFO` | General informational messages about app flow | `Logger.info("Employee created", employee_id="EMP001")` |
| `WARNING` | Potentially harmful situations that don't prevent operation | `Logger.warning("Employee not found, using default", employee_id=emp_id)` |
| `ERROR` | Error conditions indicating problems | `Logger.error("Database query failed", query="get_employee", error=str(e))` |
| `CRITICAL` | Very serious errors that may crash the application | `Logger.critical("Database connection lost", error=str(e))` |

**Best Practices for Metadata:**

```python
# ✅ EXCELLENT - Structured metadata
Logger.error("Failed to send email",
            recipient=email,
            subject=subject,
            error=str(e),
            retry_count=retries)

# ❌ AVOID - String concatenation (hard to parse, no structure)
Logger.error(f"Failed to send email to {email} with subject {subject}: {e}")

# ✅ GOOD - Build context dictionary for complex operations
context = {
    'employee_id': emp_id,
    'operation': 'employee_transfer',
    'new_department_id': new_dept_id,
    'transfer_date': transfer_date
}
Logger.info("Starting employee transfer", **context)
```

**Common Logging Patterns:**

```python
# Pattern 1: Try-Except with Logger
try:
    result = some_operation()
    Logger.info("Operation completed", result_id=result.id)
    return result
except ValueError as ve:
    Logger.warning("Validation error", error=str(ve), input=user_input)
    raise
except Exception as e:
    Logger.error("Unexpected error", error=str(e))
    raise

# Pattern 2: Transaction Logging
Logger.info("Starting transaction", transaction_type="employee_update")
try:
    # ... database operations ...
    db.session.commit()
    Logger.info("Transaction committed", transaction_type="employee_update")
except Exception as e:
    db.session.rollback()
    Logger.error("Transaction rollback", transaction_type="employee_update", error=str(e))
    raise

# Pattern 3: Conditional Logging
if not employee:
    Logger.warning("Employee not found", employee_id=emp_id)
    return None

Logger.debug("Employee found", employee_id=emp_id, name=employee.name)
```

**Security Considerations:**
- ❌ **NEVER** log sensitive data (passwords, tokens, PII, credit cards)
- ✅ **DO** log IDs, operation names, error types
- ✅ **DO** sanitize or mask sensitive fields before logging

```python
# ❌ FORBIDDEN - Logging password
Logger.info("User login attempt", email=email, password=password)

# ✅ CORRECT - No sensitive data
Logger.info("User login attempt", email=email)

# ✅ CORRECT - Masked sensitive data
Logger.debug("Payment processing", card_last_4=card[-4:])
```

See [LOGGER_MIGRATION_GUIDE.md](.agent/LOGGER_MIGRATION_GUIDE.md) for complete migration instructions.


#### 2. ✅ ALWAYS Return a Value

**ALL service methods and functions MUST return a value.**

```python
# ✅ CORRECT - Return True when operation succeeds but has no data to return
def update_employee(emp_id: str, data: Dict) -> bool:
    employee = Employee.query.get(emp_id)
    employee.name = data['name']
    db.session.commit()
    return True  # ✅ Success indicator

# ✅ CORRECT - Return data when available
def get_employee(emp_id: str) -> Optional[Dict]:
    employee = Employee.query.get(emp_id)
    if not employee:
        return None  # ✅ Explicit None
    return {"id": employee.id, "name": employee.name}

# ✅ CORRECT - Return status for operations
def delete_employee(emp_id: str) -> bool:
    employee = Employee.query.get(emp_id)
    if not employee:
        return False  # ✅ Operation failed
    db.session.delete(employee)
    db.session.commit()
    return True  # ✅ Operation succeeded

# ❌ WRONG - No return value
def update_employee(emp_id: str, data: Dict):
    employee = Employee.query.get(emp_id)
    employee.name = data['name']
    db.session.commit()
    # ❌ Missing return statement
```

**Return Value Guidelines:**
- **Create/Update/Delete operations**: Return `True` on success, `False` on failure
- **Query operations**: Return data (Dict/List) or `None` if not found
- **Validation methods**: Return `bool` (True/False)
- **ID generation**: Return the generated ID (str/int)
- **Void operations**: Return `True` to indicate completion

### Service Class Structure
```python
class ServiceName:
    """Service for [description of service responsibility]."""
    
    @staticmethod
    def method_name(param1, param2):
        """
        Brief description of what this method does.
        
        Args:
            param1: Description of param1
            param2: Description of param2
            
        Returns:
            Description of return value
            
        Raises:
            ValueError: When validation fails
            Exception: When database error occurs
        """
        try:
            # Business logic here
            result = SomeModel.query.filter_by(id=param1).first()
            
            if not result:
                raise ValueError("Not found")
            
            db.session.commit()
            return result
            
        except Exception as e:
            db.session.rollback()
            print(f"Error in method_name: {e}")
            raise
```

### Transaction Management
```python
# ✅ Always use try-except-rollback pattern
try:
    # Multiple operations
    employee = Employee(...)
    db.session.add(employee)
    
    skill = EmployeeSkill(...)
    db.session.add(skill)
    
    db.session.commit()
    return employee.employee_id
    
except Exception as e:
    db.session.rollback()
    print(f"Error: {e}")
    raise
```

### Using flush() for ID Retrieval
```python
# ✅ Use flush() when you need auto-generated ID
new_leave = LeaveTransaction(
    employee_id=emp_id,
    leave_type='Sick'
)
db.session.add(new_leave)
db.session.flush()  # Gets leave_tran_id without committing

# Now you can use the ID
comp_off = CompOffTransaction(
    leave_tran_id=new_leave.leave_tran_id,  # ✅ ID is available
    ...
)
db.session.add(comp_off)
db.session.commit()
```

---

## Naming Conventions

### Python Code (snake_case)
```python
# ✅ Variables, functions, methods
employee_id = "EMP001"
first_name = "John"

def get_employee_details():
    pass

# ✅ Classes (PascalCase)
class EmployeeService:
    pass

# ✅ Constants (UPPER_SNAKE_CASE)
# Constants MUST be used for all fixed values (statuses, config, magic numbers).
# No hardcoded values are allowed in logic blocks. Use a centralized constant utility.
MAX_RETRY_COUNT = 3
DEFAULT_PAGE_SIZE = 50
```

### Database Models (snake_case for table/column names)
```python
class Employee(BaseModel):
    __tablename__ = 'employee'  # ✅ snake_case
    
    employee_id = db.Column(db.String(20), primary_key=True)  # ✅ snake_case
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
```

### API Endpoints (kebab-case)
```python
# ✅ Route naming
@bp.route('/employee-skills/<employee_id>', methods=['GET'])
@bp.route('/leave-transactions', methods=['POST'])
```

---

## Error Handling

### Comprehensive Error Handling Strategy

#### 1. Exception Hierarchy - Use Specific Exceptions

```python
# ✅ EXCELLENT - Specific exception types
def get_employee(emp_id: str) -> Dict:
    """
    Retrieves employee by ID.
    
    Raises:
        ValueError: If emp_id is invalid or empty
        PermissionError: If user lacks access to employee data
        LookupError: If employee not found
        DatabaseError: If database operation fails
    """
    if not emp_id or not emp_id.strip():
        Logger.error("Invalid employee ID provided", emp_id=emp_id)
        raise ValueError("Employee ID cannot be empty")
    
    if not has_permission(current_user, emp_id):
        Logger.warning("Permission denied for employee access", 
                      user=current_user, 
                      employee_id=emp_id)
        raise PermissionError(f"Access denied to employee {emp_id}")
    
    employee = Employee.query.filter_by(employee_id=emp_id).first()
    
    if not employee:
        Logger.warning("Employee not found", employee_id=emp_id)
        raise LookupError(f"Employee {emp_id} not found")
    
    return employee.to_dict()

# ❌ BAD - Generic exceptions
def get_employee(emp_id):
    employee = Employee.query.filter_by(employee_id=emp_id).first()
    if not employee:
        raise Exception("Error")  # ❌ Too generic, no context
```

#### 2. Validation Errors - Early and Clear

```python
# ✅ BEST PRACTICE - Validate early with clear messages
def create_employee(data: Dict) -> str:
    """Creates a new employee with comprehensive validation."""
    
    # Validate required fields
    required_fields = ['first_name', 'last_name', 'email', 'date_of_joining']
    missing = [f for f in required_fields if not data.get(f)]
    
    if missing:
        Logger.error("Missing required fields", fields=missing, data_keys=list(data.keys()))
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
    
    # Validate email format
    email = data['email']
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        Logger.error("Invalid email format", email=email)
        raise ValueError(f"Invalid email format: {email}")
    
    # Validate date format
    try:
        doj = datetime.strptime(data['date_of_joining'], '%Y-%m-%d')
        if doj > datetime.now():
            raise ValueError("Date of joining cannot be in the future")
    except ValueError as e:
        Logger.error("Invalid date format", date=data['date_of_joining'], error=str(e))
        raise ValueError(f"Invalid date format for date_of_joining: {str(e)}")
    
    # Business logic validation
    if Employee.query.filter_by(email=email).first():
        Logger.warning("Duplicate email detected", email=email)
        raise ValueError(f"Employee with email {email} already exists")
    
    # Proceed with creation
    Logger.info("Creating employee", email=email)
    # ... creation logic ...
```

#### 3. Database Error Handling - Rollback and Context

```python
# ✅ EXCELLENT - Comprehensive database error handling
def update_employee_with_skills(emp_id: str, data: Dict) -> bool:
    """
    Updates employee and their skills in a transaction.
    
    Returns:
        True if successful
        
    Raises:
        ValueError: If validation fails
        DatabaseError: If database operation fails
    """
    Logger.info("Starting employee update transaction", employee_id=emp_id)
    
    try:
        # Fetch employee
        employee = Employee.query.get(emp_id)
        if not employee:
            raise ValueError(f"Employee {emp_id} not found")
        
        # Update employee fields
        employee.first_name = data.get('first_name', employee.first_name)
        employee.last_name = data.get('last_name', employee.last_name)
        
        # Update skills
        if 'skills' in data:
            # Delete existing skills
            EmployeeSkill.query.filter_by(employee_id=emp_id).delete()
            
            # Add new skills
            for skill_id in data['skills']:
                new_skill = EmployeeSkill(
                    employee_id=emp_id,
                    skill_id=skill_id
                )
                db.session.add(new_skill)
        
        # Commit transaction
        db.session.commit()
        Logger.info("Employee update successful", employee_id=emp_id, updated_fields=list(data.keys()))
        return True
        
    except ValueError as ve:
        # Validation error - no rollback needed, just log and re-raise
        db.session.rollback()
        Logger.warning("Validation error during update", 
                      employee_id=emp_id, 
                      error=str(ve))
        raise
        
    except IntegrityError as ie:
        # Database constraint violation
        db.session.rollback()
        Logger.error("Database integrity error", 
                    employee_id=emp_id, 
                    error=str(ie),
                    constraint=ie.orig.args if hasattr(ie, 'orig') else None)
        raise DatabaseError(f"Database constraint violation: {str(ie)}")
        
    except SQLAlchemyError as se:
        # General database error
        db.session.rollback()
        Logger.critical("Database error during employee update", 
                       employee_id=emp_id, 
                       error=str(se),
                       error_type=type(se).__name__)
        raise DatabaseError(f"Database operation failed: {str(se)}")
        
    except Exception as e:
        # Unexpected error
        db.session.rollback()
        Logger.critical("Unexpected error during employee update", 
                       employee_id=emp_id, 
                       error=str(e),
                       error_type=type(e).__name__)
        raise

# Import at top of file
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
```

#### 4. Permission and Authorization Errors

```python
# ✅ BEST PRACTICE - Clear permission handling
def delete_employee(emp_id: str, current_user_id: str) -> bool:
    """
    Deletes an employee (HR admin only).
    
    Args:
        emp_id: Employee ID to delete
        current_user_id: ID of user performing deletion
        
    Returns:
        True if successful
        
    Raises:
        PermissionError: If user lacks HR admin role
        ValueError: If employee not found
    """
    # Check permissions
    user_roles = get_user_roles(current_user_id)
    if 'HR_ADMIN' not in user_roles:
        Logger.warning("Unauthorized delete attempt", 
                      user_id=current_user_id, 
                      target_employee_id=emp_id,
                      user_roles=user_roles)
        raise PermissionError("Only HR administrators can delete employees")
    
    # Validate employee exists
    employee = Employee.query.get(emp_id)
    if not employee:
        Logger.error("Delete failed - employee not found", 
                    employee_id=emp_id,
                    requested_by=current_user_id)
        raise ValueError(f"Employee {emp_id} not found")
    
    # Perform deletion
    try:
        db.session.delete(employee)
        db.session.commit()
        Logger.info("Employee deleted", 
                   employee_id=emp_id, 
                   deleted_by=current_user_id)
        return True
    except Exception as e:
        db.session.rollback()
        Logger.error("Error deleting employee", 
                    employee_id=emp_id, 
                    error=str(e))
        raise
```

#### 5. Error Recovery and Graceful Degradation

```python
# ✅ EXCELLENT - Try alternative approaches on failure
def get_employee_email(identifier: str) -> Optional[str]:
    """
    Gets employee email by ID or username with fallback strategies.
    
    Args:
        identifier: Employee ID or email address
        
    Returns:
        Email address if found, None otherwise
    """
    try:
        # Primary: Try as employee ID
        employee = Employee.query.filter_by(employee_id=identifier).first()
        if employee:
            Logger.debug("Employee found by ID", identifier=identifier)
            return employee.email
        
        # Fallback: Try as email
        employee = Employee.query.filter_by(email=identifier).first()
        if employee:
            Logger.debug("Employee found by email", identifier=identifier)
            return employee.email
        
        # Not found
        Logger.warning("Employee not found by any identifier", identifier=identifier)
        return None
        
    except SQLAlchemyError as e:
        # Database error - log but don't crash
        Logger.error("Database error in get_employee_email", 
                    identifier=identifier, 
                    error=str(e))
        # Return None for graceful degradation
        return None
    
    except Exception as e:
        # Unexpected error - log and return None
        Logger.critical("Unexpected error in get_employee_email", 
                       identifier=identifier, 
                       error=str(e))
        return None

# ✅ EXCELLENT - Retry logic for transient failures
def send_notification_with_retry(emp_id: str, message: str, max_retries: int = 3) -> bool:
    """Sends notification with exponential backoff retry."""
    import time
    
    for attempt in range(max_retries):
        try:
            # Attempt to send
            send_notification(emp_id, message)
            Logger.info("Notification sent successfully", 
                       employee_id=emp_id, 
                       attempt=attempt + 1)
            return True
            
        except ConnectionError as e:
            wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
            Logger.warning("Notification failed, retrying", 
                          employee_id=emp_id, 
                          attempt=attempt + 1,
                          max_retries=max_retries,
                          wait_time=wait_time,
                          error=str(e))
            
            if attempt < max_retries - 1:
                time.sleep(wait_time)
            else:
                Logger.error("Notification failed after all retries", 
                            employee_id=emp_id,
                            total_attempts=max_retries)
                raise
        
        except Exception as e:
            # Non-retryable error
            Logger.error("Non-retryable error sending notification", 
                        employee_id=emp_id, 
                        error=str(e))
            raise
    
    return False
```

#### 6. Contextual Error Messages

```python
# ✅ EXCELLENT - Rich context in error messages
class EmployeeService:
    
    @staticmethod
    def transfer_employee(emp_id: str, new_dept_id: str, transfer_date: str) -> bool:
        """Transfers employee to new department with validation."""
        
        # Build context for logging
        context = {
            'employee_id': emp_id,
            'new_department_id': new_dept_id,
            'transfer_date': transfer_date,
            'operation': 'employee_transfer'
        }
        
        Logger.info("Starting employee transfer", **context)
        
        try:
            # Validate employee
            employee = Employee.query.get(emp_id)
            if not employee:
                context['error_type'] = 'employee_not_found'
                Logger.error("Transfer failed - employee not found", **context)
                raise ValueError(f"Employee {emp_id} not found")
            
            context['current_department_id'] = employee.department_id
            context['employee_name'] = f"{employee.first_name} {employee.last_name}"
            
            # Validate new department
            department = Department.query.get(new_dept_id)
            if not department:
                context['error_type'] = 'department_not_found'
                Logger.error("Transfer failed - department not found", **context)
                raise ValueError(f"Department {new_dept_id} not found")
            
            context['department_name'] = department.name
            
            # Validate transfer date
            try:
                transfer_dt = datetime.strptime(transfer_date, '%Y-%m-%d')
                if transfer_dt < employee.date_of_joining:
                    raise ValueError("Transfer date cannot be before joining date")
            except ValueError as e:
                context['error_type'] = 'invalid_transfer_date'
                context['error'] = str(e)
                Logger.error("Transfer failed - invalid date", **context)
                raise ValueError(f"Invalid transfer date: {str(e)}")
            
            # Perform transfer
            employee.department_id = new_dept_id
            employee.transfer_date = transfer_dt
            db.session.commit()
            
            Logger.info("Employee transfer completed successfully", **context)
            return True
            
        except Exception as e:
            db.session.rollback()
            context['error'] = str(e)
            context['error_type'] = type(e).__name__
            Logger.error("Employee transfer failed", **context)
            raise
```

### Error Handling Checklist

When implementing error handling:

- [ ] Use specific exception types (ValueError, LookupError, PermissionError)
- [ ] Validate inputs early with clear error messages
- [ ] Always rollback database transactions on error
- [ ] Log errors with full context (IDs, values, operation name)
- [ ] Include error type and error message in logs
- [ ] Use try-except-finally for resource cleanup
- [ ] Implement retry logic for transient failures
- [ ] Provide graceful degradation where possible
- [ ] Never expose sensitive data in error messages
- [ ] Return meaningful values (True/False/None) instead of void
```

---

## Security Best Practices

### 1. ❌ NEVER Use f-strings or String Concatenation in SQL
```python
# ❌ SQL INJECTION VULNERABILITY
column_name = request.args.get('column')
query = text(f"UPDATE table SET {column_name} = :value")  # DANGEROUS!

# ✅ Use ORM with setattr for dynamic columns
column_name = policy_column_map.get(policy_name)  # Validate against whitelist
setattr(record, column_name, value)
db.session.commit()
```

### 2. Input Validation
```python
# ✅ Always validate user input
ALLOWED_STATUSES = ['Active', 'Inactive', 'Pending']

if status not in ALLOWED_STATUSES:
    raise ValueError(f"Invalid status: {status}")
```

### 3. Parameterized Queries (if raw SQL is unavoidable)
```python
# ✅ Always use parameterized queries
query = text("SELECT * FROM employee WHERE employee_id = :id")
result = db.session.execute(query, {"id": employee_id})

# ❌ NEVER concatenate strings
query = f"SELECT * FROM employee WHERE employee_id = '{employee_id}'"  # DANGEROUS!
```

---

## Documentation Standards

### Concise Docstring Requirements

Every public function, method, and class MUST have a brief, clear docstring that describes what it does.

#### 1. Function Docstrings - Keep It Simple

```python
# ✅ EXCELLENT - Concise and clear
def get_employee(emp_id: str) -> Optional[Dict]:
    """Retrieves employee details by ID."""
    employee = Employee.query.filter_by(employee_id=emp_id).first()
    if not employee:
        return None
    return employee.to_dict()

def create_employee(emp_data: Dict[str, Any]) -> str:
    """Creates a new employee and returns the generated employee ID."""
    employee = Employee(**emp_data)
    db.session.add(employee)
    db.session.commit()
    return employee.employee_id

def update_project(project_id: int, **kwargs) -> bool:
    """Updates project fields selectively, ignoring null/empty values."""
    project = Project.query.get(project_id)
    if not project:
        return False
    for key, value in kwargs.items():
        if value:  # Only update non-empty values
            setattr(project, key, value)
    db.session.commit()
    return True

# ✅ GOOD - Two lines for complex operations
def transfer_employee_with_approvals(emp_id: str, new_dept: str, transfer_date: date) -> bool:
    """
    Transfers employee to new department with manager approval.
    Updates all related records including leaves, allocations, and access permissions.
    """
    # Implementation
    pass

# ❌ BAD - Too verbose with unnecessary details
def get_employee(emp_id: str) -> Optional[Dict]:
    """
    Retrieves employee details by ID.
    
    This function queries the employee table using SQLAlchemy ORM
    and returns a dictionary representation of the employee record.
    
    Args:
        emp_id: The unique employee identifier string
        
    Returns:
        Dictionary containing employee information or None if not found
        
    Raises:
        DatabaseError: If query fails
        
    Example:
        >>> emp = get_employee('EMP001')
        >>> print(emp['name'])
    """
    # ❌ Docstring is longer than the actual code!
    pass

# ❌ BAD - Missing docstring
def get_employee(emp_id):
    pass
```

#### 2. Class Docstrings

```python
# ✅ EXCELLENT - Brief class description
class EmployeeService:
    """Handles employee CRUD operations and lifecycle management."""
    
    @staticmethod
    def get_all_employees():
        """Returns list of all active employees."""
        pass

# ✅ GOOD - Two lines for complex services
class ReviewService:
    """
    Manages skill reviews and evaluations.
    Handles review creation, updates, and aggregation of scores.
    """
    pass

# ❌ BAD - Too verbose
class EmployeeService:
    """
    Service layer for employee-related business operations.
    
    This service handles all employee CRUD operations, skill management,
    and employee lifecycle events (onboarding, transfers, offboarding).
    All methods use SQLAlchemy ORM and centralized logging.
    
    Attributes:
        None (all methods are static)
    
    Example Usage:
        >>> emp_id = EmployeeService.create_employee(emp_data)
        >>> employee = EmployeeService.get_employee('EMP001')
    """
    # ❌ Too much information
    pass
```

#### 3. Important Rules

**✅ DO:**
- Keep docstrings to 1-2 lines maximum
- Describe what the function DOES, not how it works
- Focus on the current implementation
- Use simple, clear language
- Use type hints instead of documenting parameter types

**❌ DON'T:**
- Include Args, Returns, Raises sections (type hints cover this)
- Add examples in docstrings (code should be self-explanatory)
- Reference legacy systems, stored procedures, or migration details
- Explain implementation details (put those in code comments)
- Write docstrings longer than the function itself

#### 4. Type Hints Replace Verbose Docs

```python
# ✅ EXCELLENT - Type hints + concise docstring
def save_review(
    employee_id: str,
    skill_id: str,
    score: float,
    evaluator_id: str,
    comments: Optional[str] = None
) -> Dict[str, Any]:
    """Saves or updates a skill review for an employee."""
    # Type hints tell you what parameters are needed
    # Docstring tells you what it does
    pass

# ❌ BAD - Repeating what type hints already say
def save_review(
    employee_id: str,
    skill_id: str,
    score: float,
    evaluator_id: str,
    comments: Optional[str] = None
) -> Dict[str, Any]:
    """
    Saves or updates a skill review.
    
    Args:
        employee_id (str): Employee being reviewed
        skill_id (str): Skill being evaluated  
        score (float): Evaluation score
        evaluator_id (str): Employee conducting review
        comments (Optional[str]): Feedback text
        
    Returns:
        Dict[str, Any]: Review data dictionary
    """
    # ❌ All of this is already in the type hints!
    pass
```

#### 5. When to Use Comments Instead

Use inline comments for implementation details, not docstrings:

```python
def update_employee_selective(emp_id: str, updates: Dict) -> bool:
    """Updates employee with selective field validation."""
    
    employee = Employee.query.get(emp_id)
    if not employee:
        return False
    
    # Only update fields that are not null, empty, or the string 'string'
    # This replicates legacy stored procedure logic
    for field, value in updates.items():
        if value and str(value).lower() != 'string':
            setattr(employee, field, value)
    
    db.session.commit()
    return True
```

**Key Points:**
- Docstring: What the function does (1 line)
- Comments: How/why specific logic works
- Legacy references: In comments, not docstrings

#### 2. Class Docstrings

```python
# ✅ EXCELLENT - Comprehensive class documentation
class EmployeeService:
    """
    Service layer for employee-related business operations.
    
    This service handles all employee CRUD operations, skill management,
    and employee lifecycle events (onboarding, transfers, offboarding).
    All methods use SQLAlchemy ORM and centralized logging.
    
    Attributes:
        None (all methods are static)
    
    Example Usage:
        >>> # Create new employee
        >>> emp_id = EmployeeService.create_employee(emp_data, skills, 'MGR001')
        >>>
        >>> # Get employee details
        >>> employee = EmployeeService.get_employee('EMP001')
        >>>
        >>> # Update employee
        >>> success = EmployeeService.update_employee('EMP001', updated_data)
    
    Note:
        All database operations use transactions with automatic rollback on error.
        All methods log operations using Logger with appropriate context.
        
    See Also:
        LeaveService: For leave management operations
        SkillsService: For skill catalog management
    """
    
    # Class implementation
    pass
```

#### 3. Method Docstrings with Type Hints

```python
from typing import Dict, List, Optional, Tuple, Union

# ✅ EXCELLENT - Type hints + detailed docstring
class ReviewService:
    
    @staticmethod
    def save_review(
        employee_id: str,
        skill_id: str,
        evaluator_id: str,
        score: float,
        comments: Optional[str] = None,
        is_ready: bool = False
    ) -> Dict[str, Union[str, float, bool]]:
        """
        Saves or updates a skill review for an employee.
        
        Creates a new review record or updates an existing one if a review
        already exists for the same employee-skill combination.
        
        Args:
            employee_id: Employee being reviewed
            skill_id: Skill being evaluated
            evaluator_id: Employee conducting the review (must be assigned evaluator)
            score: Evaluation score between 0.0 and 5.0 (inclusive)
            comments: Optional feedback text. Max 500 characters. Defaults to empty string.
            is_ready: Whether employee is production-ready for this skill. Default False.
        
        Returns:
            Dictionary containing:
            - review_id (str): Unique identifier for the review
            - employee_id (str): ID of employee reviewed
            - evaluator_name (str): Full name of evaluator
            - score (float): The evaluation score
            - status (str): Review status ('Reviewed' or 'Pending')
            - is_new (bool): True if this is a first-time review
        
        Raises:
            ValueError: If score is not between 0-5 or IDs are invalid
            PermissionError: If evaluator is not assigned to employee
            DatabaseError: If save operation fails
        
        Example:
            >>> result = ReviewService.save_review(
            ...     employee_id='EMP001',
            ...     skill_id='PYTHON',
            ...     evaluator_id='MGR001',
            ...     score=4.5,
            ...     comments='Strong Python skills',
            ...     is_ready=True
            ... )
            >>> print(result['review_id'])
            REV-12345-ABCD
        """
        pass
```

#### 4. Parameter Documentation Best Practices

```python
# ✅ EXCELLENT - Detailed parameter descriptions
def allocate_project_resources(
    project_id: str,
    resources: List[Dict[str, Any]],
    start_date: str,
    end_date: Optional[str] = None,
    allocation_type: str = 'percentage'
) -> bool:
    """
    Allocates multiple resources to a project with date ranges.
    
    Args:
        project_id: Unique project identifier. Must be an active project.
        
        resources: List of resource allocation dictionaries, each containing:
            - employee_id (str): Employee to allocate (required)
            - allocation (float): Allocation amount (required)
                * If allocation_type='percentage': 0-100 representing percentage
                * If allocation_type='hours': Number of hours per week
            - role (str): Role on project (optional, e.g., 'Developer', 'Lead')
            - billable (bool): Whether this allocation is billable (default True)
        
        start_date: Allocation start date in 'YYYY-MM-DD' format. Cannot be in past.
        
        end_date: Allocation end date in 'YYYY-MM-DD' format. Optional.
            If None, allocation continues until explicitly ended.
            Must be after start_date if provided.
        
        allocation_type: Type of allocation measurement. Must be one of:
            - 'percentage': Allocation is percentage of employee's time (0-100)
            - 'hours': Allocation is hours per week
            Default is 'percentage'.
    
    Returns:
        True if all allocations were successful, False otherwise.
        
    Raises:
        ValueError: If:
            - Invalid date format or date range
            - allocation_type not in ['percentage', 'hours']
            - Allocation percentage > 100
            - Empty resources list
        LookupError: If project_id or any employee_id doesn't exist
        IntegrityError: If employee is already allocated to conflicting project
    """
    pass
```

### Inline Comments - When and How

#### 1. Comment Complex Logic

Comments should be **concise** and explain the **"why"**, not the "what". Avoid verbose comments that restate the code or take up excessive lines.

```python
# ✅ EXCELLENT - Explain WHY, not WHAT
def calculate_leave_balance(emp_id: str, year: int) -> Dict[str, float]:
    """Calculates leave balance for employee in given year."""
    
    # Get base entitlement based on employee tenure
    # Employees get 1 extra leave day per year of service (max 5 extra days)
    tenure_years = get_employee_tenure_years(emp_id)
    base_leaves = 20  # Standard entitlement
    tenure_bonus = min(tenure_years, 5)  # Cap at 5 bonus days
    total_entitled = base_leaves + tenure_bonus
    
    # Fetch all leave transactions for the year
    # Include both approved and pending leaves to show committed balance
    transactions = LeaveTransaction.query.filter(
        LeaveTransaction.employee_id == emp_id,
        func.extract('year', LeaveTransaction.from_date) == year,
        LeaveTransaction.status.in_(['Approved', 'Pending'])
    ).all()
    
    # Calculate used leaves
    # Note: Half-day leaves count as 0.5 days
    total_used = sum(t.no_of_days for t in transactions)
    
    # Carry forward from previous year (max 5 days can be carried)
    # Only approved leaves from Dec can be carried forward
    carry_forward = get_carry_forward_leaves(emp_id, year - 1)
    carry_forward = min(carry_forward, 5)  # Enforce max carry forward
    
    return {
        'total_entitled': total_entitled + carry_forward,
        'used': total_used,
        'available': (total_entitled + carry_forward) - total_used,
        'carry_forward': carry_forward
    }

# ❌ BAD - Obvious comments that restate code
def get_employee(emp_id):
    # Get employee from database  # ❌ Obvious
    employee = Employee.query.get(emp_id)
    
    # Check if employee exists  # ❌ Obvious
    if not employee:
        return None
    
    # Return employee  # ❌ Obvious
    return employee
```

#### 2. Mark TODOs and FIXMEs Properly

```python
# ✅ CORRECT - Structured technical debt markers
def process_payroll(month: int, year: int):
    """Processes monthly payroll for all employees."""
    
    # TODO(username, 2025-01-15): Optimize query performance
    # Current query loads all employees into memory. Consider pagination
    # or batch processing for large employee counts (>1000).
    # Ticket: HRMS-456
    employees = Employee.query.filter_by(employment_status='Active').all()
    
    # FIXME(username, 2025-01-10): Handle timezone conversion properly
    # Currently assumes UTC, but should use company timezone from config.
    # This causes incorrect date comparisons for 23:00-01:00 UTC range.
    # Ticket: HRMS-789
    current_time = datetime.utcnow()
    
    # HACK: Temporary workaround for tax calculation bug
    # Remove this once tax service API is fixed (expected: 2025-02-01)
    # See: https://github.com/company/tax-service/issues/123
    if tax_amount < 0:
        tax_amount = 0
    
    # NOTE: This logic changed in v2.3 to accommodate new labor laws
    # Previous logic kept for reference in git history (commit abc123)
    if overtime_hours > 40:
        overtime_rate = 1.5
    
    # WARNING: This section is performance-critical
    # Any changes here must be load-tested with 10k+ employees
    for emp in employees:
        calculate_salary(emp)
```

#### 3. Document Magic Numbers and Constants

```python
# ✅ EXCELLENT - Explain magic numbers
class LeaveConstants:
    """Leave policy constants."""
    
    # Standard leave entitlement per year
    BASE_ANNUAL_LEAVES = 20
    
    # Maximum carry-forward leaves as per company policy (2023 revision)
    MAX_CARRY_FORWARD = 5
    
    # Probation period in days (as per HR policy v3.2)
    PROBATION_DAYS = 90
    
    # Maximum notice period in days for different levels
    # Junior: 30 days, Senior: 60 days, Lead: 90 days
    MAX_NOTICE_PERIOD = {
        'Junior': 30,
        'Senior': 60,
        'Lead': 90
    }

def check_leave_eligibility(emp_id: str) -> bool:
    """Checks if employee is eligible to apply for leaves."""
    
    employee = Employee.query.get(emp_id)
    days_employed = (datetime.now() - employee.date_of_joining).days
    
    # Employees must complete probation before applying for leaves
    # Exception: Medical emergencies (handled separately)
    if days_employed < LeaveConstants.PROBATION_DAYS:
        Logger.warning("Leave application during probation", 
                      employee_id=emp_id,
                      days_employed=days_employed,
                      required_days=LeaveConstants.PROBATION_DAYS)
        return False
    
    return True

# ❌ BAD - Unexplained magic numbers
def check_leave_eligibility(emp_id):
    employee = Employee.query.get(emp_id)
    days_employed = (datetime.now() - employee.date_of_joining).days
    
    if days_employed < 90:  # ❌ What is 90? Why 90?
        return False
    
    return True
```

#### 4. Section Comments for Long Functions

```python
# ✅ EXCELLENT - Use section comments for long complex functions
def process_employee_onboarding(emp_data: Dict) -> str:
    """
    Complete employee onboarding process.
    
    Handles all steps from employee creation to first-day setup.
    """
    Logger.info("Starting employee onboarding", email=emp_data.get('email'))
    
    #############################################################################
    # STEP 1: Validate and create employee record
    #############################################################################
    
    # Validate all required fields
    validate_employee_data(emp_data)
    
    # Check for duplicates
    if Employee.query.filter_by(email=emp_data['email']).first():
        raise ValueError(f"Employee with email {emp_data['email']} already exists")
    
    # Create employee
    employee = Employee(**emp_data)
    db.session.add(employee)
    db.session.flush()  # Get employee_id
    emp_id = employee.employee_id
    
    #############################################################################
    # STEP 2: Set up access and permissions
    #############################################################################
    
    # Generate login credentials
    username = generate_username(emp_data['first_name'], emp_data['last_name'])
    password = generate_random_password()
    
    # Create credentials record
    credentials = EmployeeCredentials(
        employee_id=emp_id,
        username=username,
        password=hash_password(password)
    )
    db.session.add(credentials)
    
    # Assign default role
    assign_role(emp_id, 'EMPLOYEE')
    
    #############################################################################
    # STEP 3: Send welcome communications
    #############################################################################
    
    # Send welcome email with credentials
    send_welcome_email(
        to=emp_data['email'],
        name=f"{emp_data['first_name']} {emp_data['last_name']}",
        username=username,
        temporary_password=password
    )
    
    # Notify HR and manager
    notify_onboarding_completion(emp_id, emp_data.get('manager_id'))
    
    #############################################################################
    # STEP 4: Finalize and log
    #############################################################################
    
    db.session.commit()
    Logger.info("Employee onboarding completed", employee_id=emp_id)
    
    return emp_id
```

### Documentation Checklist

When writing documentation:

- [ ] Every public function/method has a complete docstring
- [ ] Docstrings follow Google style (Summary, Args, Returns, Raises, Example)
- [ ] All parameters are documented with type and description
- [ ] Return values are fully described including structure
- [ ] All possible exceptions are documented
- [ ] Complex business logic has explanatory comments
- [ ] Magic
```

---

## Testing Guidelines

### Mandatory Testing
**ALL** functions and business logic blocks **MUST** have associated automated tests implemented. No code should be merged without verifying coverage for new logic.

### Unit Test Structure
```python
import unittest
from app import create_app, db
from app.models.hr import Employee

class TestEmployeeService(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
    def tearDown(self):
        """Clean up after each test method."""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        
    def test_get_employee_by_id(self):
        """Test retrieving employee by ID."""
        # Arrange
        emp = Employee(employee_id='EMP001', first_name='John')
        db.session.add(emp)
        db.session.commit()
        
        # Act
        result = EmployeeService.get_employee('EMP001')
        
        # Assert
        self.assertEqual(result.first_name, 'John')
```

---

## Migration Checklist

When adding new features or refactoring, ensure:

- [ ] **ALL services use centralized Logger** (NO print() statements allowed)
- [ ] **ALL methods return a value** (return True if no other value)
- [ ] All database queries use SQLAlchemy ORM
- [ ] No raw SQL except for stored procedures
- [ ] No f-string SQL (SQL injection risk)
- [ ] Proper error handling with try-except-rollback
- [ ] Logger.error() calls in all except blocks with context
- [ ] Input validation for all user inputs
- [ ] Docstrings for all public methods
- [ ] snake_case naming for Python variables
- [ ] Type hints for function parameters and returns
- [ ] Transaction management (commit/rollback)
- [ ] Proper use of `flush()` when IDs needed before commit
- [ ] Unit tests for new functionality

---

## Quick Reference Commands

### Common ORM Patterns

```python
# Query
Model.query.filter_by(column=value).first()
Model.query.filter(Model.column > value).all()
Model.query.get(primary_key)

# Insert
obj = Model(column1=value1, column2=value2)
db.session.add(obj)
db.session.commit()

# Update
obj = Model.query.get(pk)
obj.column = new_value
db.session.commit()

# Delete
obj = Model.query.get(pk)
db.session.delete(obj)
db.session.commit()

# Bulk delete
Model.query.filter_by(column=value).delete()
db.session.commit()

# JOIN
db.session.query(Model1, Model2).join(Model2).all()

# Aggregation
db.session.query(func.count(Model.id)).scalar()

# Exists
exists = Model.query.filter_by(id=value).first() is not None
```

---

## Version History

- **v1.1** (2025-12-30): Added mandatory requirements
  - **REQUIRED**: Centralized Logger for all services and controllers
  - **REQUIRED**: All methods must return a value (True if no other value)
  - Updated migration checklist with new requirements
  
- **v1.0** (2025-12-30): Initial coding guidelines based on ORM migration project
  - Established ORM-first approach
  - Security best practices for SQL injection prevention
  - Service layer patterns
  - Naming conventions standardization

---

**Remember:** When in doubt, use ORM. Raw SQL should be the exception, not the rule.
