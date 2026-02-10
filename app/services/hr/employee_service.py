from typing import List, Dict, Any, Optional
from sqlalchemy import text, func, case, or_, and_
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from datetime import datetime, date
from werkzeug.security import generate_password_hash
import base64

from ... import db
from ...models.hr import (Employee, EmployeeAddress, EmployeeSkill, Project, MasterSkill,
                          LateralAndExempt, Lob, MasterDesignation, MasterSubRole, 
                          EmployeeCredentials, EmployeeRole, MasterRole, ProjectAllocation,
                          EmployeeDesignation)
from ...models.leave import LeaveTransaction, LeaveOpeningTransaction
from ...utils.logger import Logger
from ...utils.constants import LeaveTypeID, LeaveStatus, FinancialYear, EmailConfig, LeaveConfiguration

class EmployeeService:
    @staticmethod
    def get_all_employees():
        """Retrieves all active employees with their roles."""
        try:
            Logger.info("Fetching all active employees")
            employees = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.middle_name,
                Employee.last_name,
                Employee.employment_status,
                Employee.date_of_joining,
                Employee.team_lead_id,
                MasterRole.role_name
            ).join(
                EmployeeRole, Employee.employee_id == EmployeeRole.employee_id
            ).join(
                MasterRole, EmployeeRole.role_id == MasterRole.role_id
            ).order_by(
                Employee.date_of_joining.asc()
            ).all()

            # Helper to get approver name
            def get_approver_name(approver_id):
                if not approver_id: return "None"
                approver = Employee.query.filter_by(employee_id=approver_id).first()
                if approver:
                    return f"{approver.first_name} {approver.last_name}"
                return "Unknown"

            return [
                {
                    "employeeId": e.employee_id,
                    "employeeName": f"{e.first_name} {e.middle_name or ''} {e.last_name}".replace("  ", " "),
                    "roleName": e.role_name,
                    "employmentStatus": e.employment_status,
                    "joiningDate": e.date_of_joining.isoformat() if e.date_of_joining else None,
                    "leaveApprover": get_approver_name(e.team_lead_id),
                    "teamLeadName": get_approver_name(e.team_lead_id)
                } for e in employees
            ]
        except Exception as e:
            Logger.error("Error fetching all employees", error=str(e))
            return []

    @staticmethod
    def get_potential_approvers():
        """Retrieves employees who can be approvers (Lead, HR, Admin roles)."""
        try:
            Logger.info("Fetching potential approvers")
            approvers = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.middle_name,
                Employee.last_name,
                MasterRole.role_name
            ).join(
                EmployeeRole, Employee.employee_id == EmployeeRole.employee_id
            ).join(
                MasterRole, EmployeeRole.role_id == MasterRole.role_id
            ).filter(
                MasterRole.role_name.in_(['Lead', 'HR', 'Admin']),
                Employee.employment_status.notin_(['Resigned', 'Relieved', 'Absconding'])
            ).order_by(
                Employee.first_name.asc()
            ).all()

            return [
                {
                    "employeeId": a.employee_id,
                    "employeeName": f"{a.first_name} {a.middle_name or ''} {a.last_name}".replace("  ", " "),
                    "roleName": a.role_name
                } for a in approvers
            ]
        except Exception as e:
            Logger.error("Error fetching potential approvers", error=str(e))
            return []

    @staticmethod
    def get_employee_dashboard_stats():
        """Aggregates employee dashboard statistics."""
        try:
            # Total Active Employees (Not Relieved or Absconding)
            total_active = Employee.query.filter(Employee.employment_status.notin_(['Relieved', 'Absconding', 'Resigned'])).count()
            
            # Total Interns
            total_interns = Employee.query.filter_by(employment_status='Intern').count()
            
            # Total Probation
            total_probation = Employee.query.filter_by(employment_status='Probation').count()

            return {
                'total_active': total_active,
                'total_interns': total_interns,
                'total_probation': total_probation
            }
        except Exception as e:
            Logger.error("Error fetching employee dashboard stats", error=str(e))
            return {
                'total_active': 0,
                'total_interns': 0,
                'total_probation': 0
            }

    @staticmethod
    def upsert_employee(data):
        """Creates or updates an employee record."""
        try:
            emp_id = data.get('EmployeeId')
            employee = Employee.query.get(emp_id) if emp_id else None
            
            if employee:
                Logger.info("Updating existing employee", employee_id=emp_id)
                for key, value in data.items():
                    if hasattr(employee, key):
                        setattr(employee, key, value)
            else:
                Logger.info("Creating new employee", employee_id=emp_id)
                employee = Employee(**data)
                db.session.add(employee)
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error upserting employee", error=str(e))
            return False

    @staticmethod
    def get_employee_details_for_relieving_letter():
        """Fetches employee details for relieving letter generation."""
        try:
            Logger.info("Fetching employee details for relieving letter")
            # This is a specific report logic - might need refinement
            return []
        except Exception as e:
            Logger.error("Error fetching relieving letter details", error=str(e))
            return []

    @staticmethod
    def get_employee_lateral_hires():
        """Retrieves all employees with their lateral hire status."""
        try:
            results = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.middle_name,
                Employee.last_name,
                LateralAndExempt.lateral_hire
            ).outerjoin(
                LateralAndExempt, Employee.employee_id == LateralAndExempt.employee_id
            ).all()

            return [
                {
                    "EmployeeId": r.employee_id,
                    "EmployeeName": f"{r.first_name} {r.middle_name or ''} {r.last_name}".replace("  ", " "),
                    "LateralHire": bool(r.lateral_hire)
                } for r in results
            ]
        except Exception as e:
            Logger.error("Error fetching lateral hires", error=str(e))
            return []

    @staticmethod
    def update_lateral_hire(employee_id, lateral_hire):
        """Updates or inserts lateral hire status for an employee."""
        try:
            record = LateralAndExempt.query.filter_by(employee_id=employee_id).first()
            if record:
                record.lateral_hire = lateral_hire
            else:
                record = LateralAndExempt(employee_id=employee_id, lateral_hire=lateral_hire)
                db.session.add(record)
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating lateral hire", employee_id=employee_id, error=str(e))
            return False

    @staticmethod
    def get_employee_exempt_data():
        """Retrieves exempt employee data with date ranges and shift times."""
        try:
            results = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.middle_name,
                Employee.last_name,
                LateralAndExempt.from_date,
                LateralAndExempt.to_date,
                LateralAndExempt.shift_start_from_time
            ).join(
                LateralAndExempt, Employee.employee_id == LateralAndExempt.employee_id
            ).filter(
                LateralAndExempt.from_date.isnot(None)
            ).all()

            return [
                {
                    "EmployeeId": r.employee_id,
                    "EmployeeName": f"{r.first_name} {r.middle_name or ''} {r.last_name}".replace("  ", " "),
                    "FromDate": r.from_date.isoformat() if r.from_date else None,
                    "ToDate": r.to_date.isoformat() if r.to_date else None,
                    "ShiftStartTime": str(r.shift_start_from_time)
                } for r in results
            ]
        except Exception as e:
            Logger.error("Error fetching exempt data", error=str(e))
            return []

    @staticmethod
    def insert_lateral_exempt_data(employee_id, from_date, to_date, shift_start_from_time):
        """Inserts lateral exempt data for an employee."""
        try:
            record = LateralAndExempt(
                employee_id=employee_id,
                from_date=from_date,
                to_date=to_date,
                shift_start_from_time=shift_start_from_time
            )
            db.session.add(record)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting lateral exempt data", error=str(e))
            return False

    @staticmethod
    def update_employee_details(employee_data: Dict[str, Any]) -> int:
        """
        Updates employee details including designations, documents, and project allocations.
        Returns 1 on success, -1 if employee not found.
        """
        emp_id = employee_data.get('employee_id')
        Logger.info("Executing UpdateEmployeeDetails logic", employee_id=emp_id)
        
        try:
            employee = Employee.query.filter_by(employee_id=emp_id).first()
            if not employee:
                Logger.warning("Employee not found for update", employee_id=emp_id)
                return -1
            
            sub_role_id = employee_data.get('sub_role_id') or employee_data.get('sub_role') or employee_data.get('MasterSubRole')
            if sub_role_id and str(sub_role_id).isdigit() and int(sub_role_id) != 0:
                employee.sub_role = int(sub_role_id)
                
            # Handle system role (role_id)
            if employee_data.get('role_id'):
                role_id = employee_data.get('role_id')
                # Update EmployeeRole
                emp_role = EmployeeRole.query.filter_by(employee_id=emp_id).first()
                if emp_role:
                    emp_role.role_id = int(role_id)
                else:
                    new_role = EmployeeRole(employee_id=emp_id, role_id=int(role_id))
                    db.session.add(new_role)
                
            lob_lead = employee_data.get('lob_lead_id')
            if lob_lead and lob_lead not in ('', 'string'):
                employee.lob_lead = lob_lead
            
            # Handle team_lead_id (leave approver)
            team_lead = employee_data.get('team_lead_id')
            if team_lead is not None:
                employee.team_lead_id = team_lead
                
            if employee_data.get('employment_status') is not None:
                employee.employment_status = employee_data['employment_status']
            
            # New fields for HR/Admin editing
            if employee_data.get('first_name') is not None:
                employee.first_name = employee_data['first_name']
            if employee_data.get('middle_name') is not None:
                employee.middle_name = employee_data['middle_name']
            if employee_data.get('last_name') is not None:
                employee.last_name = employee_data['last_name']
            if employee_data.get('date_of_birth') is not None:
                employee.date_of_birth = employee_data['date_of_birth']
            if employee_data.get('gender') is not None:
                employee.gender = employee_data['gender']
            if employee_data.get('blood_group') is not None:
                employee.blood_group = employee_data['blood_group']
            if employee_data.get('personal_email') is not None:
                employee.personal_email = employee_data['personal_email']
            if employee_data.get('email') is not None:
                employee.email = employee_data['email']
            if employee_data.get('date_of_joining') is not None:
                employee.date_of_joining = employee_data['date_of_joining']
            if employee_data.get('highestQualification') is not None:
                employee.highest_qualification = employee_data['highestQualification']
            elif employee_data.get('highest_qualification') is not None:
                employee.highest_qualification = employee_data['highest_qualification']
            if employee_data.get('emergency_contact_person') is not None:
                employee.emergency_contact_person = employee_data['emergency_contact_person']
            if employee_data.get('emergency_contact_relation') is not None:
                employee.emergency_contact_relation = employee_data['emergency_contact_relation']
            if employee_data.get('emergency_contact_number') is not None:
                employee.emergency_contact_number = employee_data['emergency_contact_number']
            if employee_data.get('qualificationYearMonth') is not None:
                employee.qualification_year_month = employee_data['qualificationYearMonth']
            elif employee_data.get('qualification_year_month') is not None:
                employee.qualification_year_month = employee_data['qualification_year_month']

            # Handle password update
            password = employee_data.get('password')
            if password:
                if len(password) < 8:
                    raise ValueError("Password must be at least 8 characters long")
                
                credentials = EmployeeCredentials.query.filter_by(employee_id=emp_id).first()
                password_hash = generate_password_hash(
                    password,
                    method='pbkdf2:sha256',
                    salt_length=16
                )
                
                if credentials:
                    credentials.password_hash = password_hash
                else:
                    new_credentials = EmployeeCredentials(
                        employee_id=emp_id,
                        password_hash=password_hash
                    )
                    db.session.add(new_credentials)
            
            contact_number = employee_data.get('mobile_no') or employee_data.get('contactNumber') or employee_data.get('contact_number')
            if contact_number is not None:
                employee.contact_number = contact_number
            if employee_data.get('internship_end_date') is not None:
                employee.internship_end_date = employee_data['internship_end_date']
            if employee_data.get('date_of_resignation') is not None:
                employee.date_of_resignation = employee_data['date_of_resignation']
            if employee_data.get('lwd') is not None:
                employee.lwd = employee_data['lwd']
            if employee_data.get('lwp') is not None:
                employee.lwp = employee_data['lwp']
            if employee_data.get('probation_end_date') is not None:
                employee.probation_end_date = employee_data['probation_end_date']
            
            # Handle Band/Designation update
            band_id = employee_data.get('band') or employee_data.get('designation_id')
            if band_id and str(band_id).isdigit() and int(band_id) != 0:
                emp_designation = EmployeeDesignation.query.filter_by(employee_id=emp_id).first()
                if emp_designation:
                    emp_designation.designation_id = int(band_id)
                else:
                    new_ed = EmployeeDesignation(employee_id=emp_id, designation_id=int(band_id))
                    db.session.add(new_ed)

            # Handle Addresses
            addresses = employee_data.get('addresses', [])
            if addresses:
                # Delete existing and re-insert or update
                EmployeeAddress.query.filter_by(employee_id=emp_id).delete()
                for addr in addresses:
                    # Default address_type to 'Residential' if not provided
                    addr_type = addr.get('address_type') or 'Residential'
                    new_addr = EmployeeAddress(
                        employee_id=emp_id,
                        address_type=addr_type,
                        state=addr.get('state'),
                        city=addr.get('city'),
                        address1=addr.get('address1'),
                        address2=addr.get('address2'),
                        is_same_permanant=addr.get('is_same_permanant', False),
                        zip_code=addr.get('zip_code')
                    )
                    db.session.add(new_addr)

            # Handle Skills
            skills = employee_data.get('skills', [])
            if skills:
                # Delete existing and re-insert
                EmployeeSkill.query.filter_by(employee_id=emp_id).delete()
                for skill_data in skills:
                    skill_id = skill_data.get('skill_id')
                    if not skill_id: continue
                    new_skill = EmployeeSkill(
                        employee_id=emp_id,
                        skill_id=skill_id,
                        skill_level=skill_data.get('skill_level'),
                        skill_category=skill_data.get('skill_category'),
                        self_evaluation=skill_data.get('self_evaluation')
                    )
                    db.session.add(new_skill)
            
            # Resume link handling removed - now managed via Azure Blob Storage
            # Use DocumentService.upload_document() to upload resumes
            
            project_details = employee_data.get('project_details', [])
            for source in project_details:
                project_id = source.get('project_id')
                if not project_id or int(project_id) == 0:
                    continue
                
                target = ProjectAllocation.query.filter_by(employee_id=emp_id, project_id=project_id).first()
                if target:
                    if source.get('project_billing') is not None and float(source['project_billing']) != 0:
                        target.project_billing = source['project_billing']
                    if source.get('project_allocation') is not None and float(source['project_allocation']) != 0:
                        target.project_allocation = source['project_allocation']
                    if source.get('role') is not None:
                        target.employee_role = source['role']
                else:
                    new_alloc = ProjectAllocation(
                        employee_id=emp_id,
                        project_id=project_id,
                        project_billing=source.get('project_billing'),
                        project_allocation=source.get('project_allocation'),
                        employee_role=source.get('role')
                    )
                    db.session.add(new_alloc)
            
            db.session.commit()
            Logger.info("Employee details updated successfully", employee_id=emp_id)
            return 1
        except Exception as e:
            db.session.rollback()
            Logger.critical("Error in update_employee_details", error=str(e), employee_id=emp_id)
            raise e

    @staticmethod
    def update_employee_by_self(employee_id: str, update_data: Dict[str, Any]) -> int:
        """
        Updates employee's own editable fields (contact, addresses, skills).
        Returns 1 on success, -1 if employee not found.
        """
        if not employee_id or not employee_id.strip():
            raise ValueError("Employee ID is required")
            
        Logger.info("Executing UpdateEmployeeDetailsBySelf logic", employee_id=employee_id)
        
        try:
            employee = Employee.query.filter_by(employee_id=employee_id).first()
            if not employee:
                Logger.warning("Employee not found for self-update", employee_id=employee_id)
                return -1
            
            if update_data.get('contact_number') is not None:
                employee.contact_number = update_data['contact_number']
                if update_data.get('emergency_contact_person') is not None:
                    employee.emergency_contact_person = update_data['emergency_contact_person']
                if update_data.get('emergency_contact_relation') is not None:
                    employee.emergency_contact_relation = update_data['emergency_contact_relation']
                if update_data.get('emergency_contact_number') is not None:
                    employee.emergency_contact_number = update_data['emergency_contact_number']
            
            skills = update_data.get('skills', [])
            if skills:
                for skill_data in skills:
                    skill_id = skill_data.get('skill_id')
                    if not skill_id:
                        continue
                    exists = db.session.query(EmployeeSkill).filter_by(
                        employee_id=employee_id, 
                        skill_id=skill_id
                    ).first()
                    if not exists:
                        new_skill = EmployeeSkill(
                            employee_id=employee_id,
                            skill_id=skill_id,
                            skill_level=skill_data.get('skill_level')
                        )
                        db.session.add(new_skill)

            addresses = update_data.get('addresses', [])
            if addresses:
                EmployeeAddress.query.filter_by(employee_id=employee_id).delete()
                for addr in addresses:
                    # Default address_type to 'Residential' if not provided
                    addr_type = addr.get('address_type') or 'Residential'
                    new_addr = EmployeeAddress(
                        employee_id=employee_id,
                        address_type=addr_type,
                        state=addr.get('state'),
                        city=addr.get('city'),
                        address1=addr.get('address1'),
                        address2=addr.get('address2'),
                        is_same_permanant=addr.get('is_same_permanant', False),
                        zip_code=addr.get('zip_code')
                    )
                    db.session.add(new_addr)
            
            db.session.commit()
            Logger.info("Employee self-details updated successfully", employee_id=employee_id)
            return 1
        except Exception as e:
            db.session.rollback()
            Logger.critical("Unexpected error in update_employee_by_self", employee_id=employee_id, error=str(e))
            raise e

    @staticmethod
    def get_all_employees_details() -> List[Dict[str, Any]]:
        """Retrieves comprehensive details for all employees including skills, leaves, and allocations."""
        Logger.info("Fetching all employees comprehensive details")
        try:
            from sqlalchemy import Integer
            LobLeadAlias = db.aliased(Employee)
            base_query = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.last_name,
                Employee.employment_status,
                Employee.team_lead_id,
                Employee.contact_number,
                Employee.date_of_resignation,
                Employee.internship_end_date,
                Employee.probation_end_date,
                Employee.last_working_date.label('lwd'),
                Employee.lwp,
                Employee.lob_lead.label('lob_lead_id'),
                MasterSubRole.sub_role_name.label('role'),
                (LobLeadAlias.first_name + ' ' + LobLeadAlias.last_name).label('lob_lead_name'),
                MasterDesignation.designation_name.label('band')
            ).outerjoin(
                MasterSubRole,
                Employee.sub_role == MasterSubRole.sub_role_id
            ).outerjoin(
                LobLeadAlias,
                Employee.lob_lead == LobLeadAlias.employee_id
            ).outerjoin(
                MasterDesignation,
                Employee.designation_id == MasterDesignation.designation_id
            ).order_by(
                func.cast(func.replace(Employee.employee_id, 'EMP', ''), Integer).asc()
            ).all()
            
            result = []
            for row in base_query:
                emp_id = row.employee_id
                leave_approver = None
                if row.team_lead_id:
                    approver = db.session.query(
                        (Employee.first_name + ' ' + Employee.last_name).label('name')
                    ).filter(Employee.employee_id == row.team_lead_id).first()
                    leave_approver = approver.name if approver else None
                
                skills_ranked = db.session.query(
                    MasterSkill.skill_name,
                    EmployeeSkill.skill_level
                ).join(MasterSkill, EmployeeSkill.skill_id == MasterSkill.skill_id).filter(
                    EmployeeSkill.employee_id == emp_id
                ).order_by(EmployeeSkill.skill_level.desc()).all()
                
                primary_skill = skills_ranked[0].skill_name if len(skills_ranked) > 0 else None
                secondary_skill = skills_ranked[1].skill_name if len(skills_ranked) > 1 else None
                
                # Resume document link removed - now stored in Azure Blob Storage
                resume_doc = None
                
                # Calculate current FY start date dynamically
                current_year = datetime.now().year
                fy_start = date(current_year, FinancialYear.START_MONTH, FinancialYear.START_DAY)
                
                pending_leaves = db.session.query(func.sum(LeaveTransaction.applied_leave_count)).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_status == LeaveStatus.PENDING,
                    LeaveTransaction.application_date > fy_start,
                    LeaveTransaction.approved_by.isnot(None)
                ).scalar() or 0
                
                unpaid_leaves = db.session.query(func.sum(LeaveTransaction.applied_leave_count)).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_type.in_([LeaveTypeID.LEAVE_WITHOUT_PAY, LeaveTypeID.UNPAID_LEAVE]),
                    LeaveTransaction.application_date > fy_start
                ).scalar() or 0
                
                wfh_opening = db.session.query(func.max(LeaveOpeningTransaction.no_of_days)).filter(
                    LeaveOpeningTransaction.employee_id == emp_id,
                    LeaveOpeningTransaction.leave_type_id == LeaveTypeID.WFH
                ).scalar() or 0
                wfh_used = db.session.query(func.sum(LeaveTransaction.applied_leave_count)).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_type == LeaveTypeID.WFH,
                    LeaveTransaction.application_date > fy_start
                ).scalar() or 0
                remaining_wfh = wfh_opening - wfh_used
                
                privilege_opening = db.session.query(func.sum(LeaveOpeningTransaction.no_of_days)).filter(
                    LeaveOpeningTransaction.employee_id == emp_id,
                    LeaveOpeningTransaction.leave_type_id == LeaveTypeID.PRIVILEGE
                ).scalar() or 0
                privilege_used = db.session.query(func.sum(LeaveTransaction.applied_leave_count)).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_type == LeaveTypeID.PRIVILEGE,
                    LeaveTransaction.leave_status.in_([LeaveStatus.APPROVED, LeaveStatus.PENDING])
                ).scalar() or 0
                privilege_leaves = privilege_opening - privilege_used
                
                sick_opening = db.session.query(func.sum(LeaveOpeningTransaction.no_of_days)).filter(
                    LeaveOpeningTransaction.employee_id == emp_id,
                    LeaveOpeningTransaction.leave_type_id == LeaveTypeID.SICK
                ).scalar() or 0
                sick_used = db.session.query(func.sum(LeaveTransaction.applied_leave_count)).filter(
                    LeaveTransaction.employee_id == emp_id,
                    LeaveTransaction.leave_type == LeaveTypeID.SICK,
                    LeaveTransaction.leave_status.in_([LeaveStatus.APPROVED, LeaveStatus.PENDING])
                ).scalar() or 0
                sick_leaves = sick_opening - sick_used
                remaining_leaves = privilege_leaves + sick_leaves
                
                domain = db.session.query(Lob.lob).filter(Lob.lob_lead == row.lob_lead_id).scalar() if row.lob_lead_id else None
                total_billing = db.session.query(func.sum(ProjectAllocation.project_billing)).filter(
                    ProjectAllocation.employee_id == emp_id
                ).scalar() or 0.0
                
                project_allocations = db.session.query(
                    Project.project_name,
                    ProjectAllocation.project_allocation.label('bandwidth_allocation'),
                    MasterSubRole.sub_role_name.label('project_role')
                ).select_from(ProjectAllocation).outerjoin(
                    Project, ProjectAllocation.project_id == Project.project_id
                ).outerjoin(
                    MasterSubRole, ProjectAllocation.employee_role == MasterSubRole.sub_role_id
                ).filter(ProjectAllocation.employee_id == emp_id).all()
                
                result.append({
                    'employee_id': emp_id,
                    'first_name': row.first_name or '',
                    'last_name': row.last_name or '',
                    'contact': row.contact_number or '',
                    'employment_status': row.employment_status or '',
                    'role': row.role or '',
                    'lob_lead': row.lob_lead_name or '',
                    'band': row.band or '',
                    'leave_approver': leave_approver or '',
                    'primary_skill': primary_skill or '',
                    'secondary_skill': secondary_skill or '',
                    'resume_link': resume_doc or '',
                    'pending_leaves_count': int(pending_leaves),
                    'unpaid_leave_count': int(unpaid_leaves),
                    'remaining_wfh_balance': int(remaining_wfh),
                    'domain': domain or '',
                    'billing': float(total_billing),
                    'project_details': [{'projectName': p.project_name, 'BandwidthAllocation': p.bandwidth_allocation, 'Role': p.project_role} for p in project_allocations],
                    'date_of_resignation': row.date_of_resignation.isoformat() if row.date_of_resignation else None,
                    'internship_end_date': row.internship_end_date.isoformat() if row.internship_end_date else None,
                    'probation_end_date': row.probation_end_date.isoformat() if row.probation_end_date else None,
                    'lwd': row.lwd.isoformat() if row.lwd else None,
                    'lwp': row.lwp or 0,
                    'privilege_leaves': int(privilege_leaves),
                    'sick_leaves': int(sick_leaves),
                    'remaining_leaves': int(remaining_leaves)
                })
            return result
        except Exception as e:
            Logger.error("Error fetching all employees details", error=str(e))
            raise e

    @staticmethod
    def get_employee_with_address_and_skills(emp_id: str) -> Dict[str, Any]:
        """Retrieves comprehensive employee details with addresses and skills."""
        if not emp_id or not emp_id.strip():
            raise ValueError("Employee ID is required")
        Logger.info("Fetching employee details with address and skills", employee_id=emp_id)
        try:
            from sqlalchemy import and_
            ResidentialAddr = db.aliased(EmployeeAddress)
            PermanentAddr = db.aliased(EmployeeAddress)
            employee_query = db.session.query(
                Employee, ResidentialAddr, PermanentAddr, MasterDesignation.designation_name.label('designation_name'), MasterSubRole.sub_role_name.label('employee_sub_role')
            ).outerjoin(
                ResidentialAddr, and_(Employee.employee_id == ResidentialAddr.employee_id, ResidentialAddr.address_type == 'Residential')
            ).outerjoin(
                PermanentAddr, and_(Employee.employee_id == PermanentAddr.employee_id, PermanentAddr.address_type == 'Permanent')
            ).outerjoin(
                EmployeeDesignation, Employee.employee_id == EmployeeDesignation.employee_id
            ).outerjoin(
                MasterDesignation, EmployeeDesignation.designation_id == MasterDesignation.designation_id
            ).outerjoin(
                MasterSubRole, Employee.sub_role == MasterSubRole.sub_role_id
            ).filter(Employee.employee_id == emp_id).first()
            
            if not employee_query or not employee_query[0]:
                raise LookupError(f"Employee {emp_id} not found")
            
            employee, res_addr, perm_addr, employee_designation, employee_sub_role = employee_query
            
            # Resume link is now in Azure Blob Storage - would need to fetch separately if needed
            resume_link = None
            
            # Fetch Designation ID for 'band'
            designation_query =  db.session.query(EmployeeDesignation.designation_id).filter_by(employee_id=emp_id).first()
            designation_id = designation_query[0] if designation_query else None

            def format_date(date_obj): return date_obj.strftime('%d %b %Y') if date_obj else None
            
            addresses = {}
            if res_addr:
                addresses = {
                    'residentialAddressType': res_addr.address_type,
                    'residentialState': res_addr.state or '',
                    'residentialCity': res_addr.city or '',
                    'residentialAddress1': res_addr.address1 or '',
                    'residentialAddress2': res_addr.address2 or '',
                    'residentialZipcode': res_addr.zip_code or '',
                    'isSamePermanant': res_addr.is_same_permanant or False
                }
                if res_addr.is_same_permanant:
                    addresses.update({
                        'permanentAddressType': res_addr.address_type,
                        'permanentState': res_addr.state or '',
                        'permanentCity': res_addr.city or '',
                        'permanentAddress1': res_addr.address1 or '',
                        'permanentAddress2': res_addr.address2 or '',
                        'permanentZipcode': res_addr.zip_code or ''
                    })
                elif perm_addr:
                    addresses.update({
                        'permanentAddressType': perm_addr.address_type,
                        'permanentState': perm_addr.state or '',
                        'permanentCity': perm_addr.city or '',
                        'permanentAddress1': perm_addr.address1 or '',
                        'permanentAddress2': perm_addr.address2 or '',
                        'permanentZipcode': perm_addr.zip_code or ''
                    })

            skills_query = db.session.query(
                EmployeeSkill.skill_id, 
                MasterSkill.skill_name, 
                EmployeeSkill.skill_level,
                EmployeeSkill.skill_category,
                EmployeeSkill.self_evaluation
            ).join(
                MasterSkill, EmployeeSkill.skill_id == MasterSkill.skill_id
            ).filter(EmployeeSkill.employee_id == emp_id).all()

            # Get System Role ID
            system_role = EmployeeRole.query.filter_by(employee_id=emp_id).first()
            system_role_id = system_role.role_id if system_role else None
            system_role_name = None
            if system_role_id:
                master_role = MasterRole.query.filter_by(role_id=system_role_id).first()
                if master_role:
                    system_role_name = master_role.role_name
            
            result = {
                'employeeId': employee.employee_id,
                'firstName': employee.first_name or '',
                'middleName': employee.middle_name or '',
                'lastName': employee.last_name or '',
                'dateOfBirth': format_date(employee.date_of_birth),
                'contactNumber': employee.contact_number or '',
                'personalEmail': employee.personal_email or '',
                'emergencyContactNumber': employee.emergency_contact_number or '',
                'emergencyContactPerson': employee.emergency_contact_person or '',
                'emergencyContactRelation': employee.emergency_contact_relation or '',
                'email': employee.email or '',
                'gender': employee.gender or '',
                'email': employee.email or '',
                'gender': employee.gender or '',
                'MasterSubRole': employee.sub_role, # Maps to sub_role ID
                'subRoleName': employee_sub_role,
                'role_id': system_role_id, # System Role ID
                'roleName': system_role_name, # System Role Name
                'band': designation_id, # Maps to designation_id
                'designationName': employee_designation,
                'bloodGroup': employee.blood_group or '',
                'dateOfJoining': format_date(employee.date_of_joining),
                'ctc': float(employee.ctc) if employee.ctc else 0.0,
                'teamLeadId': employee.team_lead_id or '',
                'employmentStatus': employee.employment_status or '',
                'highestQualification': employee.highest_qualification or '',
                'qualificationYearMonth': employee.qualification_year_month or '',
                'resumeLink': resume_link or '',
                'lwp': employee.lwp or 0,
                'internshipEndDate': format_date(employee.internship_end_date),
                'lwd': format_date(employee.lwd),
                'dateOfResignation': format_date(employee.date_of_resignation),
                'probationEndDate': format_date(employee.probation_end_date),
                'addresses': addresses,
                'skills': [{
                    'skillId': s.skill_id, 
                    'skillName': s.skill_name, 
                    'skillLevel': s.skill_level or '',
                    'skillCategory': s.skill_category or '',
                    'selfEvaluation': float(s.self_evaluation) if s.self_evaluation else 0.0
                } for s in skills_query],
                'profileImage': f"data:{employee.profile_image_type};base64,{base64.b64encode(employee.profile_image).decode('utf-8')}" if employee.profile_image else None
            }
            
            # Add leave approver name
            if employee.team_lead_id:
                approver = Employee.query.filter_by(employee_id=employee.team_lead_id).first()
                if approver:
                    result['leaveApproverName'] = f"{approver.first_name} {approver.last_name}"
            
            return result
        except Exception as e:
            Logger.error("Error fetching employee details with skills", error=str(e))
            raise e

    @staticmethod
    def insert_employee(employee_data: Dict[str, Any]) -> str:
        """
        Creates new employee with addresses, skills, and hashed credentials.
        Checks for duplicates based on email/name/contact before insertion.
        """
        Logger.info("Executing InsertEmployee logic")
        
        # Map camelCase to snake_case if needed
        key_mapping = {
            'firstName': 'first_name',
            'lastName': 'last_name',
            'middleName': 'middle_name',
            'contactNumber': 'contact_number',
            'dateOfBirth': 'date_of_birth',
            'dateOfJoining': 'date_of_joining',
            'teamLeadId': 'team_lead_id',
            'employmentStatus': 'employment_status',
            'emergencyContactNumber': 'emergency_contact_number',
            'emergencyContactPerson': 'emergency_contact_person',
            'emergencyContactRelation': 'emergency_contact_relation',
            'personalEmail': 'personal_email',
            'bloodGroup': 'blood_group',
            'highestQualification': 'highest_qualification',
            'dateOfResignation': 'date_of_resignation',
            'internshipEndDate': 'internship_end_date',
            'probationEndDate': 'probation_end_date',
            'MasterSubRole': 'sub_role',
            'role': 'role_id'
        }
        for camel, snake in key_mapping.items():
            if camel in employee_data and snake not in employee_data:
                employee_data[snake] = employee_data[camel]

        required_fields = ['first_name', 'last_name', 'email', 'date_of_birth', 'contact_number', 
                          'date_of_joining', 'band', 'password', 'role_id']
        missing = [f for f in required_fields if not employee_data.get(f)]
        if missing: 
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        # Validate password strength
        password = employee_data.get('password')
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        try:
            # Check for duplicate employee
            existing_employee = Employee.query.filter(
                or_(
                    and_(
                        Employee.email == employee_data['email'],
                        Employee.first_name == employee_data['first_name'],
                        Employee.last_name == employee_data['last_name']
                    ),
                    Employee.contact_number == employee_data['contact_number']
                )
            ).first()
            
            if existing_employee:
                Logger.warning(
                    "Duplicate employee found",
                    email=employee_data['email'],
                    contact=employee_data['contact_number'],
                    name=f"{employee_data['first_name']} {employee_data['last_name']}"
                )
                raise ValueError(
                    f"Employee already exists with the same email, first name, last name, and/or contact number. "
                    f"Existing employee ID: {existing_employee.employee_id}"
                )
            
            
            # Generate new employee ID using autoincrement id field
            latest_employee = db.session.query(Employee.id, Employee.employee_id).order_by(
                Employee.id.desc()
            ).first()
            
            if latest_employee:
                # Use the latest autoincrement id to generate next employee_id
                latest_id_str = latest_employee.employee_id
                latest_id_num = int(latest_id_str.replace('EMP', ''))
                new_id_num = latest_id_num + 1
            else:
                # First employee ever
                new_id_num = 1
            
            employee_id = f"EMP{new_id_num}"
            Logger.info("Generated new employee ID", employee_id=employee_id, id_number=new_id_num)
            
            
            # Use provided team lead or find default (HR)
            team_lead_id = employee_data.get('team_lead_id')
            if not team_lead_id:
                hr_employee = Employee.query.filter_by(email=EmailConfig.DEFAULT_TEAM_LEAD_EMAIL).first()
                if hr_employee:
                    team_lead_id = hr_employee.employee_id
            
            # Create employee record
            new_employee = Employee(
                employee_id=employee_id, first_name=employee_data['first_name'], middle_name=employee_data.get('middle_name'),
                last_name=employee_data['last_name'], date_of_birth=employee_data['date_of_birth'], contact_number=employee_data['contact_number'],
                emergency_contact_number=employee_data.get('emergency_contact_number'), emergency_contact_person=employee_data.get('emergency_contact_person'),
                emergency_contact_relation=employee_data.get('emergency_contact_relation'), email=employee_data['email'],
                personal_email=employee_data.get('personal_email'), gender=employee_data.get('gender'), blood_group=employee_data.get('blood_group'),
                date_of_joining=employee_data['date_of_joining'], sub_role=employee_data['sub_role'], highest_qualification=employee_data.get('highest_qualification'),
                employment_status=employee_data.get('employment_status', 'Active'), team_lead_id=team_lead_id, date_of_resignation=employee_data.get('date_of_resignation'),
                lwd=employee_data.get('lwd'), lwp=employee_data.get('lwp'), internship_end_date=employee_data.get('internship_end_date'),
                probation_end_date=employee_data.get('probation_end_date')
            )
            db.session.add(new_employee)
            
            # Create employee designation
            db.session.add(EmployeeDesignation(employee_id=employee_id, designation_id=employee_data['band']))
            
            # Create employee role
            db.session.add(EmployeeRole(employee_id=employee_id, role_id=employee_data['role_id']))
            Logger.info("Employee role assigned", employee_id=employee_id, role_id=employee_data['role_id'])
            
            # Create employee credentials with hashed password
            password_hash = generate_password_hash(
                password,
                method='pbkdf2:sha256',
                salt_length=16
            )
            new_credentials = EmployeeCredentials(
                employee_id=employee_id,
                password_hash=password_hash  # Store secure hash
            )
            db.session.add(new_credentials)
            Logger.info("Employee credentials created", employee_id=employee_id)
            
            # Handle addresses
            addresses = employee_data.get('addresses')
            if addresses:
                db.session.add(EmployeeAddress(employee_id=employee_id, address_type='Residential', state=addresses.get('residential_state'), city=addresses.get('residential_city'), address1=addresses.get('residential_address1'), address2=addresses.get('residential_address2'), is_same_permanant=addresses.get('is_same_permanant', False), zip_code=addresses.get('residential_zipcode')))
                if not addresses.get('is_same_permanant', False):
                    db.session.add(EmployeeAddress(employee_id=employee_id, address_type='Permanent', state=addresses.get('permanent_state'), city=addresses.get('permanent_city'), address1=addresses.get('permanent_address1'), address2=addresses.get('permanent_address2'), is_same_permanant=False, zip_code=addresses.get('permanent_zipcode')))
            
            # Handle skills
            for skill in employee_data.get('skills', []):
                db.session.add(EmployeeSkill(employee_id=employee_id, skill_id=skill.get('skill_id'), skill_level=skill.get('skill_level')))
            
            # Default Leave Allocations
            today = datetime.now().date()

            # Calculate default privilege leaves based on joining month
            employee_date_of_joining = datetime.fromisoformat(employee_data['date_of_joining'])
            month_of_joining = employee_date_of_joining.month

            default_privilege_leaves = LeaveConfiguration.PRIVILEGE_LEAVE['default_allocation']
            if (month_of_joining < 4):
                default_privilege_leaves = 4 - month_of_joining
            else:
                default_privilege_leaves = default_privilege_leaves - (month_of_joining - 4)
            
            default_work_from_home_leaves = LeaveConfiguration.WFH['default_allocation']
            if (month_of_joining < 4):
                default_work_from_home_leaves = (4 - month_of_joining) * LeaveConfiguration.WFH['monthly_deduction']
            else:
                default_work_from_home_leaves = default_work_from_home_leaves - ((month_of_joining - 4) * LeaveConfiguration.WFH['monthly_deduction'])

            default_allocations = [
                (LeaveTypeID.PRIVILEGE, default_privilege_leaves),
                (LeaveTypeID.SICK, LeaveConfiguration.SICK_LEAVE['default_allocation']),
                (LeaveTypeID.WFH, default_work_from_home_leaves)
            ]
            
            for lt_id, days in default_allocations:
                db.session.add(LeaveOpeningTransaction(
                    employee_id=employee_id,
                    leave_type_id=lt_id,
                    no_of_days=days,
                    added_by='System',
                    transaction_date=today,
                    approved_by='System',
                    approved_date=today,
                    is_carry_forwarded=False
                ))
            
            db.session.commit()
            Logger.info("Employee inserted successfully", employee_id=employee_id)
            return employee_id
            
        except ValueError as ve:
            # Don't rollback for validation errors
            Logger.warning("Validation error during employee insertion", error=str(ve))
            raise ve
        except Exception as e:
            db.session.rollback()
            Logger.critical("Error inserting employee", error=str(e))
            raise e

    @staticmethod
    def cancel_leave(leave_tran_id: int, leave_status: str = 'Cancel') -> bool:
        """Cancels a leave transaction by updating its status."""
        try:
            leave = LeaveTransaction.query.get(leave_tran_id)
            if not leave: raise LookupError(f"Leave transaction {leave_tran_id} not found")
            leave.leave_status = leave_status
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def get_new_joinees() -> List[Dict[str, Any]]:
        """Retrieves employees who joined within the last 2 months with their designation and sub role."""
        try:
            from dateutil.relativedelta import relativedelta
            
            Logger.info("Fetching new joinees (joined within last 2 months)")
            
            # Calculate date 2 months ago from today
            two_months_ago = datetime.now().date() - relativedelta(months=2)
            
            # Query employees with joining date within last 2 months
            new_joinees = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.middle_name,
                Employee.last_name,
                Employee.date_of_joining,
                MasterDesignation.designation_name.label('band'),
                MasterSubRole.sub_role_name.label('sub_role')
            ).outerjoin(
                EmployeeDesignation, Employee.employee_id == EmployeeDesignation.employee_id
            ).outerjoin(
                MasterDesignation, EmployeeDesignation.designation_id == MasterDesignation.designation_id
            ).outerjoin(
                MasterSubRole, Employee.sub_role == MasterSubRole.sub_role_id
            ).filter(
                Employee.date_of_joining >= two_months_ago,
                Employee.employment_status.notin_(['Relieved', 'Resigned', 'Absconding'])
            ).order_by(
                Employee.date_of_joining.desc()
            ).all()
            
            return [
                {
                    "employee_id": e.employee_id,
                    "employee_name": f"{e.first_name} {e.middle_name or ''} {e.last_name}".replace("  ", " ").strip(),
                    "date_of_joining": e.date_of_joining.isoformat() if e.date_of_joining else None,
                    "band": e.band or "Not Assigned",
                    "sub_role": e.sub_role or "Not Assigned"
                } for e in new_joinees
            ]
        except Exception as e:
            Logger.error("Error fetching new joinees", error=str(e))
            return []
    @staticmethod
    def get_upcoming_birthdays() -> List[Dict[str, Any]]:
        """Retrieves active employees who have birthdays within the next 2 months, including today."""
        try:
            from dateutil.relativedelta import relativedelta
            from sqlalchemy import extract
            
            Logger.info("Fetching upcoming birthdays (next 2 months)")
            
            today = datetime.now().date()
            two_months_from_now = today + relativedelta(months=2)
            
            # Extract month and day for comparison
            m1, d1 = today.month, today.day
            m2, d2 = two_months_from_now.month, two_months_from_now.day
            
            query = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.middle_name,
                Employee.last_name,
                Employee.date_of_birth
            ).filter(
                Employee.employment_status.notin_(['Relieved', 'Resigned', 'Absconding']),
                Employee.date_of_birth != None
            )
            
            # Handle wrap around if end month is smaller than start month
            if m1 <= m2:
                # Same year
                query = query.filter(
                    (extract('month', Employee.date_of_birth) > m1) |
                    ((extract('month', Employee.date_of_birth) == m1) & (extract('day', Employee.date_of_birth) >= d1))
                ).filter(
                    (extract('month', Employee.date_of_birth) < m2) |
                    ((extract('month', Employee.date_of_birth) == m2) & (extract('day', Employee.date_of_birth) <= d2))
                )
            else:
                # Wrap around to next year
                query = query.filter(
                    ((extract('month', Employee.date_of_birth) > m1) |
                     ((extract('month', Employee.date_of_birth) == m1) & (extract('day', Employee.date_of_birth) >= d1))) |
                    ((extract('month', Employee.date_of_birth) < m2) |
                     ((extract('month', Employee.date_of_birth) == m2) & (extract('day', Employee.date_of_birth) <= d2)))
                )
            
            new_joinees = query.all()
            
            results = []
            for e in new_joinees:
                dob = e.date_of_birth
                # Get birthday in current and next year for sorting
                bday_this_year = dob.replace(year=today.year)
                if bday_this_year < today:
                    bday_this_year = bday_this_year.replace(year=today.year + 1)
                
                results.append({
                    "employee_id": e.employee_id,
                    "employee_name": f"{e.first_name} {e.middle_name or ''} {e.last_name}".replace("  ", " ").strip(),
                    "date": dob.strftime("%d %b"), # Format: 05 Oct
                    "sort_date": bday_this_year
                })
            
            # Sort by upcoming date
            results.sort(key=lambda x: x['sort_date'])
            
            # Remove sort_date before returning
            for r in results:
                r.pop('sort_date')
                
            return results
        except Exception as e:
            Logger.error("Error fetching upcoming birthdays", error=str(e))
            return []
