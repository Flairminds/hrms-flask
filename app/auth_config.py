# Role-Based Access Control Configuration
# Defines which roles have access to specific blueprints or endpoints
# Expanded to show individual routes under each module for granular permission control

ROLE_PERMISSIONS = {
    # ===========================
    # Account Module - Authentication & User Management
    # ===========================
    "account": {
        "login": ["Admin", "HR", "Lead", "Employee"],  # Public endpoint
        "send_otp": ["Admin", "HR", "Lead", "Employee"],  # Password reset
        "verify_otp": ["Admin", "HR", "Lead", "Employee"],  # Password reset
        "reset_password": ["Admin", "HR", "Lead", "Employee"],  # Password reset
        "me": ["Admin", "HR", "Lead", "Employee"]  # Get current user info
    },
    
    # ===========================
    # HR Module - Employee Management
    # ===========================
    "hr": {
        "get_all_employees": ["Admin", "HR"],
        "upsert_employee": ["Admin", "HR"],
        "insert_employee": ["Admin", "HR"],  # Note: Currently open without auth
        "monthly_report": ["Admin", "HR"],
        "add_project": ["Admin", "HR"],
        "employee_details_for_relieving_letter": ["Admin", "HR"],
        "employee_details": ["Admin", "HR"],  # GET /employee-details/<employee_id>
        "get_new_joinees": ["Admin", "HR", "Employee", "Lead"],  # New joinees widget
        "get_upcoming_birthdays": ["Admin", "HR", "Employee", "Lead"] # Upcoming birthdays widget
    },
    
    # ===========================
    # Leave Module - Leave Management
    # ===========================
    "leave": {
        "types_and_approver": ["Admin", "HR", "Lead", "Employee"],
        "get_leave_details": ["Admin", "HR", "Lead", "Employee"],
        "insert_leave": ["Admin", "HR", "Lead", "Employee"],
        "update_leave_status": ["Admin", "HR", "Lead"],  # Only approvers
        "get_holidays": ["Admin", "HR", "Lead", "Employee"],
        "get_leave_cards": ["Admin", "HR", "Lead", "Employee"],
        "get_leave_transactions_by_approver": ["Admin", "HR", "Lead"],
        "leave_records_mail": ["Admin", "HR", "Lead"]  # Email reports
    },
    
    # ===========================
    # Skills Module - Skills Management
    # ===========================
    "skills": {
        "employee_skills": ["Admin", "HR"],  # Overview
        "add_update_skills": ["Admin", "HR"],
        "get_employee_skills": ["Admin", "HR"],  # By employee_id
        "employees_with_skills": ["Admin", "HR"]  # All employees skills
    },
    
    # ===========================
    # Review Module - Skills Review & Evaluation
    # ===========================
    "review": {
        "employees_skills": ["Admin", "HR"],  # Assigned employees skills
        "skill_statuses": ["Admin", "HR"],  # Status by employee
        "save_review": ["Admin", "HR"],
        "add_employee_skill": ["Admin", "HR"],
        "update_skill_score": ["Admin", "HR"],
        "get_master_skills": ["Admin", "HR"]  # Master skills list
    },
    
    # ===========================
    # Goals Module - Goal Setting & Tracking
    # ===========================
    "goals": {
        "create_goal": ["Admin", "HR"],
        "get_employee_goals": ["Admin", "HR"],
        "update_goal": ["Admin", "HR"],
        "delete_goal": ["Admin", "HR"]
    },
    
    # ===========================
    # Assets Module - IT Assets & PC Management
    # ===========================
    "assets": {
        "get_pcs": ["Admin", "HR"],
        "upsert_pc": ["Admin", "HR"],  # Create/Update
        "assign_pc": ["Admin", "HR"],  # Assignments
        "get_maintenance": ["Admin", "HR"]
    },
    
    # ===========================
    # Profile Module - Employee Self-Service
    # ===========================
    "profile": {
        "get_profile": ["Admin", "HR", "Lead", "Employee"],
        "update_profile_self": ["Admin", "HR", "Lead", "Employee"],  # Self update
        "cancel_leave": ["Admin", "HR", "Lead", "Employee"],
        "get_complete_details": ["Admin", "HR", "Lead", "Employee"],
        "increment_address_counter": ["Admin", "HR", "Lead", "Employee"],
        "get_address_counter": ["Admin", "HR", "Lead", "Employee"]
    },
    
    # ===========================
    # Evaluators Module - Employee Evaluation Management
    # ===========================
    "evaluators": {
        "assign_evaluators": ["Admin", "HR"],
        "send_evaluator_reminder": ["Admin", "HR"],
        "get_all_employee_evaluators": ["Admin", "HR"],
        "get_employees_for_evaluators": ["Admin", "HR"],
        "delete_evaluators": ["Admin", "HR"]
    },
    
    # ===========================
    # Capability Module - Capability Development Leads
    # ===========================
    "capability": {
        "get_capability_leads": ["Admin", "HR"],
        "create_capability_lead": ["Admin", "HR"],
        "delete_capability_lead": ["Admin", "HR"],
        "get_assigned_capability_leads": ["Admin", "HR"],
        "create_capability_assignment": ["Admin", "HR"],
        "update_capability_assignment": ["Admin", "HR"],
        "delete_capability_assignment": ["Admin", "HR"]
    },
    
    # ===========================
    # Documents Module - Document Management & Relieving Letters
    # ===========================
    "documents": {
        "employee_details_for_relieving": ["Admin", "HR"],
        "hr_relieving_letters": ["Admin", "HR"],
        "get_relieving_letters": ["Admin", "HR"],
        "create_relieving_letter": ["Admin", "HR"],
        "send_relieving_letter_email": ["Admin", "HR"],
        "update_relieving_letter": ["Admin", "HR"],
        "download_relieving_letter": ["Admin", "HR"],
        "upload_document": ["Admin", "HR"],
        "get_document": ["Admin", "HR"],
        "delete_document": ["Admin", "HR"],
        "document_status": ["Admin", "HR"],
        "verify_document": ["Admin", "HR"],
        "document_verification_status": ["Admin", "HR"],
        "document_status_details": ["Admin", "HR"],
        "incomplete_employees": ["Admin", "HR"],
        "all_employees_docs_status": ["Admin", "HR"]
    },
    
    # ===========================
    # Policy Module - Policy Acknowledgment & Warnings
    # ===========================
    "policy": {
        "get_policy_acknowledgment": ["Admin", "HR"],
        "update_policy_acknowledgment": ["Admin", "HR"],
        "send_policy_email": ["Admin", "HR"],
        "update_warning_count": ["Admin", "HR"],
        "get_warning_count": ["Admin", "HR"]
    },
    
    # ===========================
    # Project Module - Project Management
    # ===========================
    "project": {
        "get_projects": ["Admin", "HR", "Lead"],  # No auth currently
        "add_project": ["Admin", "HR"],  # No auth currently
        "delete_project": ["Admin", "HR"]  # No auth currently
    },
    
    # ===========================
    # Allocation Module - Employee-Project Allocation
    # ===========================
    "allocation": {
        "assign_employee": ["Admin", "HR"]  # No auth currently
    },
    
    # ===========================
    # Feedback Module (Legacy routes - may need review)
    # ===========================
    "feedback": {
        "get_emp_report": ["Admin", "HR", "Lead", "Employee"],
        "add_emp_report": ["Admin", "HR", "Lead"]
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
    "/team-leave-management": ["Admin", "HR", "Lead"],
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
