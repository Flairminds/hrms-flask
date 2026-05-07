from flask import Blueprint
from ...controllers.capability_development.capability_group_controller import CapabilityGroupController
from ...utils.auth import roles_required
from ...auth_config import ROLE_PERMISSIONS

capability_group_bp = Blueprint('capability_group', __name__)

# Master groups
@capability_group_bp.route('/', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS["capability"]["get_groups"])
def get_groups():
    return CapabilityGroupController.get_groups()

@capability_group_bp.route('/', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS["capability"]["create_group"])
def create_group():
    return CapabilityGroupController.create_group()

@capability_group_bp.route('/<int:group_id>', methods=['PUT'])
@roles_required(*ROLE_PERMISSIONS["capability"]["update_group"])
def update_group(group_id):
    return CapabilityGroupController.update_group(group_id)

@capability_group_bp.route('/<int:group_id>', methods=['DELETE'])
@roles_required(*ROLE_PERMISSIONS["capability"]["delete_group"])
def delete_group(group_id):
    return CapabilityGroupController.delete_group(group_id)

# Assignments
@capability_group_bp.route('/assignments', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS["capability"]["get_assignments"])
def get_assignments():
    return CapabilityGroupController.get_assignments()

@capability_group_bp.route('/assignments', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS["capability"]["assign_group"])
def assign_group():
    return CapabilityGroupController.assign_group()

@capability_group_bp.route('/assignments/<string:employee_id>', methods=['DELETE'])
@roles_required(*ROLE_PERMISSIONS["capability"]["remove_assignment"])
def remove_assignment(employee_id):
    return CapabilityGroupController.remove_assignment(employee_id)

# My group (employee self-view)
@capability_group_bp.route('/my-group', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS["capability"]["get_my_group"])
def get_my_group():
    return CapabilityGroupController.get_my_group()

# History
@capability_group_bp.route('/history', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS["capability"]["get_history"])
def get_history():
    return CapabilityGroupController.get_history()
