from flask import request, jsonify
from ..services.feedback_service import FeedbackService

class FeedbackController:
    """Controller for handling performance feedback requests."""

    @staticmethod
    def get_emp_report():
        """Retrieves the performance reports for a specific employee."""
        try:
            emp_id = request.args.get('empId')
            if not emp_id:
                return jsonify({"Message": "EmployeeId is required"}), 400
            
            report = FeedbackService.get_feedback_by_employee(emp_id)
            return jsonify(report), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def add_emp_report():
        """Submits a new performance feedback report."""
        try:
            data = request.get_json()
            if not data or not data.get('EmployeeId'):
                return jsonify({"Message": "EmployeeId is required"}), 400
                
            feedback_id = FeedbackService.add_feedback(data)
            return jsonify({"Message": "Feedback added successfully", "FeedBackId": feedback_id}), 201
        except Exception as e:
            return jsonify({"Message": f"Error adding feedback report: {str(e)}"}), 500
