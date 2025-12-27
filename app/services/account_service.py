import random
import string
from datetime import datetime, timedelta
from ..models.account import db, OTPRequest, Employee
from sqlalchemy import text

class AccountService:
    """Service class for handling account-related operations like login, OTP, and password reset."""

    @staticmethod
    def validate_user(username, password):
        """
        Validates user credentials against the database.
        Returns the user record if valid, otherwise None.
        """
        try:
            query = text("""
                SELECT e.EmployeeId, e.FirstName + ' ' + e.LastName AS FullName, e.Email, r.RoleName, e.EmploymentStatus
                FROM Employees e
                JOIN EmployeeRole r ON e.EmployeeRole = r.RoleId
                WHERE (e.EmployeeId = :username OR e.Email = :username) AND e.Password = :password
            """)
            result = db.session.execute(query, {"username": username, "password": password}).fetchone()
            return result
        except Exception as e:
            # Log the error and re-raise or handle as appropriate
            print(f"Error validating user: {e}")
            return None

    @staticmethod
    def get_employee_email(username):
        """Retrieves the email address of an employee by their ID or username."""
        try:
            query = text("SELECT Email FROM Employees WHERE EmployeeId = :username OR Email = :username")
            result = db.session.execute(query, {"username": username}).fetchone()
            return result.Email if result else None
        except Exception as e:
            print(f"Error retrieving employee email: {e}")
            return None

    @staticmethod
    def save_otp(username, otp):
        """
        Saves a new OTP for the user, deleting any existing ones.
        The OTP expires in 10 minutes.
        """
        try:
            # Delete any existing OTPs for this user to ensure only one is active
            OTPRequest.query.filter_by(Username=username).delete()
            
            new_otp = OTPRequest(
                Username=username,
                OTP=otp,
                ExpiryTime=datetime.utcnow() + timedelta(minutes=10)
            )
            db.session.add(new_otp)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error saving OTP: {e}")
            return False

    @staticmethod
    def verify_otp(username, otp):
        """
        Verifies the provided OTP against the database and checks for expiry.
        Marks the OTP as verified if valid.
        """
        try:
            otp_request = OTPRequest.query.filter_by(Username=username, OTP=otp).first()
            if otp_request and otp_request.ExpiryTime > datetime.utcnow():
                otp_request.IsVerified = True
                db.session.commit()
                return True
            return False
        except Exception as e:
            print(f"Error verifying OTP: {e}")
            return False

    @staticmethod
    def reset_password(username, new_password):
        """Updates the user's password in the database and cleans up used OTPs."""
        try:
            employee = Employee.query.filter((Employee.EmployeeId == username) | (Employee.Email == username)).first()
            if employee:
                employee.Password = new_password
                # Clean up OTP after use
                OTPRequest.query.filter_by(Username=username).delete()
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            print(f"Error resetting password: {e}")
            return False

    @staticmethod
    def generate_otp(length=6):
        """Generates a random numeric OTP of specified length."""
        return ''.join(random.choices(string.digits, k=length))
