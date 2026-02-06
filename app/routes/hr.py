from flask import Blueprint
from ..controllers.hr_controller import HRController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

hr_bp = Blueprint('hr', __name__)

@hr_bp.route('/get-all-employees', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['get_all_employees'])
def get_all_employees():
    return HRController.get_all_employees()

@hr_bp.route('/get-potential-approvers', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['get_all_employees'])
def get_potential_approvers():
    return HRController.get_potential_approvers()

@hr_bp.route('/get-employee-stats', methods=['GET'])
# @roles_required(*ROLE_PERMISSIONS['hr']['get_all_employees'])
def get_employee_stats():
    return HRController.get_employee_stats()

@hr_bp.route('/upsert-employee', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['hr']['upsert_employee'])
def upsert_employee():
    return HRController.upsert_employee()

@hr_bp.route('/insert-employee', methods=['POST'])
# @roles_required(*ROLE_PERMISSIONS['hr'])
def insert_employee():
    return HRController.insert_employee()

@hr_bp.route('/monthly-report', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['monthly_report'])
def get_monthly_report():
    return HRController.get_monthly_report()

@hr_bp.route('/add-project', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['hr']['add_project'])
def add_project():
    return HRController.add_project()

@hr_bp.route('/employeeDetailsForRelievingLetter', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['employee_details_for_relieving_letter'])
def get_employee_details_for_relieving_letter():
    return HRController.get_employee_details_for_relieving_letter()

@hr_bp.route('/employee-details/<employee_id>', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['employee_details'])
def get_employee_with_address_and_skills(employee_id):
    return HRController.get_employee_with_address_and_skills(employee_id)

@hr_bp.route('/employee-details/<employee_id>', methods=['PUT'])
@roles_required(*ROLE_PERMISSIONS['hr']['upsert_employee'])
def update_employee_details_by_hr(employee_id):
    return HRController.update_employee_details_by_hr(employee_id)

@hr_bp.route('/get-new-joinees', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['get_new_joinees'])
def get_new_joinees():
    return HRController.get_new_joinees()

@hr_bp.route('/upcoming-birthdays', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['get_upcoming_birthdays'])
def get_upcoming_birthdays():
    return HRController.get_upcoming_birthdays()

@hr_bp.route('/get-designations', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['get_all_employees'])
def get_designations():
    return HRController.get_designations()

@hr_bp.route('/get-sub-roles', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['get_all_employees'])
def get_sub_roles():
    return HRController.get_sub_roles()

@hr_bp.route('/get-roles', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['get_all_employees'])
def get_roles():
    return HRController.get_roles()

@hr_bp.route('/get-all-skills', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr']['get_all_skills'])
def get_all_skills():
    return HRController.get_all_skills()
