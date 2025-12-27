# Role-Based Access Control Configuration
# Defines which roles have access to specific blueprints or endpoints

ROLE_PERMISSIONS = {
    "account": ["Admin", "HR", "Lead", "Employee"], # Mostly public or self-service
    "leave": {
        "get_types_and_approver": ["Admin", "HR", "Lead", "Employee"],
        "get_leave_details": ["Admin", "HR", "Lead", "Employee"],
        "insert_leave": ["Admin", "HR", "Lead", "Employee"],
        "update_status": ["Admin", "HR", "Lead"], # Only leads/HR can approve
        "get_holidays": ["Admin", "HR", "Lead", "Employee"]
    },
    "hr": ["Admin", "HR"],
    "assets": ["Admin", "HR"],
    "profile": ["Admin", "HR", "Lead", "Employee"], # Self-service
    "feedback": {
        "get_emp_report": ["Admin", "HR", "Lead", "Employee"],
        "add_emp_report": ["Admin", "HR", "Lead"] # Only leads/HR usually add reports
    }
}

# Default roles for everything if not specified (optional safety net)
DEFAULT_ROLES = ["Admin"]
