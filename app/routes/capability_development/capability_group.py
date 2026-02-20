from flask import Blueprint
from ...controllers.capability_development.capability_group_controller import CapabilityGroupController

capability_group_bp = Blueprint('capability_group', __name__)

# Master groups
@capability_group_bp.route('/', methods=['GET'])
def get_groups():
    return CapabilityGroupController.get_groups()

@capability_group_bp.route('/', methods=['POST'])
def create_group():
    return CapabilityGroupController.create_group()

@capability_group_bp.route('/<int:group_id>', methods=['PUT'])
def update_group(group_id):
    return CapabilityGroupController.update_group(group_id)

@capability_group_bp.route('/<int:group_id>', methods=['DELETE'])
def delete_group(group_id):
    return CapabilityGroupController.delete_group(group_id)

# Assignments
@capability_group_bp.route('/assignments', methods=['GET'])
def get_assignments():
    return CapabilityGroupController.get_assignments()

@capability_group_bp.route('/assignments', methods=['POST'])
def assign_group():
    return CapabilityGroupController.assign_group()

@capability_group_bp.route('/assignments/<string:employee_id>', methods=['DELETE'])
def remove_assignment(employee_id):
    return CapabilityGroupController.remove_assignment(employee_id)

# My group (employee self-view)
@capability_group_bp.route('/my-group', methods=['GET'])
def get_my_group():
    return CapabilityGroupController.get_my_group()

# History
@capability_group_bp.route('/history', methods=['GET'])
def get_history():
    return CapabilityGroupController.get_history()
