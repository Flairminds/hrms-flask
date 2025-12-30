from ..models.hr import db, Employee, EmployeeAddress, Skill, EmployeeSkill
from ..models.leave import LeaveTransaction
from ..models.documents import EmployeeDocumentsBinary
from sqlalchemy import text, func
from ..utils.logger import Logger
from ..utils.constants import LeaveStatus
import json

class ProfileService:
    """Service class for employee self-service operations like profile viewing and leave cancellation."""

    @staticmethod
    def get_employee_profile(emp_id):
        """Retrieves a comprehensive profile for an employee, including addresses and skills using ORM."""
        try:
            employee = Employee.query.get(emp_id)
            if not employee:
                return None
                
            addresses = EmployeeAddress.query.filter_by(employee_id=emp_id).all()
            
            # Fetch skills with their names using ORM JOIN
            skills = db.session.query(
                Skill.skill_id,
                Skill.skill_name,
                EmployeeSkill.skill_level
            ).join(
                EmployeeSkill,
                Skill.skill_id == EmployeeSkill.skill_id
            ).filter(
                EmployeeSkill.employee_id == emp_id
            ).all()
            
            return {
                "employee": employee,
                "addresses": addresses,
                "skills": skills
            }
        except Exception as e:
            Logger.error("Error fetching employee profile", employee_id=emp_id, error=str(e))
            return None

    @staticmethod
    def update_profile_self(emp_id, data):
        """Updates contact and emergency information for an employee profile using ORM."""
        try:
            employee = Employee.query.get(emp_id)
            if not employee:
                return False
                
            employee.contact_number = data.get('ContactNumber')
            employee.emergency_contact_number = data.get('EmergencyContactNumber')
            employee.emergency_contact_person = data.get('EmergencyContactPerson')
            employee.emergency_contact_relation = data.get('EmergencyContactRelation')
            
            # TODO: Implement additional profile update logic as needed
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating profile (self)", employee_id=emp_id, error=str(e))
            return False

    @staticmethod
    def cancel_leave(leave_tran_id):
        """Cancels a pending or approved leave transaction using ORM."""
        try:
            leave = LeaveTransaction.query.get(leave_tran_id)
            if leave and leave.leave_status in [LeaveStatus.PENDING, LeaveStatus.APPROVED]:
                leave.leave_status = LeaveStatus.CANCELLED
                db.session.commit()
                Logger.info("Leave cancelled successfully", leave_tran_id=leave_tran_id)
                return True
            Logger.warning("Leave not found or not cancellable", leave_tran_id=leave_tran_id)
            return False
        except Exception as e:
            db.session.rollback()
            Logger.error("Error cancelling leave", leave_tran_id=leave_tran_id, error=str(e))
            return False

    @staticmethod
    def get_complete_employee_details(employee_id):
        """Fetches detailed completion status for an employee profile using ORM."""
        try:
            # Get employee basic info using ORM
            employee = Employee.query.get(employee_id)
            if not employee:
                return None

            # Get address details using ORM
            addresses = EmployeeAddress.query.filter_by(employee_id=employee_id).all()
            
            # Get document details from emp_documents table using ORM
            doc_record = EmployeeDocumentsBinary.query.filter_by(emp_id=employee_id).first()

            # Get skills using ORM
            skills = db.session.query(
                EmployeeSkill.skill_id,
                Skill.skill_name,
                EmployeeSkill.skill_level
            ).join(
                Skill,
                EmployeeSkill.skill_id == Skill.skill_id
            ).filter(
                EmployeeSkill.employee_id == employee_id
            ).all()
            
            missing_fields = []
            if not employee.contact_number: missing_fields.append("Contact Number")
            if not employee.emergency_contact_person: missing_fields.append("Emergency Contact Person")
            if not employee.emergency_contact_relation: missing_fields.append("Emergency Contact Relation")
            if not employee.emergency_contact_number: missing_fields.append("Emergency Contact Number")
            if not employee.qualification_year_month: missing_fields.append("Qualification Year Month")
            if employee.full_stack_ready is None: missing_fields.append("Full Stack Ready Status")
            if not addresses: missing_fields.append("Address Information")
            if not skills: missing_fields.append("Skills Information")
            
            docs = {}
            if doc_record:
                docs = {
                    'tenth': bool(doc_record.tenth),
                    'twelve': bool(doc_record.twelve),
                    'pan': bool(doc_record.pan),
                    'adhar': bool(doc_record.adhar),
                    'grad': bool(doc_record.grad),
                    'resume': bool(doc_record.resume)
                }
                if not all(docs.values()): missing_fields.append("Documents")
            else:
                missing_fields.append("All Documents")

            return {
                'status': len(missing_fields) == 0,
                'message': 'All information is complete' if not missing_fields else f'Missing: {", ".join(missing_fields)}',
                'data': {
                    'ContactNumber': employee.contact_number,
                    'Addresses': [{'Type': a.address_type, 'City': a.city} for a in addresses],
                    'Documents': docs,
                    'Skills': [{'Name': s.skill_name} for s in skills]
                }
            }
        except Exception as e:
            Logger.error("Error in get_complete_employee_details", employee_id=employee_id, error=str(e))
            raise e

    @staticmethod
    def increment_address_counter(employee_id):
        """Increments the update counter for all addresses of an employee using ORM."""
        try:
            # Use ORM to update all addresses for the employee
            addresses = EmployeeAddress.query.filter_by(employee_id=employee_id).all()
            
            for address in addresses:
                address.counter = (address.counter or 0) + 1
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error incrementing address counter", employee_id=employee_id, error=str(e))
            return False

    @staticmethod
    def get_address_counter(employee_id):
        """Retrieves the current address update counter for an employee using ORM."""
        try:
            # Use ORM with func.max to get the maximum counter
            result = db.session.query(
                func.max(EmployeeAddress.counter)
            ).filter(
                EmployeeAddress.employee_id == employee_id
            ).scalar()
            
            return result or 0
        except Exception as e:
            Logger.error("Error getting address counter", employee_id=employee_id, error=str(e))
            return 0

