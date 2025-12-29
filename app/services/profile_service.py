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

    @staticmethod
    def get_complete_employee_details(employee_id):
        """Fetches detailed completion status for an employee profile."""
        try:
            # Get employee basic info
            employee = Employee.query.get(employee_id)
            if not employee:
                return None

            # Get address details
            addresses = EmployeeAddress.query.filter_by(EmployeeId=employee_id).all()
            
            # Get document details from emp_documents table
            doc_query = text("SELECT doc_id, tenth, twelve, pan, adhar, grad, resume FROM emp_documents WHERE emp_id = :eid")
            doc_row = db.session.execute(doc_query, {'eid': employee_id}).fetchone()

            # Get skills
            skill_query = text("SELECT es.SkillId, s.SkillName, es.SkillLevel FROM EmployeeSkill es JOIN Skill s ON es.SkillId = s.SkillId WHERE es.EmployeeId = :eid")
            skills = db.session.execute(skill_query, {'eid': employee_id}).fetchall()
            
            missing_fields = []
            if not employee.ContactNumber: missing_fields.append("Contact Number")
            if not employee.EmergencyContactPerson: missing_fields.append("Emergency Contact Person")
            if not employee.EmergencyContactRelation: missing_fields.append("Emergency Contact Relation")
            if not employee.EmergencyContactNumber: missing_fields.append("Emergency Contact Number")
            if not employee.QualificationYearMonth: missing_fields.append("Qualification Year Month")
            if employee.FullStackReady is None: missing_fields.append("Full Stack Ready Status")
            if not addresses: missing_fields.append("Address Information")
            if not skills: missing_fields.append("Skills Information")
            
            docs = {}
            if doc_row:
                docs = {
                    'tenth': bool(doc_row.tenth), 'twelve': bool(doc_row.twelve),
                    'pan': bool(doc_row.pan), 'adhar': bool(doc_row.adhar),
                    'grad': bool(doc_row.grad), 'resume': bool(doc_row.resume)
                }
                if not all(docs.values()): missing_fields.append("Documents")
            else:
                missing_fields.append("All Documents")

            return {
                'status': len(missing_fields) == 0,
                'message': 'All information is complete' if not missing_fields else f'Missing: {", ".join(missing_fields)}',
                'data': {
                    'ContactNumber': employee.ContactNumber,
                    'Addresses': [{'Type': a.AddressType, 'City': a.City} for a in addresses],
                    'Documents': docs,
                    'Skills': [{'Name': s.SkillName} for s in skills]
                }
            }
        except Exception as e:
            print(f"Error in get_complete_employee_details: {e}")
            raise e

    @staticmethod
    def increment_address_counter(employee_id):
        """Increments the update counter for all addresses of an employee."""
        try:
            db.session.execute(
                text("UPDATE EmployeeAddress SET counter = ISNULL(counter, 0) + 1 WHERE EmployeeId = :eid"),
                {'eid': employee_id}
            )
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error incrementing address counter: {e}")
            return False

    @staticmethod
    def get_address_counter(employee_id):
        """Retrieves the current address update counter for an employee."""
        try:
            result = db.session.execute(
                text("SELECT MAX(counter) FROM EmployeeAddress WHERE EmployeeId = :eid"),
                {'eid': employee_id}
            ).scalar()
            return result or 0
        except Exception as e:
            print(f"Error getting address counter: {e}")
            return 0

