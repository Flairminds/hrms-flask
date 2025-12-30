---
description: Automatically reviews all code module-wise and file-wise based on coding guidelines, efficiency, and security.
---

# Automated Code Review Workflow

This workflow performs a comprehensive review of the codebase. It analyzes code based on the [CODING_GUIDELINES.md], efficiency, and security standards.

## Steps

1. **Initialize Review Report**
   - Create a new file in `/docs/reviews/` named `REVIEW_YYYY_MM_DD.md` (e.g., `reviews/REVIEW_2025_12_30.md`).
   - Use the template structure below for consistency.

2. **Module-wise Analysis**
   
   **Services Layer (`app/services/`)**:
   - For each service file (including sub-packages like `hr/`, `leave/`, `document/`):
     - Check file length (❌ if > 1000 lines, ✅ if within limit)
     - Verify no f-string SQL injection vulnerabilities (Security column)
     - Confirm use of centralized Logger (Logging column)
     - Check if hardcoded values are replaced with constants (Constants column)
     - Verify associated test file exists in `tests/` (Tests column)
     - Record specific findings and observations
   
   **Controllers Layer (`app/controllers/`)**:
   - For each controller file:
     - Check file length
     - Verify comprehensive error handling with try-except blocks
     - Confirm consistent response format (jsonify)
     - Document any issues or improvements needed
   
   **Routes Layer (`app/routes/`)**:
   - For each route file:
     - Verify all endpoints use kebab-case naming
     - Confirm proper authentication decorators (`@roles_required`)
     - Check for any non-standard route patterns
   
   **Models Layer (`app/models/`)**:
   - Verify snake_case for table and column names
     - Check for proper base model inheritance (`BaseModel`, `AuditMixin`)
     - Confirm all relationships are properly defined
   
   **Utils Layer (`app/utils/`)**:
   - Check for centralized constants usage
     - Verify logger implementation follows guidelines
     - Confirm helper functions are properly documented

3. **Record Findings in Tables**
   
   Use the following table formats:
   
   **Services Table**:
   ```markdown
   | File | Length | Security | Logging | Constants | Tests | Findings |
   | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
   | `service_name.py` | ### | ✅/❌ | ✅/❌/[ ] | ✅/❌/[ ] | ✅/[ ] | Brief findings |
   ```
   
   **Controllers Table**:
   ```markdown
   | File | Length | Error Handling | Response Format | Findings |
   | :--- | :--- | :--- | :--- | :--- |
   | `controller_name.py` | ### | ✅/❌/[ ] | ✅/❌/[ ] | Brief findings |
   ```
   
   **Routes Table**:
   ```markdown
   | File | kebab-case | Auth | Findings |
   | :--- | :--- | :--- | :--- |
   | `route_name.py` | ✅/❌ | ✅/❌ | Brief findings |
   ```

4. **Compile Critical Findings**
   - Create a numbered list of critical issues:
     1. Files exceeding 1000 lines (with actual line count)
     2. Security vulnerabilities (SQL injection, exposed credentials, etc.)
     3. Missing tests for core business logic
     4. Hardcoded values that should be constants
     5. Missing or inadequate error handling
     6. Performance bottlenecks (N+1 queries, missing indexes, etc.)

5. **Generate Recommendations**
   - Create an actionable checklist with specific recommendations:
     - [ ] Specific refactoring task
     - [ ] Security fix needed
     - [ ] Test coverage improvement
     - [ ] Performance optimization

6. **Completion**
   - Update the status from "In Progress [/]" to "Completed [x]"
   - Add a "Codebase Health Summary" with overall assessment
   - Notify the user with the path to the generated review report

---

## Report Template Structure

```markdown
# Code Review Report - YYYY-MM-DD

**Date**: YYYY-MM-DD HH:MM:SS
**Status**: In Progress [/]

## Codebase Health Summary
[To be filled after analysis - provide overall assessment, health score, critical issues count]

---

## Module-wise Analysis

### Services Layer (`app/services/`)
Analysis of business logic and service implementations.

| File | Length | Security | Logging | Constants | Tests | Findings |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `service.py` | ### | ✅/❌ | ✅/❌ | ✅/❌ | ✅/[ ] | ... |

### Controllers Layer (`app/controllers/`)
Analysis of API request handlers and coordination.

| File | Length | Error Handling | Response Format | Findings |
| :--- | :--- | :--- | :--- | :--- |
| `controller.py` | ### | ✅/❌ | ✅/❌ | ... |

### Routes Layer (`app/routes/`)
Analysis of endpoint definitions and routing.

| File | kebab-case | Auth | Findings |
| :--- | :--- | :--- | :--- |
| `route.py` | ✅/❌ | ✅/❌ | ... |

### Models Layer (`app/models/`)
Analysis of database models and schemas.

| File | Length | Naming | Base Model | Findings |
| :--- | :--- | :--- | :--- | :--- |
| `model.py` | ### | ✅/❌ | ✅/❌ | ... |

### Utils Layer (`app/utils/`)
Analysis of utility functions and helpers.

| File | Purpose | Standards | Findings |
| :--- | :--- | :--- | :--- |
| `util.py` | ... | ✅/❌ | ... |

---

## Critical Findings
1. **Issue Category**: Description with file reference and line numbers if applicable
2. **Issue Category**: Description
3. ...

---

## Recommendations
- [ ] Specific actionable recommendation
- [ ] Another recommendation
- [ ] ...
```

// turbo
To trigger this workflow, run the `/code-review` command.