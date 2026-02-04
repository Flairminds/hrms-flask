from flask import Blueprint
from ..controllers.profile_controller import ProfileController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/cancel-leave', methods=['PATCH'])
@roles_required(*ROLE_PERMISSIONS['profile']['cancel_leave'])
def cancel_leave():
    return ProfileController.cancel_leave()

@profile_bp.route('/update-employee-details-by-self/<emp_id>', methods=['PUT'])
@roles_required(*ROLE_PERMISSIONS['profile']['update_profile_self'])
def update_profile_self(emp_id):
    return ProfileController.update_profile_self(emp_id)

@profile_bp.route('/upload-profile-image/<emp_id>', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['profile']['update_profile_self'])
def upload_profile_image(emp_id):
    return ProfileController.upload_profile_image(emp_id)

@profile_bp.route('/profile-completion/<emp_id>', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['profile']['get_profile'])
def get_profile_completion(emp_id):
    return ProfileController.get_profile_completion(emp_id)

@profile_bp.route('/<emp_id>', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['profile']['get_profile'])
def get_profile(emp_id):
    return ProfileController.get_profile(emp_id)

@profile_bp.route('/complete-details/<emp_id>', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['profile']['get_complete_details'])
def get_complete_details(emp_id):
    return ProfileController.get_complete_details(emp_id)

@profile_bp.route('/increment-address-counter/<emp_id>', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['profile']['increment_address_counter'])
def increment_address_counter(emp_id):
    return ProfileController.increment_address_counter(emp_id)

@profile_bp.route('/get-address-counter/<emp_id>', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['profile']['get_address_counter'])
def get_address_counter(emp_id):
    return ProfileController.get_address_counter(emp_id)

