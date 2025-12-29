from flask import request, jsonify
from ..services.hr_service import HRService

class HRController:
    """Controller for handling HR functionality requests."""

    @staticmethod
    def get_all_employees():
        """Returns a list of all employees for administrative display."""
        try:
            employees = HRService.get_all_employees()
            return jsonify([dict(row) for row in employees]), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def upsert_employee():
        """Endpoint to create or update employee profiles."""
        try:
            data = request.get_json()
            if not data or not data.get('EmployeeId'):
                return jsonify({"Message": "EmployeeId is required"}), 400
                
            emp_id = HRService.upsert_employee(data)
            return jsonify({"Message": "Employee updated successfully", "EmployeeId": emp_id}), 200
        except Exception as e:
            return jsonify({"Message": f"Error updating employee: {str(e)}"}), 500

    @staticmethod
    def get_monthly_report():
        """Generates a CSV or JSON report for a specific month and year."""
        try:
            month = request.args.get('month')
            year = request.args.get('year')
            
            if not month or not year:
                return jsonify({"Message": "Month and Year are required"}), 400
                
            report = HRService.get_monthly_report(month, year)
            return jsonify([dict(row) for row in report]), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def add_project():
        """Registers a new project in the system."""
        try:
            data = request.get_json()
            if not data or not data.get('ProjectName'):
                return jsonify({"Message": "ProjectName is required"}), 400
                
            project_id = HRService.add_project(data.get('ProjectName'), data.get('Description'))
            if project_id:
                return jsonify({"Message": "Project added successfully", "ProjectId": project_id}), 201
            return jsonify({"Message": "Failed to add project"}), 500
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def get_employee_details_for_relieving_letter():
        """Fetches employee details for relieving letter generation."""
        try:
            employees = HRService.get_employee_details_for_relieving_letter()
            return jsonify({'status': 'success', 'data': employees}), 200
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500

