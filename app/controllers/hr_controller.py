from flask import request, jsonify, g
from ..services.hr.employee_service import EmployeeService
from ..services.hr.report_service import ReportService
from ..services.hr_service import HRService
from ..utils.logger import Logger
from werkzeug.security import generate_password_hash
from ..models.hr import EmployeeCredentials, Employee
from .. import db


class HRController:
    """Controller for handling HR functionality requests."""

    @staticmethod
    def get_all_employees():
        """Returns a list of all employees for administrative display."""
        Logger.info("Get all employees request received")
        
        try:
            employees = EmployeeService.get_all_employees()
            
            if employees:
                Logger.info("First employee record keys", keys=list(employees[0].keys()))

            Logger.info("Employees retrieved successfully", count=len(employees))
            
            return jsonify([dict(row) for row in employees]), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching employees",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while fetching employees. Please try again."
            }), 500

    @staticmethod
    def get_potential_approvers():
        """Returns list of employees who can be approvers (Lead, HR, Admin)."""
        Logger.info("Get potential approvers request received")
        
        try:
            approvers = EmployeeService.get_potential_approvers()
            Logger.info("Potential approvers retrieved successfully", count=len(approvers))
            return jsonify(approvers), 200
            
        except Exception as e:
            Logger.error("Error fetching potential approvers", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'Failed to retrieve potential approvers'
            }), 500

    @staticmethod
    def get_employee_stats():
        """Returns employee dashboard statistics."""
        Logger.info("Get employee stats request received")
        try:
            stats = EmployeeService.get_employee_dashboard_stats()
            return jsonify(stats), 200
        except Exception as e:
            Logger.error("Error fetching employee stats", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'Failed to retrieve employee stats'
            }), 500

    @staticmethod
    def upsert_employee():
        """Endpoint to create or update employee profiles."""
        Logger.info("Upsert employee request received")
        
        try:
            data = request.get_json()
            if not data:
                Logger.warning("Empty request body for upsert employee")
                return jsonify({"Message": "Request body is required"}), 400
                
            if not data.get('EmployeeId'):
                Logger.warning("Missing EmployeeId in request")
                return jsonify({"Message": "EmployeeId is required"}), 400
                
            emp_id = EmployeeService.upsert_employee(data)
            
            Logger.info("Employee upserted successfully", employee_id=emp_id)
            
            return jsonify({
                "Message": "Employee updated successfully",
                "EmployeeId": emp_id
            }), 200
            
        except ValueError as ve:
            Logger.warning("Validation error in upsert employee",
                          error=str(ve),
                          data_keys=list(data.keys()) if data else [])
            return jsonify({"Message": str(ve)}), 400
            
        except LookupError as le:
            Logger.warning("Employee not found for update", error=str(le))
            return jsonify({"Message": "Employee not found"}), 404
            
        except Exception as e:
            Logger.error("Unexpected error upserting employee",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while updating employee. Please try again."
            }), 500

    @staticmethod
    def update_employee_details_by_hr(employee_id):
        """Updates employee details (for HR/Admin) - team lead and employment status."""
        Logger.info("Update employee details request", employee_id=employee_id)
        
        try:
            data = request.get_json()
            if not data:
                return jsonify({"message": "Request body is required"}), 400
            
            # Build update data with employee_id
            update_data = {
                'employee_id': employee_id,
                'team_lead_id': data.get('teamLeadId'),
                'employment_status': data.get('employmentStatus'),
                'password': data.get('password'),
                
                # New fields
                'first_name': data.get('firstName'),
                'middle_name': data.get('middleName'),
                'last_name': data.get('lastName'),
                'date_of_birth': data.get('dateOfBirth'),
                'gender': data.get('gender'),
                'blood_group': data.get('bloodGroup'),
                'email': data.get('email'),
                'personal_email': data.get('personalEmail'),
                'mobile_no': data.get('contactNumber'), # map contactNumber to mobile_no for service
                'date_of_joining': data.get('dateOfJoining'),
                'highest_qualification': data.get('highestQualification'),
                'emergency_contact_person': data.get('emergencyContactPerson'),
                'emergency_contact_relation': data.get('emergencyContactRelation'),
                'emergency_contact_number': data.get('emergencyContactNumber'),
                'designation_id': data.get('band'),
                'role_id': data.get('role_id'),
                'sub_role_id': data.get('MasterSubRole'),
                'addresses': data.get('addresses', []),
                'skills': data.get('skills', []),
                'internship_end_date': data.get('internship_end_date'),
                'probation_end_date': data.get('probation_end_date'),
            }
            
            result = EmployeeService.update_employee_details(update_data)
            
            if result == -1:
                return jsonify({"message": "Employee not found"}), 404
                
            Logger.info("Employee details updated", employee_id=employee_id)
            return jsonify({"message": "Employee updated successfully"}), 200
            
        except Exception as e:
            Logger.error("Error updating employee details", error=str(e))
            return jsonify({"message": "Failed to update employee details"}), 500

    @staticmethod
    def insert_employee():
        """
        Creates a new employee with credentials.
        
        Validates required fields, checks for duplicates, and creates employee
        with addresses, skills, and hashed password credentials.
        """
        Logger.info("Insert employee request received")
        
        try:
            data = request.get_json()
            if not data:
                Logger.warning("Empty request body for insert employee")
                return jsonify({"message": "Request body is required"}), 400
            
            # Call the service method which handles validation and duplicate checking
            employee_id = EmployeeService.insert_employee(data)
            
            Logger.info("Employee inserted successfully", employee_id=employee_id)
            
            return jsonify({
                "message": "Employee created successfully",
                "employee_id": employee_id
            }), 201
            
        except ValueError as ve:
            # Handle validation errors (missing fields, duplicates, weak password)
            Logger.warning("Validation error in insert employee",
                          error=str(ve),
                          data_keys=list(data.keys()) if data else [])
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error inserting employee",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while creating employee. Please try again."
            }), 500

    @staticmethod
    def get_monthly_report():
        """Generates a CSV or JSON report for a specific month and year."""
        Logger.info("Get monthly report request received")
        
        try:
            month = request.args.get('month')
            year = request.args.get('year')
            
            if not month or not year:
                Logger.warning("Missing parameters for monthly report",
                              month=month,
                              year=year)
                return jsonify({"Message": "Month and Year are required"}), 400
            
            # Convert to integers
            try:
                month = int(month)
                year = int(year)
            except ValueError:
                Logger.warning("Invalid month/year format", month=month, year=year)
                return jsonify({"Message": "Month and Year must be valid numbers"}), 400
                
            report = ReportService.get_monthly_report(month, year)
            
            Logger.info("Monthly report generated successfully",
                       month=month,
                       year=year,
                       record_count=len(report))
            
            return jsonify([dict(row) for row in report]), 200
            
        except ValueError as ve:
            Logger.warning("Invalid month/year parameters",
                          month=month,
                          year=year,
                          error=str(ve))
            return jsonify({"Message": "Invalid month or year format"}), 400
            
        except Exception as e:
            Logger.error("Unexpected error generating monthly report",
                        month=month,
                        year=year,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while generating report. Please try again."
            }), 500

    @staticmethod
    def add_project():
        """Registers a new project in the system."""
        Logger.info("Add project request received")
        
        try:
            data = request.get_json()
            if not data:
                Logger.warning("Empty request body for add project")
                return jsonify({"Message": "Request body is required"}), 400
                
            project_name = data.get('ProjectName')
            if not project_name:
                Logger.warning("Missing ProjectName in request")
                return jsonify({"Message": "ProjectName is required"}), 400
                
            project_id = HRService.add_project(project_name, data.get('Description'))
            
            if project_id:
                Logger.info("Project added successfully",
                           project_id=project_id,
                           project_name=project_name)
                return jsonify({
                    "Message": "Project added successfully",
                    "ProjectId": project_id
                }), 201
            
            Logger.error("Failed to add project - no ID returned",
                        project_name=project_name)
            return jsonify({"Message": "Failed to add project"}), 500
            
        except ValueError as ve:
            Logger.warning("Validation error adding project", error=str(ve))
            return jsonify({"Message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error adding project",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "Message": "An error occurred while adding project. Please try again."
            }), 500

    @staticmethod
    def get_employee_details_for_relieving_letter():
        """Fetches employee details for relieving letter generation."""
        Logger.info("Get employee details for relieving letter request received")
        
        try:
            employees = EmployeeService.get_employee_details_for_relieving_letter()
            
            Logger.info("Employee details for relieving letter retrieved",
                       count=len(employees))
            
            return jsonify({
                'status': 'success',
                'data': employees
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching employee details for relieving",
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                'status': 'error',
                'message': 'An error occurred while fetching employee details. Please try again.'
            }), 500

    @staticmethod
    def get_employee_with_address_and_skills(employee_id: str):
        """
        Retrieves comprehensive employee details including addresses and skills.
        
        Fetches complete employee profile with residential/permanent addresses
        and associated skills for a given employee ID.
        
        Args:
            employee_id: Employee ID from URL path parameter
        
        Returns:
            200: Employee details with addresses and skills
            400: Invalid or missing employee ID
            404: Employee not found
            500: Server error
        """
        Logger.info("Get employee with address and skills request received", employee_id=employee_id)
        
        # Security: Allow only Admin/HR or the employee themselves
        user_role = getattr(g, 'user_role', None)
        current_emp_id = getattr(g, 'employee_id', None)
        
        if user_role and user_role not in ['Admin', 'HR']:
            if current_emp_id != employee_id:
                Logger.warning("Access denied: User tried to access another employee's details", 
                             requester=current_emp_id, target=employee_id)
                return jsonify({
                    'status': 'error',
                    'message': 'Access denied. You can only view your own details.'
                }), 403
        
        try:
            if not employee_id or not employee_id.strip():
                Logger.warning("Empty employee ID provided")
                return jsonify({
                    'status': 'error',
                    'message': 'Employee ID is required'
                }), 400
            
            employee_data = EmployeeService.get_employee_with_address_and_skills(employee_id)
            
            Logger.info("Employee details with addresses and skills retrieved", 
                       employee_id=employee_id)
            
            return jsonify(employee_data), 200
            
        except ValueError as ve:
            Logger.warning("Validation error fetching employee with address and skills",
                          employee_id=employee_id,
                          error=str(ve))
            return jsonify({
                'status': 'error',
                'message': str(ve)
            }), 400
        except LookupError as le:
            Logger.warning("Employee not found",
                          employee_id=employee_id,
                          error=str(le))
            return jsonify({
                'status': 'error',
                'message': f'Employee {employee_id} not found'
            }), 404
            
        except Exception as e:
            Logger.error("Unexpected error fetching employee with address and skills",
                        employee_id=employee_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                'status': 'error',
                'message': 'An error occurred while fetching employee details. Please try again.'
            }), 500

    @staticmethod
    def get_new_joinees():
        """Retrieves employees who joined within the last 2 months."""
        Logger.info("Get new joinees request received")
        
        try:
            new_joinees = HRService.get_new_joinees()
            
            Logger.info("New joinees retrieved successfully", count=len(new_joinees))
            
            return jsonify({
                'status': 'success',
                'data': new_joinees
            }), 200
        except Exception as e:
            Logger.error("Unexpected error in get_new_joinees", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'An unexpected error occurred while fetching new joinees.'
            }), 500

    @staticmethod
    def get_upcoming_birthdays():
        """Retrieves active employees who have birthdays within the next 2 months."""
        Logger.info("Get upcoming birthdays request received")
        
        try:
            birthdays = HRService.get_upcoming_birthdays()
            
            Logger.info("Upcoming birthdays retrieved successfully", count=len(birthdays))
            
            return jsonify({
                'status': 'success',
                'data': birthdays
            }), 200
        except Exception as e:
            Logger.error("Unexpected error in get_upcoming_birthdays", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'An unexpected error occurred while fetching upcoming birthdays.'
            }), 500

    @staticmethod
    def get_designations():
        """Retrieves all available designations/bands for dropdown population."""
        Logger.info("Get designations request received")
        
        try:
            designations = HRService.get_designations()
            
            Logger.info("Designations retrieved successfully", count=len(designations))
            
            return jsonify(designations), 200
        except Exception as e:
            Logger.error("Unexpected error in get_designations", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'An unexpected error occurred while fetching designations.'
            }), 500

    @staticmethod
    def add_designation():
        """Adds a new designation."""
        Logger.info("Add designation request received")
        try:
            data = request.get_json()
            designation_name = data.get('designation_name')
            if not designation_name:
                return jsonify({"message": "Designation name is required"}), 400
            
            if HRService.insert_designation(designation_name):
                return jsonify({"message": "Designation added successfully"}), 201
            return jsonify({"message": "Failed to add designation"}), 500
        except Exception as e:
            Logger.error("Error in add_designation", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def update_designation(designation_id):
        """Updates a designation."""
        Logger.info("Update designation request", id=designation_id)
        try:
            data = request.get_json()
            designation_name = data.get('designation_name')
            if not designation_name:
                return jsonify({"message": "Designation name is required"}), 400
            
            if HRService.update_designation(designation_id, designation_name):
                return jsonify({"message": "Designation updated successfully"}), 200
            return jsonify({"message": "Designation not found or update failed"}), 404
        except Exception as e:
            Logger.error("Error in update_designation", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def delete_designation(designation_id):
        """Deletes a designation."""
        Logger.info("Delete designation request", id=designation_id)
        try:
            if HRService.delete_designation(designation_id):
                return jsonify({"message": "Designation deleted successfully"}), 200
            return jsonify({"message": "Designation not found or delete failed"}), 404
        except Exception as e:
            Logger.error("Error in delete_designation", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def get_sub_roles():
        """Retrieves all available sub-roles for dropdown population."""
        Logger.info("Get sub-roles request received")
        
        try:
            sub_roles = HRService.get_sub_roles()
            
            Logger.info("Sub-roles retrieved successfully", count=len(sub_roles))
            
            return jsonify(sub_roles), 200
        except Exception as e:
            Logger.error("Unexpected error in get_sub_roles", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'An unexpected error occurred while fetching sub-roles.'
            }), 500

    @staticmethod
    def add_sub_role():
        """Adds a new sub-role."""
        Logger.info("Add sub-role request received")
        try:
            data = request.get_json()
            sub_role_name = data.get('sub_role_name')
            if not sub_role_name:
                return jsonify({"message": "Sub-role name is required"}), 400
            
            if HRService.insert_sub_role(sub_role_name):
                return jsonify({"message": "Sub-role added successfully"}), 201
            return jsonify({"message": "Failed to add sub-role"}), 500
        except Exception as e:
            Logger.error("Error in add_sub_role", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def update_sub_role(sub_role_id):
        """Updates a sub-role."""
        Logger.info("Update sub-role request", id=sub_role_id)
        try:
            data = request.get_json()
            sub_role_name = data.get('sub_role_name')
            if not sub_role_name:
                return jsonify({"message": "Sub-role name is required"}), 400
            
            if HRService.update_sub_role(sub_role_id, sub_role_name):
                return jsonify({"message": "Sub-role updated successfully"}), 200
            return jsonify({"message": "Sub-role not found or update failed"}), 404
        except Exception as e:
            Logger.error("Error in update_sub_role", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def delete_sub_role(sub_role_id):
        """Deletes a sub-role."""
        Logger.info("Delete sub-role request", id=sub_role_id)
        try:
            if HRService.delete_sub_role(sub_role_id):
                return jsonify({"message": "Sub-role deleted successfully"}), 200
            return jsonify({"message": "Sub-role not found or delete failed"}), 404
        except Exception as e:
            Logger.error("Error in delete_sub_role", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def get_roles():
        """Retrieves all available roles for dropdown population."""
        Logger.info("Get roles request received")
        
        try:
            roles = HRService.get_roles()
            
            Logger.info("Roles retrieved successfully", count=len(roles))
            
            return jsonify(roles), 200
        except Exception as e:
            Logger.error("Unexpected error in get_roles", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'An unexpected error occurred while fetching roles.'
            }), 500

    @staticmethod
    def add_role():
        """Adds a new master role."""
        Logger.info("Add role request received")
        try:
            data = request.get_json()
            role_name = data.get('role_name')
            if not role_name:
                return jsonify({"message": "Role name is required"}), 400
            
            if HRService.insert_role(role_name):
                return jsonify({"message": "Role added successfully"}), 201
            return jsonify({"message": "Failed to add role"}), 500
        except Exception as e:
            Logger.error("Error in add_role", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def update_role(role_id):
        """Updates a master role."""
        Logger.info("Update role request", id=role_id)
        try:
            data = request.get_json()
            role_name = data.get('role_name')
            if not role_name:
                return jsonify({"message": "Role name is required"}), 400
            
            if HRService.update_role(role_id, role_name):
                return jsonify({"message": "Role updated successfully"}), 200
            return jsonify({"message": "Role not found or update failed"}), 404
        except Exception as e:
            Logger.error("Error in update_role", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def delete_role(role_id):
        """Deletes a master role."""
        Logger.info("Delete role request", id=role_id)
        try:
            if HRService.delete_role(role_id):
                return jsonify({"message": "Role deleted successfully"}), 200
            return jsonify({"message": "Role not found or delete failed"}), 404
        except Exception as e:
            Logger.error("Error in delete_role", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def get_all_skills():
        """Retrieves all available skills for dropdown population."""
        Logger.info("Get all skills request received")
        
        try:
            skills = HRService.get_all_skills()
            
            Logger.info("Skills retrieved successfully", count=len(skills))
            
            return jsonify(skills), 200
        except Exception as e:
            Logger.error("Unexpected error in get_all_skills", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'An unexpected error occurred while fetching skills.'
            }), 500

    @staticmethod
    def get_all_employee_documents():
        """Get all employee documents for HR/Admin document repository."""
        Logger.info("Get all employee documents request received")
        
        try:
            from ..services.document_service import DocumentService
            
            documents = DocumentService.get_all_employee_documents()
            Logger.info("All employee documents retrieved successfully", count=len(documents))
            return jsonify(documents), 200
            
        except Exception as e:
            Logger.error("Error fetching all employee documents", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'Failed to retrieve employee documents'
            }), 500

    @staticmethod
    def get_employee_document_stats():
        """Get document upload and verification statistics for all employees."""
        Logger.info("Get employee document statistics request received")
        
        try:
            from ..services.document_service import DocumentService
            
            stats = DocumentService.get_employee_document_stats()
            Logger.info("Employee document statistics retrieved successfully", count=len(stats))
            return jsonify(stats), 200
            
        except Exception as e:
            Logger.error("Error fetching employee document statistics", error=str(e))
            return jsonify({
                'status': 'error',
                'message': 'Failed to retrieve document statistics'
            }), 500

    @staticmethod
    def get_lob_leads():
        """Retrieves all LOB leads with standardized keys for frontend."""
        Logger.info("Get LOB leads request received")
        try:
            lob_leads = HRService.get_lob_leads()
            # Standardize for Lob.jsx: 'LobName' -> 'Lob', 'LeadName' -> 'LobLead'
            standardized = [
                {
                    'LobId': l['LobId'],
                    'Lob': l['LobName'],
                    'LobLead': l['LeadName']
                } for l in lob_leads
            ]
            Logger.info("LOB leads retrieved", count=len(standardized))
            return jsonify(standardized), 200
        except Exception as e:
            Logger.error("Error in get_lob_leads", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def add_lob_lead():
        """Adds a new LOB lead."""
        Logger.info("Add LOB lead request received")
        try:
            data = request.get_json()
            lob_lead = data.get('lobLead')
            lob_name = data.get('lob')
            if not lob_lead or not lob_name:
                return jsonify({"message": "lobLead and lob are required"}), 400
            
            if HRService.insert_lob_lead(lob_lead, lob_name):
                return jsonify({"message": "LOB lead added successfully"}), 201
            return jsonify({"message": "Failed to add LOB lead"}), 500
        except Exception as e:
            Logger.error("Error in add_lob_lead", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def get_all_team_leads():
        """Retrieves all team leads."""
        Logger.info("Get all team leads request received")
        try:
            leads = HRService.get_team_leads()
            return jsonify(leads), 200
        except Exception as e:
            Logger.error("Error in get_all_team_leads", error=str(e))
            return jsonify({"message": "Internal server error"}), 500

    @staticmethod
    def add_team_lead():
        """Adds a new team lead."""
        Logger.info("Add team lead request received")
        try:
            data = request.get_json()
            employee_id = data.get('employeeId')
            if not employee_id:
                return jsonify({"message": "employeeId is required"}), 400
            
            if HRService.insert_team_lead(employee_id):
                return jsonify({"message": "Team lead added successfully"}), 201
            return jsonify({"message": "Failed to add team lead"}), 500
        except Exception as e:
            Logger.error("Error in add_team_lead", error=str(e))
            return jsonify({"message": "Internal server error"}), 500
    
    @staticmethod
    def add_employee_password():
        """Bulk-seeds passwords for all active employees who don't yet have credentials.

        Password format: capitalize(first_name) + '@' + year_of_birth
        Active employees = those with no lwd (last working day) set.
        Employees already in EmployeeCredentials are skipped silently.
        Employees with no date_of_birth are also skipped (counted separately).
        """
        Logger.info("Bulk seed employee passwords request received")
        try:
            # Fetch all active employees (lwd is null = still employed)
            active_employees = Employee.query.filter(Employee.employment_status.notin_(['Relieved', 'Absconding'])).all()

            # Build a set of employee_ids that already have credentials
            existing_ids = {
                cred.employee_id
                for cred in EmployeeCredentials.query.with_entities(EmployeeCredentials.employee_id).all()
            }

            inserted = 0
            skipped_existing = 0
            skipped_no_dob = 0

            for emp in active_employees:
                if emp.employee_id in existing_ids:
                    skipped_existing += 1
                    continue

                if not emp.date_of_birth:
                    skipped_no_dob += 1
                    Logger.warning(
                        "Skipping employee — no date_of_birth",
                        employee_id=emp.employee_id
                    )
                    continue

                # Build password: capitalize first name + '@' + 4-digit birth year
                plain_password = f"{emp.first_name.strip().capitalize()}@{emp.date_of_birth.year}"

                password_hash = generate_password_hash(
                    plain_password,
                    method='pbkdf2:sha256',
                    salt_length=16
                )

                db.session.add(EmployeeCredentials(
                    employee_id=emp.employee_id,
                    password_hash=password_hash
                ))
                inserted += 1

            db.session.commit()

            Logger.info(
                "Bulk password seed complete",
                inserted=inserted,
                skipped_existing=skipped_existing,
                skipped_no_dob=skipped_no_dob
            )

            return jsonify({
                "message": "Password seeding complete",
                "inserted": inserted,
                "skipped_already_exists": skipped_existing,
                "skipped_no_dob": skipped_no_dob
            }), 200

        except Exception as e:
            db.session.rollback()
            Logger.error("Error in add_employee_password", error=str(e))
            return jsonify({"message": "Internal server error"}), 500
