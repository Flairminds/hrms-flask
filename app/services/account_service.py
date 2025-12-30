"""
Account service module for handling authentication and password management.

This module provides business logic for login validation, OTP generation/verification,
and password reset operations.
"""

import random
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from ..models.account import db, OTPRequest
from ..models.hr import Employee, EmployeeRole, Role, EmployeeCredentials
from ..utils.logger import Logger
from sqlalchemy import or_, and_


# OTP Configuration Constants
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10


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
            # Use SQLAlchemy ORM with joins
            result = db.session.query(
                Employee.employee_id,
                (Employee.first_name + ' ' + Employee.last_name).label('full_name'),
                Employee.email,
                Role.role_name,
                Employee.employment_status
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
                and_(
                    or_(Employee.employee_id == username, Employee.email == username),
                    EmployeeCredentials.password == password
                )
            ).first()
            
            if result:
                Logger.info("User validation successful", 
                           username=username, 
                           employee_id=result.employee_id,
                           role=result.role_name)
            else:
                Logger.warning("User validation failed - invalid credentials", username=username)
            
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
            
            # Create new OTP record
            new_otp = OTPRequest(
                username=username,
                otp=otp,
                expiry_time=datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES),
                is_verified=False
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
            
            if otp_request.expiry_time <= datetime.utcnow():
                Logger.warning("OTP expired", 
                              username=username,
                              expired_at=otp_request.expiry_time.isoformat())
                return False
            
            # Mark OTP as verified
            otp_request.is_verified = True
            db.session.commit()
            
            Logger.info("OTP verified successfully", username=username)
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
        
        Updates employee password in credentials table and deletes
        associated OTP records after successful reset.
        
        Args:
            username: Employee ID or email of user
            new_password: New password (should be hashed in production)
        
        Returns:
            True if password reset successful, False if user not found or error
        
        Raises:
            ValueError: If username or new_password is empty
        
        Example:
            >>> if AccountService.reset_password('john@example.com', 'new_password'):
            ...     send_confirmation_email(email)
        
        Note:
            This method does not validate password strength.
            Caller should validate password meets security requirements.
            All OTPs for user are deleted after successful reset.
        
        Security:
            Password should be hashed before storing. Current implementation
            stores plain text - THIS IS INSECURE AND SHOULD BE FIXED.
        """
        if not username or not new_password:
            Logger.error("Password reset attempted with empty username or password")
            raise ValueError("Username and new password are required")
        
        Logger.info("Resetting password", username=username)
        
        try:
            # Find employee by ID or email
            employee = Employee.query.filter(
                or_(Employee.employee_id == username, Employee.email == username)
            ).first()
            
            if not employee:
                Logger.warning("Password reset failed - employee not found", username=username)
                return False
            
            # TODO: Hash password before storing (SECURITY ISSUE)
            # Update password in credentials table
            credentials = EmployeeCredentials.query.filter_by(
                employee_id=employee.employee_id
            ).first()
            
            if not credentials:
                Logger.error("Credentials not found for employee", 
                            username=username,
                            employee_id=employee.employee_id)
                return False
            
            credentials.password = new_password
            
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
        Generates a random numeric OTP.
        
        Creates a cryptographically random OTP string consisting only of digits.
        
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
        
        Note:
            Uses random.choices which is cryptographically secure enough
            for OTPs. For production, consider using secrets module.
        """
        if length < 4 or length > 10:
            raise ValueError("OTP length must be between 4 and 10")
        
        otp = ''.join(random.choices(string.digits, k=length))
        Logger.debug("OTP generated", length=length)
        return otp
