"""
Centralized constants for the HRMS-LMS Flask backend.
"""

class LeaveStatus:
    PENDING = 'Pending'
    APPROVED = 'Approved'
    REJECTED = 'Rejected'
    CANCELLED = 'Cancelled'
    PARTIAL_APPROVED = 'Partial Approved'
    CANCEL = 'Cancel'

class LeaveTypeName:
    SICK = 'Sick Leave'
    PRIVILEGE = 'Privilege Leave'
    WFH = 'WFH'
    COMP_OFF = 'Comp-Off'
    CASUAL = 'Casual Leave'

class LeaveTypeID:
    SICK = 1
    PRIVILEGE = 2
    WFH = 3
    COMP_OFF = 4
    CASUAL = 5
    WORKING_LATE = 9
    LEAVE_WITHOUT_PAY = 12
    UNPAID_LEAVE = 13

class EmployeeStatus:
    ACTIVE = 'Active'
    TERMINATED = 'Terminated'
    RELIEVED = 'Relieved'
    ABSCONDING = 'Absconding'
    PROBATION = 'Probation'
    INTERN = 'Intern'

class Roles:
    ADMIN = 'Admin'
    HR = 'HR'
    LEAD = 'Lead'
    EMPLOYEE = 'Employee'

class FinancialYear:
    """Financial year constants."""
    START_MONTH = 4  # April
    START_DAY = 1


class EmailConfig:
    """Email service configuration constants."""
    
    # Special case email redirects for specific employees
    # Maps original email -> redirect email
    SPECIAL_CASE_REDIRECTS = {
        "swapnil.katarnavare@flairminds.com": "shrinivas.sarmane@flairminds.com",
        "ganesh.phutane@flairminds.com": "shrinivas.sarmane@flairminds.com"
    }
    
    # Employee IDs to exclude from attendance reports
    EXCLUDED_EMPLOYEE_IDS = ['EMP101', 'EMP54', 'EMP46', 'EMP47', 'EMP330']
    
    # Specific logic helpers for LeaveService
    FY_2024_START = '2024-04-01'
    FY_2024_END = '2025-03-31'
    FY_2025_START = '2025-04-01'
