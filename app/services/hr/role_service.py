from typing import List, Dict, Any, Optional
from sqlalchemy import text, func
from sqlalchemy.exc import SQLAlchemyError

from ... import db
from ...models.hr import (Employee, MasterSkill, EmployeeSkill, Designation, 
                          MasterSubRole, EmployeeRole, MasterRole, Lob)
from ...utils.logger import Logger

class RoleService:
    @staticmethod
    def get_all_skills() -> List[Dict[str, Any]]:
        """Retrieves all available skills."""
        try:
            skills = MasterSkill.query.with_entities(MasterSkill.skill_id, MasterSkill.skill_name).all()
            return [{'skill_id': s.skill_id, 'skill_name': s.skill_name} for s in skills]
        except Exception as e:
            Logger.error("Error fetching all skills", error=str(e))
            raise e

    @staticmethod
    def get_employee_sub_roles() -> List[Dict[str, Any]]:
        """Retrieves all employee sub-roles."""
        try:
            sub_roles = MasterSubRole.query.with_entities(
                MasterSubRole.sub_role_id, MasterSubRole.sub_role_name).all()
            return [{'sub_role_id': sr.sub_role_id, 'sub_role_name': sr.sub_role_name} for sr in sub_roles]
        except Exception as e:
            Logger.error("Error fetching sub-roles", error=str(e))
            raise e

    @staticmethod
    def get_designations() -> List[Dict[str, Any]]:
        """Retrieves all available designations."""
        try:
            designations = Designation.query.with_entities(
                Designation.designation_id, Designation.designation_name).all()
            return [{'designation_id': d.designation_id, 'designation_name': d.designation_name} for d in designations]
        except Exception as e:
            Logger.error("Error fetching designations", error=str(e))
            raise e

    @staticmethod
    def get_bands() -> List[Dict[str, Any]]:
        """Retrieves all designations/bands (alias for get_designations)."""
        return RoleService.get_designations()

    @staticmethod
    def insert_designation(designation_name: str) -> bool:
        """Inserts a new designation."""
        try:
            designation = Designation(designation_name=designation_name)
            db.session.add(designation)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting designation", error=str(e))
            return False

    @staticmethod
    def get_sub_roles() -> List[Dict[str, Any]]:
        """Retrieves all sub-roles."""
        return RoleService.get_employee_sub_roles()

    @staticmethod
    def insert_sub_role(sub_role_name: str) -> bool:
        """Inserts a new sub-role."""
        try:
            sub_role = MasterSubRole(sub_role_name=sub_role_name)
            db.session.add(sub_role)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting sub-role", error=str(e))
            return False

    @staticmethod
    def update_team_lead(employee_id: str, team_lead_id: str) -> bool:
        """Updates the team lead for an employee."""
        try:
            employee = Employee.query.get(employee_id)
            if employee:
                employee.team_lead_id = team_lead_id
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating team lead", error=str(e))
            return False

    @staticmethod
    def get_employees_with_team_lead(team_lead_id: str) -> List[Dict[str, Any]]:
        """Retrieves employees under a specific team lead."""
        try:
            employees = Employee.query.filter_by(team_lead_id=team_lead_id, employment_status='Active').all()
            return [{'EmployeeId': e.employee_id, 'EmployeeName': f"{e.first_name} {e.last_name}"} for e in employees]
        except Exception as e:
            Logger.error("Error fetching employees for lead", error=str(e))
            return []

    @staticmethod
    def get_team_leads() -> List[Dict[str, Any]]:
        """Retrieves all team leads."""
        try:
            leads = Employee.query.filter_by(is_lead=True, employment_status='Active').all()
            return [{'TeamLeadId': e.employee_id, 'TeamLeadName': f"{e.first_name} {e.last_name}", 'Email': e.email} for e in leads]
        except Exception as e:
            Logger.error("Error fetching team leads", error=str(e))
            return []

    @staticmethod
    def insert_team_lead(employee_id: str) -> bool:
        """Marks an employee as a team lead."""
        try:
            employee = Employee.query.get(employee_id)
            if employee:
                employee.is_lead = True
                db.session.commit()
                return True
            return False
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting team lead", error=str(e))
            return False

    @staticmethod
    def get_lob_leads() -> List[Dict[str, Any]]:
        """Retrieves all LOB leads."""
        try:
            results = db.session.query(
                Lob.id.label('LobId'),
                Lob.lob.label('LobName'),
                (Employee.first_name + ' ' + Employee.last_name).label('LeadName')
            ).join(Employee, Lob.lob_lead == Employee.employee_id).all()
            return [dict(r._mapping) for r in results]
        except Exception as e:
            Logger.error("Error fetching LOB leads", error=str(e))
            return []

    @staticmethod
    def insert_lob_lead(lob_lead: str, lob_name: str) -> bool:
        """Inserts a new LOB lead."""
        try:
            record = Lob(lob_lead=lob_lead, lob=lob_name)
            db.session.add(record)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting LOB lead", error=str(e))
            return False
