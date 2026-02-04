from flask import request, jsonify, g
from ..services.profile_service import ProfileService
from ..utils.logger import Logger

class ProfileController:
    """Controller for handling employee profile and self-service requests."""

    @staticmethod
    def get_profile(emp_id):
        return ProfileController.get_employee_profile(emp_id)

    @staticmethod
    def upload_profile_image(emp_id):
        """Handle profile image upload request."""
        Logger.info("Upload profile image request received", employee_id=emp_id)
        
        try:
            if 'file' not in request.files:
                return jsonify({'message': 'No file part'}), 400
                
            file = request.files['file']
            if file.filename == '':
                return jsonify({'message': 'No selected file'}), 400
                
            success, message = ProfileService.upload_profile_image(emp_id, file)
            
            if success:
                return jsonify({'message': message}), 200
            else:
                return jsonify({'message': message}), 400
                
        except Exception as e:
            Logger.error("Error in upload_profile_image controller", error=str(e))
            return jsonify({'message': 'An error occurred'}), 500

    @staticmethod
    def get_employee_profile(emp_id):
        """Retrieves the full profile of an employee."""
        Logger.info("Get profile request received", employee_id=emp_id)
        try:
            profile = ProfileService.get_employee_profile(emp_id)
            if not profile:
                Logger.warning("Employee profile not found", employee_id=emp_id)
                return jsonify({"Message": "Employee not found"}), 404
                
            e = profile['employee']
            Logger.info("Profile retrieved successfully", employee_id=emp_id)
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
            Logger.error("Unexpected error retrieving profile", employee_id=emp_id, error=str(e))
            return jsonify({"Message": "An unexpected error occurred while fetching the profile"}), 500

    @staticmethod
    def update_profile_self(emp_id):
        """Endpoint for employees to update their own contact information."""
        Logger.info("Update profile request received", employee_id=emp_id)
        try:
            data = request.get_json()
            if not data:
                Logger.warning("Empty request body for profile update", employee_id=emp_id)
                return jsonify({"Message": "Request body must be JSON"}), 400
                
            if ProfileService.update_profile_self(emp_id, data):
                Logger.info("Profile updated successfully", employee_id=emp_id)
                return jsonify({"Message": "Profile updated successfully"}), 200
            
            Logger.warning("Profile update failed - employee not found", employee_id=emp_id)
            return jsonify({"Message": "Error updating profile or employee not found"}), 404
        except Exception as e:
            Logger.error("Unexpected error updating profile", employee_id=emp_id, error=str(e))
            return jsonify({"Message": "An unexpected error occurred during profile update"}), 500

    @staticmethod
    def cancel_leave():
        """Endpoint for employees to cancel their own leave requests."""
        Logger.info("Cancel leave request received")
        try:
            data = request.get_json()
            if not data:
                Logger.warning("Cancel leave failed - empty request body")
                return jsonify({"Message": "Request body is required"}), 400
                
            tran_id = data.get('LeaveTranId') or data.get('leaveTranId')
            if not tran_id:
                Logger.warning("Cancel leave failed - missing transaction ID")
                return jsonify({"Message": "LeaveTranId is required"}), 400
            
            Logger.debug("Attempting to cancel leave", leave_tran_id=tran_id)
            
            result = ProfileService.cancel_leave(tran_id)
            
            if result == "Success":
                Logger.info("Leave cancelled successfully", leave_tran_id=tran_id)
                return jsonify({"Message": "Leave cancelled successfully"}), 200
            elif result == "Not Found":
                Logger.warning("Leave cancellation failed - transaction not found", leave_tran_id=tran_id)
                return jsonify({"Message": "Leave transaction not found"}), 404
            elif result == "Not Cancellable":
                Logger.warning("Leave cancellation failed - status not cancellable", leave_tran_id=tran_id)
                return jsonify({
                    "Message": "Leave cannot be cancelled. Either the leave date has passed or the status is already Cancelled/Rejected."
                }), 400
            else:
                Logger.error("Leave cancellation failed - unknown error", leave_tran_id=tran_id)
                return jsonify({"Message": "Failed to cancel leave"}), 500
                
        except Exception as e:
            Logger.error("Unexpected error during leave cancellation", error=str(e))
            return jsonify({"Message": "An unexpected error occurred while cancelling the leave"}), 500

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

