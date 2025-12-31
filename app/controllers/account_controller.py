"""
Account controller module for handling authentication API endpoints.

This module provides HTTP request handlers for login, OTP generation/verification,
and password reset operations.
"""

from typing import Tuple
from flask import request, jsonify, Response
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from ..services.account_service import AccountService
from ..utils.mail_util import MailUtil
from ..utils.logger import Logger


class AccountController:
    """
    Controller for handling account-related HTTP requests.
    
    Provides REST API endpoints for authentication, OTP-based password reset,
    and user session management.
    
    All endpoints return JSON responses with appropriate HTTP status codes.
    All operations are logged using centralized Logger.
    
    Example Routes:
        POST /api/account/login - User authentication
        POST /api/account/send-otp - Generate and send OTP
        POST /api/account/verify-otp - Verify OTP
        POST /api/account/reset-password - Reset password
    
    Note:
        All methods are static and designed to be registered as Flask route handlers.
        Error responses hide internal details from users for security.
    """

    @staticmethod
    def login() -> Tuple[Response, int]:
        """
        Handles user login requests with username and password.
        
        Validates credentials, checks employment status, and generates JWT token
        for authenticated users.
        
        Request Body (JSON):
            {
                "Username": "EMP001" or "email@example.com",
                "Password": "password123"
            }
        
        Returns:
            Success (200):
            {
                "AccessToken": "jwt_token_string",
                "EmployeeId": "EMP001",
                "RoleName": "Admin",
                "Email": "user@example.com",
                "FullName": "John Doe"
            }
            
            Error (400): Missing username or password
            Error (401): Invalid credentials or relieved/absconding employee
            Error (500): Server error
        
        Example:
            >>> # POST /api/account/login
            >>> {
            ...   "Username": "john@example.com",
            ...   "Password": "secret123"
            ... }
        
        Note:
            - Supports login with employee ID or email
            - Blocks login for Relieved or Absconding employees
            - JWT token includes role claim for authorization
        """
        Logger.info("Login request received")
        
        try:
            # Validate request has JSON body
            data = request.get_json()
            if not data:
                Logger.warning("Login request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            username = data.get('username', '').strip()
            password = data.get('password', '')
            
            # Validate required fields
            if not username or not password:
                Logger.warning("Login request missing credentials")
                return jsonify({"message": "Username and Password are required"}), 400
            
            Logger.debug("Attempting login", username=username)
            
            # Validate user credentials
            user = AccountService.validate_user(username, password)
            
            if not user:
                Logger.warning("Login failed - invalid credentials", username=username)
                return jsonify({"message": "Invalid Username or Password"}), 401
            
            # Check employment status
            if user.employment_status in ["Relieved", "Absconding"]:
                Logger.warning("Login blocked - invalid employment status", 
                              username=username,
                              employee_id=user.employee_id,
                              status=user.employment_status)
                return jsonify({
                    "message": f"Access denied. Employee status: {user.employment_status}"
                }), 401
            
            # Generate JWT token with role claim
            access_token = create_access_token(
                identity=user.employee_id,
                additional_claims={"role": user.role_name}
            )
            
            Logger.info("Login successful", 
                       username=username,
                       employee_id=user.employee_id,
                       role=user.role_name)
            
            return jsonify({
                "accessToken": access_token,
                "employeeId": user.employee_id,
                "roleName": user.role_name,
                "email": user.email,
                "fullName": user.full_name
            }), 200
            
        except ValueError as ve:
            # Input validation error
            Logger.warning("Login validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            # Unexpected error - log details but hide from user
            Logger.error("Unexpected error during login", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred during login. Please try again."
            }), 500

    @staticmethod
    def send_otp() -> Tuple[Response, int]:
        """
        Generates OTP and sends it to user's email for password reset.
        
        Looks up user email, generates random OTP, saves it to database,
        and sends email with OTP.
        
        Request Body (JSON):
            {
                "Username": "EMP001" or "email@example.com"
            }
        
        Returns:
            Success (200): {"message": "OTP sent successfully"}
            Error (400): Missing username
            Error (404): User not found
            Error (500): Failed to save OTP or send email
        
        Example:
            >>> # POST /api/account/send-otp
            >>> {"Username": "john@example.com"}
        
        Note:
            - OTP is valid for 10 minutes
            - Previous OTPs are invalidated when new one is generated
            - OTP is sent via email only (no SMS support)
        """
        Logger.info("OTP send request received")
        
        try:
            data = request.get_json()
            if not data:
                Logger.warning("OTP send request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            username = data.get('Username', '').strip()
            
            if not username:
                Logger.warning("OTP send request missing username")
                return jsonify({"message": "Username is required"}), 400
            
            Logger.debug("Looking up user for OTP", username=username)
            
            # Get user email
            email = AccountService.get_employee_email(username)
            
            if not email:
                Logger.warning("OTP send failed - user not found", username=username)
                return jsonify({"message": "User not found"}), 404
            
            # Generate OTP
            otp = AccountService.generate_otp()
            Logger.debug("OTP generated for user", username=username)
            
            # Save OTP to database
            if not AccountService.save_otp(username, otp):
                Logger.error("Failed to save OTP", username=username)
                return jsonify({"message": "Failed to generate OTP. Please try again."}), 500
            
            # Send OTP via email
            email_subject = "Password Reset OTP"
            email_body = (
                f"Your OTP for password reset is: {otp}\n\n"
                f"This OTP expires in 10 minutes.\n\n"
                f"If you did not request this, please ignore this email."
            )
            
            if not MailUtil.send_email(email, email_subject, email_body):
                Logger.error("Failed to send OTP email", username=username, email=email)
                return jsonify({"message": "Failed to send OTP email. Please try again."}), 500
            
            Logger.info("OTP sent successfully", username=username, email=email)
            return jsonify({"message": "OTP sent successfully to your registered email"}), 200
            
        except ValueError as ve:
            Logger.warning("OTP send validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error sending OTP", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while sending OTP. Please try again."
            }), 500

    @staticmethod
    def verify_otp() -> Tuple[Response, int]:
        """
        Verifies OTP provided by user.
        
        Checks if OTP exists, matches, and hasn't expired. Marks OTP as verified
        on successful validation.
        
        Request Body (JSON):
            {
                "Username": "EMP001" or "email@example.com",
                "OTP": "123456"
            }
        
        Returns:
            Success (200): {"message": "OTP verified successfully"}
            Error (400): Missing fields or invalid/expired OTP
            Error (500): Server error
        
        Example:
            >>> # POST /api/account/verify-otp
            >>> {
            ...   "Username": "john@example.com",
            ...   "OTP": "123456"
            ... }
        
        Note:
            - OTP must be verified before password reset
            - Expired OTPs are rejected
            - OTP is marked as verified to prevent reuse
        """
        Logger.info("OTP verification request received")
        
        try:
            data = request.get_json()
            if not data:
                Logger.warning("OTP verify request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            username = data.get('Username', '').strip()
            otp = data.get('OTP', '').strip()
            
            if not username or not otp:
                Logger.warning("OTP verify request missing required fields")
                return jsonify({"message": "Username and OTP are required"}), 400
            
            Logger.debug("Verifying OTP", username=username)
            
            # Verify OTP
            if AccountService.verify_otp(username, otp):
                Logger.info("OTP verification successful", username=username)
                return jsonify({"message": "OTP verified successfully"}), 200
            else:
                Logger.warning("OTP verification failed", username=username)
                return jsonify({"message": "Invalid or expired OTP"}), 400
                
        except ValueError as ve:
            Logger.warning("OTP verify validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error verifying OTP", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while verifying OTP. Please try again."
            }), 500

    @staticmethod
    def reset_password() -> Tuple[Response, int]:
        """
        Resets user password after OTP verification.
        
        Updates password in database and cleans up used OTP. User should have
        verified OTP before calling this endpoint.
        
        Request Body (JSON):
            {
                "Username": "EMP001" or "email@example.com",
                "NewPassword": "new_password_here"
            }
        
        Returns:
            Success (200): {"message": "Password reset successfully"}
            Error (400): Missing fields
            Error (500): Failed to reset password
        
        Example:
            >>> # POST /api/account/reset-password
            >>> {
            ...   "Username": "john@example.com",
            ...   "NewPassword": "NewSecurePass123!"
            ... }
        
        Note:
            - OTP should be verified first (not enforced by this endpoint)
            - All OTPs for user are deleted after successful reset
            - Password strength validation should be done client-side
        
        Security:
            TODO: Add password strength validation
            TODO: Hash password before storing (currently stores plain text)
        """
        Logger.info("Password reset request received")
        
        try:
            data = request.get_json()
            if not data:
                Logger.warning("Password reset request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            username = data.get('Username', '').strip()
            new_password = data.get('NewPassword', '')
            
            if not username or not new_password:
                Logger.warning("Password reset request missing required fields")
                return jsonify({"message": "Username and NewPassword are required"}), 400
            
            # TODO: Validate password strength
            if len(new_password) < 8:
                Logger.warning("Password reset rejected - weak password", username=username)
                return jsonify({"message": "Password must be at least 8 characters"}), 400
            
            Logger.debug("Resetting password", username=username)
            
            # Reset password
            if AccountService.reset_password(username, new_password):
                Logger.info("Password reset successful", username=username)
                return jsonify({"message": "Password reset successfully"}), 200
            else:
                Logger.warning("Password reset failed", username=username)
                return jsonify({"message": "Failed to reset password. User may not exist."}), 500
                
        except ValueError as ve:
            Logger.warning("Password reset validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error resetting password", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while resetting password. Please try again."
            }), 500

    @staticmethod
    @jwt_required()
    def get_current_user() -> Tuple[Response, int]:
        """
        Retrieves current authenticated user details from JWT token.
        
        Uses JWT token from Authorization header to fetch user information.
        Requires valid JWT token in request headers.
        
        Headers:
            Authorization: Bearer <jwt_token>
        
        Returns:
            Success (200):
            {
                "status": "success",
                "data": {
                    "employeeId": "EMP001",
                    "roleName": "Admin",
                    "email": "user@example.com",
                    "fullName": "John Doe",
                    "employmentStatus": "Active"
                }
            }
            
            Error (401): Missing or invalid token
            Error (404): User not found
            Error (500): Server error
        
        Example:
            >>> # GET /api/account/me
            >>> # Headers: {"Authorization": "Bearer eyJ0eXAi..."}
        
        Note:
            - Automatically validates JWT token via @jwt_required decorator
            - Returns user details without sensitive information
        """
        Logger.info("Get current user request received")
        
        try:
            # Get employee ID from JWT token
            employee_id = get_jwt_identity()
            
            if not employee_id:
                Logger.warning("Get current user failed - no identity in token")
                return jsonify({
                    "status": "error",
                    "message": "Invalid token"
                }), 401
            
            Logger.debug("Fetching current user details", employee_id=employee_id)
            
            # Get user details from service
            user_details = AccountService.get_user_details(employee_id)
            
            if not user_details:
                Logger.warning("Get current user failed - user not found", employee_id=employee_id)
                return jsonify({
                    "status": "error",
                    "message": "User not found"
                }), 404
            
            Logger.info("Current user details retrieved", employee_id=employee_id)
            
            return jsonify({
                "status": "success",
                "data": user_details
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error getting current user", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching user details"
            }), 500
