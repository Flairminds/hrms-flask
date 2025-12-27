from ..models.hr import db, Employee, EmployeeAddress, Skill, EmployeeSkill
from ..models.leave import LeaveTransaction
from sqlalchemy import text
import json

class ProfileService:
    """Service class for employee self-service operations like profile viewing and leave cancellation."""

    @staticmethod
    def get_employee_profile(emp_id):
        """Retrieves a comprehensive profile for an employee, including addresses and skills."""
        try:
            employee = Employee.query.get(emp_id)
            if not employee:
                return None
                
            addresses = EmployeeAddress.query.filter_by(EmployeeId=emp_id).all()
            # Fetch skills with their names using a join
            skills = db.session.execute(text("""
                SELECT s.SkillId, s.SkillName, es.SkillLevel
                FROM EmployeeSkill es
                JOIN Skill s ON es.SkillId = s.SkillId
                WHERE es.EmployeeId = :emp_id
            """), {"emp_id": emp_id}).fetchall()
            
            return {
                "employee": employee,
                "addresses": addresses,
                "skills": skills
            }
        except Exception as e:
            print(f"Error fetching employee profile: {e}")
            return None

    @staticmethod
    def update_profile_self(emp_id, data):
        """Updates contact and emergency information for an employee profile."""
        try:
            employee = Employee.query.get(emp_id)
            if not employee:
                return False
                
            employee.ContactNumber = data.get('ContactNumber')
            employee.EmergencyContactNumber = data.get('EmergencyContactNumber')
            employee.EmergencyContactPerson = data.get('EmergencyContactPerson')
            employee.EmergencyContactRelation = data.get('EmergencyContactRelation')
            
            # TODO: Implement additional profile update logic as needed
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error updating profile (self): {e}")
            return False

    @staticmethod
    def cancel_leave(leave_tran_id):
        """Cancels a pending or approved leave transaction."""
        try:
            leave = LeaveTransaction.query.get(leave_tran_id)
            if leave and leave.LeaveStatus in ['Pending', 'Approved']:
                leave.LeaveStatus = 'Cancelled'
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            print(f"Error cancelling leave: {e}")
            return False
