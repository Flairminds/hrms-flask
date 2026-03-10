"""
Centralized constants for the HRMS-LMS Flask backend.
"""

class LeaveStatus:
    PENDING = 'Pending'
    APPROVED = 'Approved'
    REJECTED = 'Rejected'
    CANCELLED = 'Cancelled'
    PARTIAL_APPROVED = 'Partially Approved'

class LeaveTypeName:
    SICK_LEAVE = 'Sick/Emergency Leave'
    PRIVILEGE_LEAVE = 'Privilege Leave'
    WFH = 'Work From Home'
    CUSTOMER_APPROVED_COMP_OFF = 'Customer Approved Comp-off'
    CUSTOMER_APPROVED_WFH = 'Customer Approved Work From Home'
    CUSTOMER_HOLIDAY = 'Customer Holiday'
    WORKING_LATE_TODAY = 'Working Late Today'
    VISITING_CLIENT_LOCATION = 'Visiting Client Location'
    CASUAL_LEAVE = 'Casual Leave'
    SWAP_LEAVE = 'Swap Leave'
    EXEMPT_WFH = 'Exempt Work From Home'
    UNPAID_SICK_LEAVE = 'Unpaid Sick/Emergency Leave'
    UNPAID_PRIVILEGE_LEAVE = 'Unpaid Privilege Leave'
    MISSED_DOOR_ENTRY = 'Missed Door Entry'
    UNPAID_LEAVE = 'Unpaid Leave'

class LeaveTypeID:
    SICK = 1
    PRIVILEGE = 2
    WFH = 3
    COMP_OFF = 4
    CASUAL = 5
    WORKING_LATE = 9
    UNPAID_LEAVE = 15
    # Leave without pay can map to 15 as well or be separate, keeping current ones for legacy if needed
    LEAVE_WITHOUT_PAY = 12 

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

class LeaveConfiguration:
    PRIVILEGE_LEAVE = {
        'name': 'Privilege Leave',
        'allocation_type': 'yearly',
        'deduction_type': None,
        'carry_forward': True,
        'default_allocation': 12
    }
    SICK_LEAVE = {
        'name': 'Sick Leave',
        'allocation_type': 'quarterly',
        'deduction_type': None,
        'carry_forward': False,
        'default_allocation': 2
    }
    WFH = {
        'name': 'Work From Home',
        'allocation_type': 'yearly',
        'deduction_type': 'monthly',
        'carry_forward': False,
        'default_allocation': 36,
        'monthly_deduction': 3,
    }


class EmailConfig:
    """Email service configuration constants."""
    
    # Default team lead for new employees
    DEFAULT_TEAM_LEAD_EMAIL = 'hr@flairminds.com'
    
    # Secondary Approver for multi-level approval (e.g., Customer Approved WFH)
    SECONDARY_LEAVE_APPROVER_EMAIL = 'hr@flairminds.com'
    
    # Global CC list for leave notifications
    LEAVE_NOTIFICATION_CC = ['hr@flairminds.com', 'priyanka.mandale@flairminds.com']

    REVIEW_ALERT_CC = ['hr@flairminds.com', 'priyanka.mandale@flairminds.com', 'shishir.nigam@flairminds.com']

class IgnoreEmployees:
    IGNORE_FOR_ATTENDANCE = [
        'hr@flairminds.com', 
        'hasmukh@flairminds.com', 
        'barun.sharma@flairminds.com',
        'yogesh.amritkar@flairminds.com',
        'shrinivas.sarmane@flairminds.com',
        'shishir.nigam@flairminds.com'
    ]

    IGNORE_FOR_REVIEWS = [
        'hr@flairminds.com', 
        'hasmukh@flairminds.com', 
        'barun.sharma@flairminds.com', 
        'yogesh.amritkar@flairminds.com',
        'shrinivas.sarmane@flairminds.com',
        'shishir.nigam@flairminds.com'
    ]

    IGNORE_FOR_PROJECTS = [
        'hr@flairminds.com',
        'hasmukh@flairminds.com',
        'priyanka.mandale@flairminds.com',
        'shishir.nigam@flairminds.com'
    ]
