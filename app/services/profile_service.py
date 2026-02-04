from ..models.hr import db, Employee, EmployeeAddress, MasterSkill, EmployeeSkill
from datetime import datetime
from ..models.leave import LeaveTransaction
from ..models.documents import EmployeeDocumentsBinary
from sqlalchemy import text, func
from ..utils.logger import Logger
from ..utils.constants import LeaveStatus
import json

class ProfileService:
    """Service class for employee self-service operations like profile viewing and leave cancellation."""

    @staticmethod
    def upload_profile_image(emp_id, file):
        """Uploads a profile image for the employee."""
        try:
            # 1. Validate file size (300KB = 300 * 1024 bytes)
            file.seek(0, 2) # Seek to end
            size = file.tell()
            file.seek(0) # Reset to start
            
            if size > 307200: # 300KB
                return False, "File size exceeds 300KB limit."
            
            # 2. Validate file type (simple check + MIME)
            # Flask file object has mimetype
            allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
            if file.mimetype not in allowed_types:
                return False, "Invalid file format. Only JPEG, PNG, and WEBP are allowed."
                
            # 3. Read and save
            image_data = file.read()
            
            employee = Employee.query.filter_by(employee_id=emp_id).first()
            if not employee:
                return False, "Employee not found."
                
            employee.profile_image = image_data
            employee.profile_image_type = file.mimetype
            db.session.commit()
            
            return True, "Profile image uploaded successfully."
            
        except Exception as e:
            db.session.rollback()
            Logger.error("Error uploading profile image", employee_id=emp_id, error=str(e))
            return False, f"An error occurred: {str(e)}"
    
    @staticmethod
    def calculate_profile_completion(emp_id):
        """
        Calculate profile completion percentage based on filled fields
        Returns: {'completion_percentage': 85, 'missing_fields': ['blood_group', ...]}
        """
        try:
            from ..models.hr import Employee, EmployeeAddress
            
            employee = Employee.query.filter_by(employee_id=emp_id).first()
            if not employee:
                return {'completion_percentage': 0, 'missing_fields': ['All fields']}
            
            # Define weighted fields (critical fields have higher weight)
            employee_fields = {
                'first_name': 2,
                'last_name': 2,
                'email': 3,
                'contact_number': 3,
                'date_of_birth': 2,
                'gender': 1,
                'blood_group': 1,
                'personal_email': 2,
                'emergency_contact_number': 3,
                'emergency_contact_person': 3,
                'emergency_contact_relation': 2,
                'highest_qualification': 2,
                'profile_image': 2,
                'date_of_joining': 1,
            }
            
            # Calculate employee fields completion
            total_weight = sum(employee_fields.values())
            filled_weight = 0
            missing_fields = []
            
            for field, weight in employee_fields.items():
                value = getattr(employee, field, None)
                if value is not None and str(value).strip():
                    filled_weight += weight
                else:
                    missing_fields.append(field.replace('_', ' ').title())
            
            # Check address completion
            address = EmployeeAddress.query.filter_by(employee_id=emp_id).first()
            address_fields = {
                'permanent_address_line1': 2,
                'permanent_city': 2,
                'permanent_state': 2,
                'permanent_pincode': 2,
                'current_address_line1': 2,
                'current_city': 2,
                'current_state': 2,
                'current_pincode': 2,
            }
            
            total_weight += sum(address_fields.values())
            
            if address:
                for field, weight in address_fields.items():
                    value = getattr(address, field, None)
                    if value is not None and str(value).strip():
                        filled_weight += weight
                    else:
                        missing_fields.append(f"Address: {field.replace('_', ' ').title()}")
            else:
                missing_fields.extend([f"Address: {field.replace('_', ' ').title()}" for field in address_fields.keys()])
            
            # Calculate percentage
            completion_percentage = round((filled_weight / total_weight) * 100)
            
            Logger.info(f"Profile completion calculated", emp_id=emp_id, percentage=completion_percentage)
            
            return {
                'completion_percentage': completion_percentage,
                'missing_fields': missing_fields[:10]  # Limit to top 10 missing fields
            }
            
        except Exception as e:
            Logger.error("Error calculating profile completion", error=str(e))
            return {'completion_percentage': 0, 'missing_fields': ['Error calculating completion']}

    @staticmethod
    def get_employee_profile(emp_id):
        """Retrieves a comprehensive profile for an employee, including addresses and skills using ORM."""
        try:
            employee = Employee.query.filter_by(employee_id=emp_id).first()
            if not employee:
                return None
                
            addresses = EmployeeAddress.query.filter_by(employee_id=emp_id).all()
            
            # Fetch skills with their names using ORM JOIN
            skills = db.session.query(
                MasterSkill.skill_id,
                MasterSkill.skill_name,
                EmployeeSkill.skill_level
            ).join(
                EmployeeSkill,
                MasterSkill.skill_id == EmployeeSkill.skill_id
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
        """Updates personal info, qualification, and contacts for an employee profile using ORM."""
        try:
            employee = Employee.query.filter_by(employee_id=emp_id).first()
            if not employee:
                return False
                
            employee.contact_number = data.get('contact_number')
            employee.emergency_contact_number = data.get('emergency_contact_number')
            employee.emergency_contact_person = data.get('emergency_contact_person')
            employee.emergency_contact_relation = data.get('emergency_contact_relation')
            employee.personal_email = data.get('personal_email')
            employee.highest_qualification = data.get('highest_qualification')
            employee.qualification_year_month = data.get('qualification_year_month')
            
            # Handle addresses
            addresses_data = data.get('addresses', [])
            for addr_data in addresses_data:
                # We expect addr_data to contain fields for both Residential and Permanent
                # The frontend sends a single object with keys like 'residential_address1', 'permanent_address1', etc.
                # But looking at EditPersonalDetails.jsx, it constructs `addressPayload` which has flattened keys.
                # Wait, let's look at how the data is structured coming in. 
                # Frontend sends `addresses: [addressPayload]`. 
                # And `addressPayload` has keys: residential_address_type, residential_address1, ..., permanent_address1, ...
                
                # Update Residential Address
                res_addr = EmployeeAddress.query.filter_by(employee_id=emp_id, address_type='Residential').first()
                if not res_addr:
                    res_addr = EmployeeAddress(employee_id=emp_id, address_type='Residential')
                    db.session.add(res_addr)
                
                if 'residential_address1' in addr_data: res_addr.address1 = addr_data['residential_address1']
                if 'residential_address2' in addr_data: res_addr.address2 = addr_data['residential_address2']
                if 'residential_city' in addr_data: res_addr.city = addr_data['residential_city']
                if 'residential_state' in addr_data: res_addr.state = addr_data['residential_state']
                if 'residential_zipcode' in addr_data: res_addr.zip_code = addr_data['residential_zipcode']
                if 'is_same_permanant' in addr_data: res_addr.is_same_permanant = addr_data['is_same_permanant']
                
                # Update Permanent Address
                perm_addr = EmployeeAddress.query.filter_by(employee_id=emp_id, address_type='Permanent').first()
                if not perm_addr:
                    perm_addr = EmployeeAddress(employee_id=emp_id, address_type='Permanent')
                    db.session.add(perm_addr)
                    
                if addr_data.get('is_same_permanant'):
                    perm_addr.address1 = res_addr.address1
                    perm_addr.address2 = res_addr.address2
                    perm_addr.city = res_addr.city
                    perm_addr.state = res_addr.state
                    perm_addr.zip_code = res_addr.zip_code
                    perm_addr.is_same_permanant = True
                else:
                    if 'permanent_address1' in addr_data: perm_addr.address1 = addr_data['permanent_address1']
                    if 'permanent_address2' in addr_data: perm_addr.address2 = addr_data['permanent_address2']
                    if 'permanent_city' in addr_data: perm_addr.city = addr_data['permanent_city']
                    if 'permanent_state' in addr_data: perm_addr.state = addr_data['permanent_state']
                    if 'permanent_zipcode' in addr_data: perm_addr.zip_code = addr_data['permanent_zipcode']
                    perm_addr.is_same_permanant = False
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating profile (self)", employee_id=emp_id, error=str(e))
            return False

    @staticmethod
    def cancel_leave(leave_tran_id):
        """
        Cancels a leave transaction using ORM.
        
        Business Rules:
        1. Leave can be cancelled if from_date is today or in the future
        2. Leave cannot be cancelled if status is already CANCELLED or REJECTED
        3. Any other status (PENDING, APPROVED, PARTIAL_APPROVED, etc.) can be cancelled
        
        Returns:
            "Success" - Transaction cancelled successfully
            "Not Found" - Transaction not found
            "Not Cancellable" - Status/Date constraints not met
        """
        try:
            leave = LeaveTransaction.query.get(leave_tran_id)
            if not leave:
                Logger.warning("Leave cancellation failed - transaction not found", leave_tran_id=leave_tran_id)
                return "Not Found"
            
            today = datetime.now().date()
            from_date = leave.from_date.date() if isinstance(leave.from_date, datetime) else leave.from_date
            
            # Check if from_date is today or in the future
            is_cancellable_by_date = from_date >= today
            
            # Check if status allows cancellation (not already Cancelled or Rejected)
            is_cancellable_by_status = leave.leave_status not in [LeaveStatus.CANCELLED, LeaveStatus.REJECTED]
            
            if is_cancellable_by_date and is_cancellable_by_status:
                old_status = leave.leave_status
                leave.leave_status = LeaveStatus.CANCELLED
                db.session.commit()
                Logger.info("Leave cancelled successfully", 
                           leave_tran_id=leave_tran_id, 
                           old_status=old_status,
                           new_status=LeaveStatus.CANCELLED,
                           from_date=str(from_date))
                return "Success"
            
            # Log the specific reason for failure
            if not is_cancellable_by_date:
                Logger.warning("Leave cancellation failed - from_date is in the past", 
                              leave_tran_id=leave_tran_id, 
                              from_date=str(from_date),
                              today=str(today))
            elif not is_cancellable_by_status:
                Logger.warning("Leave cancellation failed - status is Cancelled or Rejected", 
                              leave_tran_id=leave_tran_id, 
                              current_status=leave.leave_status)
            
            return "Not Cancellable"
        except Exception as e:
            db.session.rollback()
            Logger.error("Error cancelling leave", 
                        leave_tran_id=leave_tran_id, 
                        error=str(e),
                        error_type=type(e).__name__)
            raise

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
                MasterSkill.skill_name,
                EmployeeSkill.skill_level
            ).join(
                MasterSkill,
                EmployeeSkill.skill_id == MasterSkill.skill_id
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

