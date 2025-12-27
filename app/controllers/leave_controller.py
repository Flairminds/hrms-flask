from flask import request, jsonify
from ..services.leave_service import LeaveService

class LeaveController:
    """Controller for handling leave-related requests."""

    @staticmethod
    def get_types_and_approver():
        """Retrieves leave types and the reporting manager for the employee."""
        try:
            emp_id = request.args.get('employeeId')
            if not emp_id:
                return jsonify({"Message": "EmployeeId is required"}), 400
            
            result = LeaveService.get_leave_types_and_approver(emp_id)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def get_leave_details(emp_id):
        """Retrieves detailed leave history for an employee."""
        try:
            year = request.args.get('year')
            details = LeaveService.get_leave_details(emp_id, year)
            return jsonify([dict(row) for row in details]), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def insert_leave():
        """Submits a new leave application."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"Message": "Request body must be JSON"}), 400
                
            tran_id = LeaveService.insert_leave_transaction(data)
            return jsonify({"Message": "Leave applied successfully", "TransactionId": tran_id}), 201
        except Exception as e:
            return jsonify({"Message": f"Failed to apply leave: {str(e)}"}), 500

    @staticmethod
    def update_status():
        """Updates the approval status of a leave request."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"Message": "Request body must be JSON"}), 400
                
            tran_id = data.get('LeaveTranId')
            status = data.get('LeaveStatus')
            approved_by = data.get('ApprovedBy')
            
            if not tran_id or not status:
                return jsonify({"Message": "LeaveTranId and LeaveStatus are required"}), 400
                
            if LeaveService.update_leave_status(tran_id, status, approved_by):
                return jsonify({"Message": "Status updated successfully"}), 200
            return jsonify({"Message": "Transaction not found"}), 404
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def get_holidays():
        """Returns the list of upcoming holidays."""
        try:
            holidays = LeaveService.get_holidays()
            return jsonify([{"HolidayDate": h.HolidayDate, "HolidayName": h.HolidayName} for h in holidays]), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500
