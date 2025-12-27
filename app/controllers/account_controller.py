from flask import request, jsonify
from ..services.account_service import AccountService
from ..utils.mail_util import MailUtil
from flask_jwt_extended import create_access_token

class AccountController:
    """Controller for handling account-related requests."""

    @staticmethod
    def login():
        """Handles user login requests."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"Message": "Request body must be JSON"}), 400
                
            username = data.get('Username')
            password = data.get('Password')
            
            if not username or not password:
                return jsonify({"Message": "Username and Password are required"}), 400
            
            user = AccountService.validate_user(username, password)
            if user:
                if user.EmploymentStatus in ["Relieved", "Absconding"]:
                    return jsonify({"Message": f"Employee is {user.EmploymentStatus}"}), 401
                
                # Create token with role claim
                access_token = create_access_token(
                    identity=user.EmployeeId, 
                    additional_claims={"role": user.RoleName}
                )
                
                return jsonify({
                    "AccessToken": access_token,
                    "EmployeeId": user.EmployeeId,
                    "RoleName": user.RoleName,
                    "Email": user.Email,
                    "FullName": user.FullName
                }), 200
            
            return jsonify({"Message": "Invalid Username or Password"}), 401
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def send_otp():
        """Generates and sends an OTP to the user's email."""
        try:
            data = request.get_json()
            username = data.get('Username')
            
            if not username:
                return jsonify({"Message": "Username is required"}), 400
                
            email = AccountService.get_employee_email(username)
            if email:
                otp = AccountService.generate_otp()
                if AccountService.save_otp(username, otp):
                    body = f"Your OTP for password reset is: {otp}. It expires in 10 minutes."
                    if MailUtil.send_email(email, "Password Reset OTP", body):
                        return jsonify({"Message": "OTP sent successfully"}), 200
                    else:
                        return jsonify({"Message": "Failed to send OTP email"}), 500
                else:
                    return jsonify({"Message": "Failed to save OTP"}), 500
            
            return jsonify({"Message": "User not found"}), 404
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def verify_otp():
        """Verifies the OTP provided by the user."""
        try:
            data = request.get_json()
            username = data.get('Username')
            otp = data.get('OTP')
            
            if not username or not otp:
                return jsonify({"Message": "Username and OTP are required"}), 400
                
            if AccountService.verify_otp(username, otp):
                return jsonify({"Message": "OTP verified successfully"}), 200
            
            return jsonify({"Message": "Invalid or expired OTP"}), 400
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500

    @staticmethod
    def reset_password():
        """Resets the user's password after OTP verification."""
        try:
            data = request.get_json()
            username = data.get('Username')
            new_password = data.get('NewPassword')
            
            if not username or not new_password:
                return jsonify({"Message": "Username and NewPassword are required"}), 400
                
            if AccountService.reset_password(username, new_password):
                return jsonify({"Message": "Password reset successfully"}), 200
            
            return jsonify({"Message": "Error resetting password or user not found"}), 500
        except Exception as e:
            return jsonify({"Message": f"An unexpected error occurred: {str(e)}"}), 500
