from flask import request, jsonify
from ..services.hr.employee_service import EmployeeService
from ..services.hr.report_service import ReportService
from ..services.hr_service import HRService
from ..utils.logger import Logger


class HRController:
    """Controller for handling HR functionality requests."""

    @staticmethod
    def get_all_employees():
        """Returns a list of all employees for administrative display."""
        Logger.info("Get all employees request received")
        
        try:
            employees = EmployeeService.get_all_employees()
            
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
