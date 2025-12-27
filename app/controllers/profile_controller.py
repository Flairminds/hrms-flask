from flask import request, jsonify
from ..services.profile_service import ProfileService

class ProfileController:
    """Controller for handling employee profile and self-service requests."""

    @staticmethod
    def get_profile(emp_id):
        """Retrieves the full profile of an employee."""
        try:
            profile = ProfileService.get_employee_profile(emp_id)
            if not profile:
                return jsonify({"Message": "Employee not found"}), 404
                
            e = profile['employee']
            return jsonify({
                "EmployeeId": e.EmployeeId,
                "FirstName": e.FirstName,
                "LastName": e.LastName,
                "Email": e.Email,
                "ContactNumber": e.ContactNumber,
                "Skills": [{"SkillName": s.SkillName, "Level": s.SkillLevel} for s in profile['skills']],
                "Addresses": [{"Type": a.AddressType, "City": a.City, "State": a.State} for a in profile['addresses']]
            }), 200
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def update_profile_self(emp_id):
        """Endpoint for employees to update their own contact information."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"Message": "Request body must be JSON"}), 400
                
            if ProfileService.update_profile_self(emp_id, data):
                return jsonify({"Message": "Profile updated successfully"}), 200
            return jsonify({"Message": "Error updating profile or employee not found"}), 500
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def cancel_leave():
        """Endpoint for employees to cancel their own leave requests."""
        try:
            data = request.get_json()
            if not data or not data.get('LeaveTranId'):
                return jsonify({"Message": "LeaveTranId is required"}), 400
                
            if ProfileService.cancel_leave(data.get('LeaveTranId')):
                return jsonify({"Message": "Leave cancelled successfully"}), 200
            return jsonify({"Message": "Leave transaction not found or cannot be cancelled"}), 404
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500
