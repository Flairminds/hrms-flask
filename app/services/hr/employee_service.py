from typing import List, Dict, Any, Optional
from sqlalchemy import text, func, case, or_, and_
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from datetime import datetime, date
from werkzeug.security import generate_password_hash

from ... import db
from ...models.hr import (Employee, EmployeeAddress, EmployeeSkill, Project, Skill,
                          LateralAndExempt, Lob, Designation, EmployeeSubRole, 
                          EmployeeCredentials, EmployeeRole, Role, ProjectAllocation,
                          EmployeeDesignation, EmployeeDocuments)
from ...models.leave import LeaveTransaction, LeaveOpeningTransaction
from ...utils.logger import Logger
from ...utils.constants import LeaveTypeID, LeaveStatus, FinancialYear

class EmployeeService:
    @staticmethod
    def get_all_employees():
        """
        Retrieves a list of all active employees with their roles using ORM.
        Mirrors the 'GetAllEmployees' logic from the .NET backend.
        """
        try:
            Logger.info("Fetching all active employees")
            employees = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.middle_name,
                Employee.last_name,
                Role.role_name
            ).join(
                EmployeeRole, Employee.employee_id == EmployeeRole.employee_id
            ).join(
                Role, EmployeeRole.role_id == Role.role_id
            ).filter(
                Employee.employment_status != 'Terminated'
            ).all()

            return [
                {
                    "EmployeeId": e.employee_id,
                    "EmployeeName": f"{e.first_name} {e.middle_name or ''} {e.last_name}".replace("  ", " "),
                    "RoleName": e.role_name
                } for e in employees
            ]
        except Exception as e:
            Logger.error("Error fetching all employees", error=str(e))
            return []

    @staticmethod
    def upsert_employee(data):
        """
        Creates or updates an employee record. 
        Note: This is a simplified version of the logic in the .NET stored procedures.
        """
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
        """Fetches employee details needed for a relieving letter using ORM."""
        try:
            Logger.info("Fetching employee details for relieving letter")
            # This is a specific report logic - might need refinement
            return []
        except Exception as e:
            Logger.error("Error fetching relieving letter details", error=str(e))
            return []

    @staticmethod
    def get_employee_lateral_hires():
        """
        Retrieves all employees with their lateral hire status using ORM.
        Returns employee ID, full name, and lateral hire flag.
        """
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
        """
        Updates or inserts lateral hire status for an employee using ORM.
        Returns True if successful, False otherwise.
        """
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
        """
        Retrieves exempt employee data with date ranges and shift times using ORM.
        Only returns records with valid from_date.
        """
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
        """
        Inserts lateral exempt data for an employee using ORM.
        Returns True if successful, False otherwise.
        """
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
        Comprehensive employee update with project allocations using ORM.
        Migrated from C# using stored procedure '[dbo].[UpdateEmployeeDetails]'.
        """
        emp_id = employee_data.get('employee_id')
        Logger.info("Executing UpdateEmployeeDetails logic", employee_id=emp_id)
        
        try:
            employee = Employee.query.filter_by(employee_id=emp_id).first()
            if not employee:
                Logger.warning("Employee not found for update", employee_id=emp_id)
                return -1
            
            sub_role_id = employee_data.get('sub_role_id')
            if sub_role_id and int(sub_role_id) != 0:
                employee.sub_role = sub_role_id
                
            lob_lead = employee_data.get('lob_lead_id')
            if lob_lead and lob_lead not in ('', 'string'):
                employee.lob_lead = lob_lead
                
            if employee_data.get('employment_status') is not None:
                employee.employment_status = employee_data['employment_status']
            if employee_data.get('mobile_no') is not None:
                employee.contact_number = employee_data['mobile_no']
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
            
            designation_id = employee_data.get('designation_id')
            if designation_id and int(designation_id) != 0:
                emp_designation = EmployeeDesignation.query.filter_by(employee_id=emp_id).first()
                if emp_designation:
                    emp_designation.designation_id = designation_id
                else:
                    new_ed = EmployeeDesignation(employee_id=emp_id, designation_id=designation_id)
                    db.session.add(new_ed)
            
            resume_link = employee_data.get('resume_link')
            if resume_link is not None:
                emp_doc = EmployeeDocuments.query.filter_by(employee_id=emp_id, document_id=1).first()
                if emp_doc:
                    emp_doc.document_link = resume_link
                else:
                    new_doc = EmployeeDocuments(employee_id=emp_id, document_id=1, document_link=resume_link)
                    db.session.add(new_doc)
            
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
        Migrated from C# using stored procedure '[dbo].[UpdateEmployeeDetailsBySelf]'.
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
                    new_addr = EmployeeAddress(
                        employee_id=employee_id,
                        address_type=addr.get('address_type'),
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
        """
        Retrieves comprehensive details for all employees.
        Migrated from C# using SP logic.
        """
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
                EmployeeSubRole.sub_role_name.label('role'),
                (LobLeadAlias.first_name + ' ' + LobLeadAlias.last_name).label('lob_lead_name'),
                Designation.designation_name.label('band')
            ).outerjoin(
                EmployeeSubRole,
                Employee.sub_role == EmployeeSubRole.sub_role_id
            ).outerjoin(
                LobLeadAlias,
                Employee.lob_lead == LobLeadAlias.employee_id
            ).outerjoin(
                Designation,
                Employee.designation_id == Designation.designation_id
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
                    Skill.skill_name,
                    EmployeeSkill.skill_level
                ).join(Skill, EmployeeSkill.skill_id == Skill.skill_id).filter(
                    EmployeeSkill.employee_id == emp_id
                ).order_by(EmployeeSkill.skill_level.desc()).all()
                
                primary_skill = skills_ranked[0].skill_name if len(skills_ranked) > 0 else None
                secondary_skill = skills_ranked[1].skill_name if len(skills_ranked) > 1 else None
                
                resume_doc = db.session.query(
                    func.max(EmployeeDocuments.document_link)
                ).filter(EmployeeDocuments.employee_id == emp_id).scalar()
                
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
                    EmployeeSubRole.sub_role_name.label('project_role')
                ).select_from(ProjectAllocation).outerjoin(
                    Project, ProjectAllocation.project_id == Project.project_id
                ).outerjoin(
                    EmployeeSubRole, ProjectAllocation.employee_role == EmployeeSubRole.sub_role_id
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
        """
        Retrieves comprehensive employee details with addresses and skills.
        """
        if not emp_id or not emp_id.strip():
            raise ValueError("Employee ID is required")
        Logger.info("Fetching employee details with address and skills", employee_id=emp_id)
        try:
            from sqlalchemy import and_
            ResidentialAddr = db.aliased(EmployeeAddress)
            PermanentAddr = db.aliased(EmployeeAddress)
            employee_query = db.session.query(
                Employee, ResidentialAddr, PermanentAddr,
                EmployeeDocuments.document_link.label('resume_link'),
                EmployeeDesignation.designation_id.label('designation_id')
            ).outerjoin(
                ResidentialAddr, and_(Employee.employee_id == ResidentialAddr.employee_id, ResidentialAddr.address_type == 'Residential')
            ).outerjoin(
                PermanentAddr, and_(Employee.employee_id == PermanentAddr.employee_id, PermanentAddr.address_type == 'Permanent')
            ).outerjoin(
                EmployeeDocuments, and_(Employee.employee_id == EmployeeDocuments.employee_id, EmployeeDocuments.document_id == 1)
            ).outerjoin(
                EmployeeDesignation, Employee.employee_id == EmployeeDesignation.employee_id
            ).filter(Employee.employee_id == emp_id).first()
            
            if not employee_query or not employee_query[0]:
                raise LookupError(f"Employee {emp_id} not found")
            
            employee, res_addr, perm_addr, resume_link, designation_id = employee_query
            def format_date(date_obj): return date_obj.strftime('%d %b %Y') if date_obj else None
            
            addresses = {}
            if res_addr:
                addresses = {
                    'residential_address_type': res_addr.address_type,
                    'residential_state': res_addr.state or '',
                    'residential_city': res_addr.city or '',
                    'residential_address1': res_addr.address1 or '',
                    'residential_address2': res_addr.address2 or '',
                    'residential_zipcode': res_addr.zip_code or '',
                    'is_same_permanant': res_addr.is_same_permanant or False
                }
                if res_addr.is_same_permanant:
                    addresses.update({
                        'permanent_address_type': res_addr.address_type,
                        'permanent_state': res_addr.state or '',
                        'permanent_city': res_addr.city or '',
                        'permanent_address1': res_addr.address1 or '',
                        'permanent_address2': res_addr.address2 or '',
                        'permanent_zipcode': res_addr.zip_code or ''
                    })
                elif perm_addr:
                    addresses.update({
                        'permanent_address_type': perm_addr.address_type,
                        'permanent_state': perm_addr.state or '',
                        'permanent_city': perm_addr.city or '',
                        'permanent_address1': perm_addr.address1 or '',
                        'permanent_address2': perm_addr.address2 or '',
                        'permanent_zipcode': perm_addr.zip_code or ''
                    })

            skills_query = db.session.query(EmployeeSkill.skill_id, Skill.skill_name, EmployeeSkill.skill_level).join(
                Skill, EmployeeSkill.skill_id == Skill.skill_id).filter(EmployeeSkill.employee_id == emp_id).all()
            
            return {
                'employee_id': employee.employee_id,
                'first_name': employee.first_name or '',
                'middle_name': employee.middle_name or '',
                'last_name': employee.last_name or '',
                'date_of_birth': format_date(employee.date_of_birth),
                'contact_number': employee.contact_number or '',
                'personal_email': employee.personal_email or '',
                'emergency_contact_number': employee.emergency_contact_number or '',
                'emergency_contact_person': employee.emergency_contact_person or '',
                'emergency_contact_relation': employee.emergency_contact_relation or '',
                'email': employee.email or '',
                'gender': employee.gender or '',
                'employee_sub_role': employee.sub_role,
                'band': designation_id,
                'blood_group': employee.blood_group or '',
                'date_of_joining': format_date(employee.date_of_joining),
                'ctc': float(employee.ctc) if employee.ctc else 0.0,
                'team_lead_id': employee.team_lead_id or '',
                'highest_qualification': employee.highest_qualification or '',
                'resume_link': resume_link or '',
                'lwp': employee.lwp or 0,
                'internship_end_date': format_date(employee.internship_end_date),
                'lwd': format_date(employee.last_working_date),
                'date_of_resignation': format_date(employee.date_of_resignation),
                'probation_end_date': format_date(employee.probation_end_date),
                'addresses': addresses,
                'skills': [{'skill_id': s.skill_id, 'skill_name': s.skill_name, 'skill_level': s.skill_level or ''} for s in skills_query]
            }
        except Exception as e:
            Logger.error("Error fetching employee details with skills", error=str(e))
            raise e

    @staticmethod
    def insert_employee(employee_data: Dict[str, Any]) -> str:
        """
        Inserts new employee with addresses, skills, and credentials.
        Checks for duplicate employees based on email, first name, last name, and contact number.
        
        Args:
            employee_data: Dictionary containing employee information including:
                - password: Plain text password (will be hashed)
                - All other standard employee fields
        
        Returns:
            employee_id: The newly created employee ID
        
        Raises:
            ValueError: If duplicate employee found or required fields missing
        """
        Logger.info("Executing InsertEmployee logic")
        required_fields = ['first_name', 'last_name', 'email', 'date_of_birth', 'contact_number', 
                          'date_of_joining', 'sub_role', 'band', 'password']
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
                    and_(
                        Employee.contact_number == employee_data['contact_number'],
                        Employee.first_name == employee_data['first_name'],
                        Employee.last_name == employee_data['last_name']
                    )
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
            
            # Generate new employee ID
            sequence_val = db.session.execute(text("SELECT NEXT VALUE FOR [dbo].[Employee_Seq]")).scalar()
            employee_id = f"EMP{sequence_val}"
            
            # Create employee record
            new_employee = Employee(
                employee_id=employee_id, first_name=employee_data['first_name'], middle_name=employee_data.get('middle_name'),
                last_name=employee_data['last_name'], date_of_birth=employee_data['date_of_birth'], contact_number=employee_data['contact_number'],
                emergency_contact_number=employee_data.get('emergency_contact_number'), emergency_contact_person=employee_data.get('emergency_contact_person'),
                emergency_contact_relation=employee_data.get('emergency_contact_relation'), email=employee_data['email'],
                personal_email=employee_data.get('personal_email'), gender=employee_data.get('gender'), blood_group=employee_data.get('blood_group'),
                date_of_joining=employee_data['date_of_joining'], sub_role=employee_data['sub_role'], highest_qualification=employee_data.get('highest_qualification'),
                employment_status='Active', team_lead_id='EMP77', date_of_resignation=employee_data.get('date_of_resignation'),
                lwd=employee_data.get('lwd'), lwp=employee_data.get('lwp'), internship_end_date=employee_data.get('internship_end_date'),
                probation_end_date=employee_data.get('probation_end_date')
            )
            db.session.add(new_employee)
            
            # Create employee designation
            db.session.add(EmployeeDesignation(employee_id=employee_id, designation_id=employee_data['band']))
            
            # Create employee credentials with hashed password
            password_hash = generate_password_hash(
                password,
                method='pbkdf2:sha256',
                salt_length=16
            )
            new_credentials = EmployeeCredentials(
                employee_id=employee_id,
                password=password,  # Store plain text as per existing schema (backward compatibility)
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
        """Cancels a leave transaction."""
        try:
            leave = LeaveTransaction.query.get(leave_tran_id)
            if not leave: raise LookupError(f"Leave transaction {leave_tran_id} not found")
            leave.leave_status = leave_status
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise e
