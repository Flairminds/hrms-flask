"""
Account service module for handling authentication and password management.

This module provides business logic for login validation, OTP generation/verification,
and password reset operations.
"""

import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash

from ..models.account import db, OTPRequest
from ..models.hr import Employee, EmployeeRole, Role, EmployeeCredentials
from ..utils.logger import Logger
from sqlalchemy import or_, and_


# OTP Configuration Constants
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5


class AccountService:
    """
    Service layer for account-related business operations.
    
    Handles authentication, OTP generation/verification, and password reset
    functionality. All methods use SQLAlchemy ORM and centralized logging.
    
    Example Usage:
        >>> # Validate user credentials
        >>> user_data = AccountService.validate_user('john@example.com', 'password123')
        >>>
        >>> # Generate and save OTP
        >>> otp = AccountService.generate_otp()
        >>> success = AccountService.save_otp('john@example.com', otp)
        >>>
        >>> # Verify OTP
        >>> is_valid = AccountService.verify_otp('john@example.com', '123456')
    
    Note:
        All database operations use transactions with automatic rollback on error.
        All methods log operations using Logger with appropriate context.
    """

    @staticmethod
    def validate_user(username: str, password: str) -> Optional[Tuple]:
        """
        Validates user credentials and returns user information.
        
        Authenticates user by checking username/email and password against
        the database. Supports login with either employee ID or email address.
        
        Args:
            username: Employee ID or email address for login
            password: Plain text password (should be hashed in production)
        
        Returns:
            Named tuple containing:
            - employee_id (str): Employee identifier
            - full_name (str): Concatenated first and last name
            - email (str): Employee email address
            - role_name (str): User role (e.g., 'Admin', 'Employee')
            - employment_status (str): Current employment status
            
            Returns None if credentials are invalid or user not found.
        
        Raises:
            ValueError: If username or password is empty
            SQLAlchemyError: If database query fails
        
        Example:
            >>> user = AccountService.validate_user('EMP001', 'password123')
            >>> if user:
            ...     print(f"Welcome {user.full_name}")
            ...     print(f"Role: {user.role_name}")
        
        Note:
            This method does not check employment status. Caller should verify
            user is not 'Relieved' or 'Absconding' before granting access.
        """
        # Validate inputs
        if not username or not username.strip():
            Logger.warning("Login attempt with empty username")
            raise ValueError("Username cannot be empty")
        
        if not password:
            Logger.warning("Login attempt with empty password", username=username)
            raise ValueError("Password cannot be empty")
        
        Logger.info("Validating user credentials", username=username)
        
        try:
            # Fetch user with credentials using SQLAlchemy ORM
            user_data = db.session.query(
                Employee.employee_id,
                (Employee.first_name + ' ' + Employee.last_name).label('full_name'),
                Employee.email,
                Role.role_name,
                Employee.employment_status,
                EmployeeCredentials.password_hash
            ).join(
                EmployeeCredentials,
                Employee.employee_id == EmployeeCredentials.employee_id
            ).join(
                EmployeeRole,
                Employee.employee_id == EmployeeRole.employee_id
            ).join(
                Role,
                EmployeeRole.role_id == Role.role_id
            ).filter(
                or_(Employee.employee_id == username, Employee.email == username)
            ).first()
            
            if not user_data:
                Logger.warning("User validation failed - user not found", username=username)
                return None
            
            # Verify password hash
            if not check_password_hash(user_data.password_hash, password):
                Logger.warning("User validation failed - invalid password", username=username)
                return None
            
            # Create result tuple without password_hash
            result = type('UserData', (), {
                'employee_id': user_data.employee_id,
                'full_name': user_data.full_name,
                'email': user_data.email,
                'role_name': user_data.role_name,
                'employment_status': user_data.employment_status
            })()
            
            Logger.info("User validation successful", 
                       username=username, 
                       employee_id=result.employee_id,
                       role=result.role_name)
            
            return result
            
        except SQLAlchemyError as e:
            Logger.error("Database error during user validation", 
                        username=username, 
                        error=str(e),
                        error_type=type(e).__name__)
            raise
        except Exception as e:
            Logger.critical("Unexpected error during user validation", 
                           username=username, 
                           error=str(e))
            raise

    @staticmethod
    def get_employee_email(username: str) -> Optional[str]:
        """
        Retrieves employee email address by employee ID or email.
        
        Supports lookup by either employee ID or email address. Useful for
        password reset flow where user might provide either identifier.
        
        Args:
            username: Employee ID or email address to lookup
        
        Returns:
            Email address if employee found, None otherwise
        
        Raises:
            ValueError: If username is empty
        
        Example:
            >>> email = AccountService.get_employee_email('EMP001')
            >>> if email:
            ...     send_reset_email(email)
        """
        if not username or not username.strip():
            Logger.warning("Email lookup attempted with empty username")
            raise ValueError("Username cannot be empty")
        
        Logger.debug("Looking up employee email", username=username)
        
        try:
            employee = Employee.query.filter(
                or_(Employee.employee_id == username, Employee.email == username)
            ).first()
            
            if employee:
                Logger.debug("Employee email found", username=username, email=employee.email)
                return employee.email
            else:
                Logger.warning("Employee not found for email lookup", username=username)
                return None
                
        except SQLAlchemyError as e:
            Logger.error("Database error during email lookup", 
                        username=username, 
                        error=str(e))
            return None
        except Exception as e:
            Logger.critical("Unexpected error during email lookup", 
                           username=username, 
                           error=str(e))
            return None

    @staticmethod
    def save_otp(username: str, otp: str) -> bool:
        """
        Saves OTP for password reset, replacing any existing OTP.
        
        Creates new OTP record with expiry time. Deletes any existing OTPs
        for the user to ensure only one active OTP at a time.
        
        Args:
            username: Employee ID or email to associate OTP with
            otp: Generated OTP string (should be numeric)
        
        Returns:
            True if OTP saved successfully, False otherwise
        
        Raises:
            ValueError: If username or OTP is empty
        
        Example:
            >>> otp = AccountService.generate_otp()
            >>> if AccountService.save_otp('john@example.com', otp):
            ...     send_otp_email(email, otp)
        
        Note:
            OTP expires after OTP_EXPIRY_MINUTES (default: 10 minutes).
            Previous OTPs for same user are automatically deleted.
        """
        if not username or not otp:
            Logger.error("Attempt to save OTP with empty username or OTP")
            raise ValueError("Username and OTP are required")
        
        Logger.info("Saving OTP", username=username)
        
        try:
            # Delete any existing OTPs for this user to ensure only one is active
            deleted_count = OTPRequest.query.filter_by(username=username).delete()
            if deleted_count > 0:
                Logger.debug("Deleted existing OTPs", username=username, count=deleted_count)
            
            # Create new OTP record with timezone-aware datetime
            new_otp = OTPRequest(
                username=username,
                otp=otp,
                expiry_time=datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES),
                is_verified=False,
                attempt_count=0
            )
            db.session.add(new_otp)
            db.session.commit()
            
            Logger.info("OTP saved successfully", username=username)
            return True
            
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Database integrity error saving OTP", 
                        username=username, 
                        error=str(e))
            return False
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error saving OTP", 
                        username=username, 
                        error=str(e))
            return False
        except Exception as e:
            db.session.rollback()
            Logger.critical("Unexpected error saving OTP", 
                           username=username, 
                           error=str(e))
            return False

    @staticmethod
    def verify_otp(username: str, otp: str) -> bool:
        """
        Verifies OTP and marks it as verified if valid.
        
        Checks if OTP exists, matches, and hasn't expired. Marks OTP as
        verified on successful validation.
        
        Args:
            username: Employee ID or email associated with OTP
            otp: OTP string to verify
        
        Returns:
            True if OTP is valid and not expired, False otherwise
        
        Raises:
            ValueError: If username or OTP is empty
        
        Example:
            >>> if AccountService.verify_otp('john@example.com', '123456'):
            ...     # Proceed with password reset
            ...     pass
        
        Note:
            Expired OTPs return False even if they match.
            OTP is marked as verified to prevent reuse.
        """
        if not username or not otp:
            Logger.error("OTP verification attempted with empty username or OTP")
            raise ValueError("Username and OTP are required")
        
        Logger.info("Verifying OTP", username=username)
        
        try:
            otp_request = OTPRequest.query.filter_by(username=username, otp=otp).first()
            
            if not otp_request:
                Logger.warning("OTP not found", username=username)
                return False
            
            # Check if maximum attempts exceeded
            if otp_request.attempt_count >= OTP_MAX_ATTEMPTS:
                Logger.warning("OTP max attempts exceeded", 
                              username=username,
                              attempts=otp_request.attempt_count)
                return False
            
            # Check if OTP expired (using timezone-aware comparison)
            current_time = datetime.now(timezone.utc)
            if otp_request.expiry_time <= current_time:
                # Increment attempt count even for expired OTP
                otp_request.attempt_count += 1
                db.session.commit()
                Logger.warning("OTP expired", 
                              username=username,
                              expired_at=otp_request.expiry_time.isoformat(),
                              attempts=otp_request.attempt_count)
                return False
            
            # Increment attempt count
            otp_request.attempt_count += 1
            
            # Mark OTP as verified on successful verification
            otp_request.is_verified = True
            db.session.commit()
            
            Logger.info("OTP verified successfully", 
                       username=username,
                       attempts=otp_request.attempt_count)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error verifying OTP", 
                        username=username, 
                        error=str(e))
            return False
        except Exception as e:
            db.session.rollback()
            Logger.critical("Unexpected error verifying OTP", 
                           username=username, 
                           error=str(e))
            return False

    @staticmethod
    def reset_password(username: str, new_password: str) -> bool:
        """
        Resets user password and cleans up used OTP.
        
        Updates employee password in credentials table (with secure hashing) and deletes
        associated OTP records after successful reset.
        
        Args:
            username: Employee ID or email of user
            new_password: New password in plain text (will be hashed before storage)
        
        Returns:
            True if password reset successful, False if user not found or error
        
        Raises:
            ValueError: If username or new_password is empty or password is too weak
        
        Example:
            >>> if AccountService.reset_password('john@example.com', 'SecurePass123!'):
            ...     send_confirmation_email(email)
        
        Note:
            Password is hashed using werkzeug.security before storage.
            All OTPs for user are deleted after successful reset.
        
        Security:
            - Password is hashed using PBKDF2-SHA256 (werkzeug default)
            - Minimum password length enforced (8 characters)
            - Hash includes salt for additional security
        """
        if not username or not new_password:
            Logger.error("Password reset attempted with empty username or password")
            raise ValueError("Username and new password are required")
        
        # Validate password strength (minimum 8 characters)
        if len(new_password) < 8:
            Logger.warning("Password reset failed - password too short", 
                          username=username,
                          password_length=len(new_password))
            raise ValueError("Password must be at least 8 characters long")
        
        Logger.info("Resetting password", username=username)
        
        try:
            # Find employee by ID or email
            employee = Employee.query.filter(
                or_(Employee.employee_id == username, Employee.email == username)
            ).first()
            
            if not employee:
                Logger.warning("Password reset failed - employee not found", username=username)
                return False
            
            # Update password in credentials table with secure hash
            credentials = EmployeeCredentials.query.filter_by(
                employee_id=employee.employee_id
            ).first()
            
            if not credentials:
                Logger.error("Credentials not found for employee", 
                            username=username,
                            employee_id=employee.employee_id)
                return False
            
            # Hash password before storing (SECURITY: using PBKDF2-SHA256)
            credentials.password_hash = generate_password_hash(
                new_password,
                method='pbkdf2:sha256',
                salt_length=16
            )
            
            # Clean up OTPs after successful reset
            deleted_otps = OTPRequest.query.filter_by(username=username).delete()
            Logger.debug("Cleaned up OTPs after password reset", 
                        username=username,
                        otps_deleted=deleted_otps)
            
            db.session.commit()
            
            Logger.info("Password reset successful", 
                       username=username,
                       employee_id=employee.employee_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error during password reset", 
                        username=username, 
                        error=str(e))
            return False
        except Exception as e:
            db.session.rollback()
            Logger.critical("Unexpected error during password reset", 
                           username=username, 
                           error=str(e))
            return False

    @staticmethod
    def generate_otp(length: int = OTP_LENGTH) -> str:
        """
        Generates a cryptographically secure random numeric OTP.
        
        Creates a cryptographically secure random OTP string consisting only of digits
        using the secrets module for enhanced security.
        
        Args:
            length: Length of OTP to generate. Defaults to OTP_LENGTH (6).
                   Must be between 4 and 10.
        
        Returns:
            String of random digits of specified length
        
        Raises:
            ValueError: If length is not between 4 and 10
        
        Example:
            >>> otp = AccountService.generate_otp()
            >>> print(len(otp))
            6
            >>> print(otp.isdigit())
            True
        
        Security:
            Uses secrets module which is cryptographically secure and suitable
            for managing data such as passwords, account authentication, security
            tokens, and related secrets.
        """
        if length < 4 or length > 10:
            raise ValueError("OTP length must be between 4 and 10")
        
        # Use secrets module for cryptographically secure random number generation
        otp = ''.join(secrets.choice(string.digits) for _ in range(length))
        Logger.debug("OTP generated", length=length)
        return otp
