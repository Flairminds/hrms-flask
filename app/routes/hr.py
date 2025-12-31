from flask import Blueprint
from ..controllers.hr_controller import HRController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

hr_bp = Blueprint('hr', __name__)

@hr_bp.route('/get-all-employees', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr'])
def get_all_employees():
    return HRController.get_all_employees()

@hr_bp.route('/upsert-employee', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['hr'])
def upsert_employee():
    return HRController.upsert_employee()

@hr_bp.route('/insert-employee', methods=['POST'])
# @roles_required(*ROLE_PERMISSIONS['hr'])
def insert_employee():
    return HRController.insert_employee()

@hr_bp.route('/monthly-report', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr'])
def get_monthly_report():
    return HRController.get_monthly_report()

@hr_bp.route('/add-project', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['hr'])
def add_project():
    return HRController.add_project()

@hr_bp.route('/employeeDetailsForRelievingLetter', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['hr'])
def get_employee_details_for_relieving_letter():
    return HRController.get_employee_details_for_relieving_letter()

