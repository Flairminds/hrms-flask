from flask import Blueprint
from ..controllers.account_controller import AccountController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

account_bp = Blueprint('account', __name__)

@account_bp.route('/login', methods=['POST'])
def login():
    return AccountController.login()

@account_bp.route('/send-otp', methods=['POST'])
def send_otp():
    return AccountController.send_otp()

@account_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    return AccountController.verify_otp()

@account_bp.route('/reset-password', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['account']['reset_password'])
def reset_password():
    return AccountController.reset_password()

@account_bp.route('/me', methods=['GET'])
def get_current_user():
    return AccountController.get_current_user()

@account_bp.route('/change-password', methods=['POST'])
def change_password():
    return AccountController.change_password()
