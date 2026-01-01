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

# Frontend route permissions - defines which roles can access each frontend route
FRONTEND_ROUTE_PERMISSIONS = {
    # Common routes - accessible to all authenticated users
    "/": ["Admin", "HR", "Lead", "Employee"],
    "/dashboard": ["Admin", "HR", "Lead", "Employee"],
    "/leave": ["Lead", "Employee"],
    "/holiday": ["Admin", "HR", "Lead", "Employee"],
    "/personal-info": ["Admin", "HR", "Lead", "Employee"],
    "/company-policy": ["Admin", "HR", "Lead", "Employee"],
    
    # Team/Lead management routes
    "/teamLeaveManagement": ["Admin", "HR", "Lead"],
    "/goalSeetingForm": ["Admin", "HR", "Lead"],
    
    # HR-only routes
    "/HRLeaveManagement": ["Admin", "HR"],
    "/EmployeeData": ["Admin", "HR"],
    "/allLeaveRecords": ["Admin", "HR"],
    "/updateLeaveApprover": ["Admin", "HR"],
    "/MasterHR": ["Admin", "HR"],
    "/salarySlipUpload": ["Admin", "HR"],
    "/MonthlyReport": ["Admin", "HR"],
    "/SkillTracking": ["Admin", "HR"],
    "/AllDocumentRecords": ["Admin", "HR"],
    "/ScoreCards": ["Admin", "HR"],
    "/EmployeesSkillEvaluationList": ["Admin", "HR"],
    "/goalSetting": ["Admin", "HR"],
    "/RelievingLetter": ["Admin", "HR"],
    "/PCsPage": ["Admin", "HR"],
    "/Assignments": ["Admin", "HR"],
    "/Maintenance": ["Admin", "HR"],
    "/Accessibility": ["Admin", "HR"],
}

# Default roles for everything if not specified (optional safety net)
DEFAULT_ROLES = ["Admin"]
