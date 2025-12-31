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
                "employee_id": e.employee_id,
                "first_name": e.first_name,
                "last_name": e.last_name,
                "email": e.email,
                "contact_number": e.contact_number,
                "skills": [{"skill_name": s.skill_name, "level": s.skill_level} for s in profile['skills']],
                "addresses": [{"type": a.address_type, "city": a.city, "state": a.state} for a in profile['addresses']]
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

    @staticmethod
    def get_complete_details(emp_id):
        try:
            result = ProfileService.get_complete_employee_details(emp_id)
            if not result:
                return jsonify({"error": "Employee not found"}), 404
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def increment_address_counter(emp_id):
        try:
            if ProfileService.increment_address_counter(emp_id):
                return jsonify({'message': 'Counter incremented successfully'}), 200
            return jsonify({'error': 'Failed to increment counter'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @staticmethod
    def get_address_counter(emp_id):
        try:
            counter = ProfileService.get_address_counter(emp_id)
            return jsonify({'counter': counter}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

