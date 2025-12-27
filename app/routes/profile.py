from flask import Blueprint
from ..controllers.profile_controller import ProfileController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/<emp_id>', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['profile'])
def get_profile(emp_id):
    return ProfileController.get_profile(emp_id)

@profile_bp.route('/update-employee-details-by-self/<emp_id>', methods=['PUT'])
@roles_required(*ROLE_PERMISSIONS['profile'])
def update_profile_self(emp_id):
    return ProfileController.update_profile_self(emp_id)

@profile_bp.route('/cancel-leave', methods=['PATCH'])
@roles_required(*ROLE_PERMISSIONS['profile'])
def cancel_leave():
    return ProfileController.cancel_leave()
