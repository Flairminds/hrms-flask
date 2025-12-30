from typing import List, Dict, Any
from .hr.employee_service import EmployeeService
from .hr.role_service import RoleService
from .hr.access_service import AccessService
from .hr.report_service import ReportService

class HRService:
    """
    Facade for HR related services.
    Delegates calls to specialized sub-modules in the 'hr' package.
    """

    # Employee related
    @staticmethod
    def get_all_employees():
        return EmployeeService.get_all_employees()

    @staticmethod
    def upsert_employee(data):
        return EmployeeService.upsert_employee(data)

    @staticmethod
    def get_employee_details_for_relieving_letter():
        return EmployeeService.get_employee_details_for_relieving_letter()

    @staticmethod
    def get_employee_lateral_hires():
        return EmployeeService.get_employee_lateral_hires()

    @staticmethod
    def update_lateral_hire(employee_id, lateral_hire):
        return EmployeeService.update_lateral_hire(employee_id, lateral_hire)

    @staticmethod
    def get_employee_exempt_data():
        return EmployeeService.get_employee_exempt_data()

    @staticmethod
    def insert_lateral_exempt_data(employee_id, from_date, to_date, shift_start_from_time):
        return EmployeeService.insert_lateral_exempt_data(employee_id, from_date, to_date, shift_start_from_time)

    @staticmethod
    def update_employee_details(employee_data):
        return EmployeeService.update_employee_details(employee_data)

    @staticmethod
    def update_employee_by_self(employee_id, update_data):
        return EmployeeService.update_employee_by_self(employee_id, update_data)

    @staticmethod
    def get_all_employees_details():
        return EmployeeService.get_all_employees_details()

    @staticmethod
    def get_employee_with_address_and_skills(emp_id):
        return EmployeeService.get_employee_with_address_and_skills(emp_id)

    @staticmethod
    def insert_employee(employee_data):
        return EmployeeService.insert_employee(employee_data)

    @staticmethod
    def cancel_leave(leave_tran_id, leave_status='Cancel'):
        return EmployeeService.cancel_leave(leave_tran_id, leave_status)

    # Role / Org related
    @staticmethod
    def get_all_skills():
        return RoleService.get_all_skills()

    @staticmethod
    def get_employee_sub_roles():
        return RoleService.get_employee_sub_roles()

    @staticmethod
    def get_designations():
        return RoleService.get_designations()

    @staticmethod
    def get_bands():
        return RoleService.get_bands()

    @staticmethod
    def insert_designation(designation_name):
        return RoleService.insert_designation(designation_name)

    @staticmethod
    def get_sub_roles():
        return RoleService.get_sub_roles()

    @staticmethod
    def insert_sub_role(sub_role_name):
        return RoleService.insert_sub_role(sub_role_name)

    @staticmethod
    def update_team_lead(employee_id, team_lead_id):
        return RoleService.update_team_lead(employee_id, team_lead_id)

    @staticmethod
    def get_employees_with_team_lead(team_lead_id):
        return RoleService.get_employees_with_team_lead(team_lead_id)

    @staticmethod
    def get_team_leads():
        return RoleService.get_team_leads()

    @staticmethod
    def insert_team_lead(employee_id):
        return RoleService.insert_team_lead(employee_id)

    @staticmethod
    def get_lob_leads():
        return RoleService.get_lob_leads()

    @staticmethod
    def insert_lob_lead(lob_lead, lob):
        return RoleService.insert_lob_lead(lob_lead, lob)

    # Access / Credentials related
    @staticmethod
    def upsert_employee_credentials(employee_id, password, role_id, email):
        return AccessService.upsert_employee_credentials(employee_id, password, role_id, email)

    @staticmethod
    def get_employee_accessibility_details():
        return AccessService.get_employee_accessibility_details()

    # Report related
    @staticmethod
    def get_monthly_report(month, year):
        return ReportService.get_monthly_report(month, year)
