from flask import Blueprint
from ..controllers.leave_controller import LeaveController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

leave_bp = Blueprint('leave', __name__)

@leave_bp.route('/leave-types-and-approver', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['leave']['types_and_approver'])
def get_types_and_approver():
    return LeaveController.get_types_and_approver()

@leave_bp.route('/get-leave-details/<emp_id>', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['leave']['get_leave_details'])
def get_leave_details(emp_id):
    return LeaveController.get_leave_details(emp_id)

@leave_bp.route('/insert-leave-transaction', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['leave']['insert_leave'])
def insert_leave():
    return LeaveController.insert_leave()

@leave_bp.route('/update-leave-status', methods=['PUT'])
@roles_required(*ROLE_PERMISSIONS['leave']['update_leave_status'])
def update_status():
    return LeaveController.update_leave_status()

@leave_bp.route('/get-holidays', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['leave']['get_holidays'])
def get_holidays():
    return LeaveController.get_holidays()

@leave_bp.route('/leave-records-mail', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['leave']['leave_records_mail'])
def send_leave_email_report():
    return LeaveController.send_leave_email_report()

@leave_bp.route('/get-leave-cards', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['leave']['get_leave_cards'])
def get_leave_cards():
    return LeaveController.get_leave_cards()

@leave_bp.route('/get-leave-transactions-by-approver', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['leave']['get_leave_transactions_by_approver'])
def get_leave_transactions_by_approver():
    return LeaveController.get_leave_transactions_by_approver()

@leave_bp.route('/people-on-leave', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['leave']['people_on_leave'])
def get_people_on_leave():
    return LeaveController.get_people_on_leave()

