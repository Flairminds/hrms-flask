"""
Hardware management routes for managing hardware assets, assignments, and maintenance.
"""
from flask import Blueprint
from ..controllers.hardware_controller import HardwareController
from ..utils.auth import roles_required

hardware_bp = Blueprint('hardware', __name__)

# Hardware Assets Routes
@hardware_bp.route('/assets', methods=['GET'])
@roles_required('HR', 'Admin')
def get_all_hardware():
    return HardwareController.get_all_hardware()

@hardware_bp.route('/assets', methods=['POST'])
@roles_required('HR', 'Admin')
def create_hardware():
    return HardwareController.create_hardware()

@hardware_bp.route('/assets/<int:asset_id>', methods=['PUT'])
@roles_required('HR', 'Admin')
def update_hardware(asset_id):
    return HardwareController.update_hardware(asset_id)

@hardware_bp.route('/assets/<int:asset_id>', methods=['DELETE'])
@roles_required('HR', 'Admin')
def delete_hardware(asset_id):
    return HardwareController.delete_hardware(asset_id)

# Hardware Assignments Routes
@hardware_bp.route('/assignments', methods=['GET'])
@roles_required('HR', 'Admin')
def get_all_assignments():
    return HardwareController.get_all_assignments()

@hardware_bp.route('/assignments', methods=['POST'])
@roles_required('HR', 'Admin')
def create_assignment():
    return HardwareController.create_assignment()

@hardware_bp.route('/assignments/<int:assignment_id>', methods=['PUT'])
@roles_required('HR', 'Admin')
def update_assignment(assignment_id):
    return HardwareController.update_assignment(assignment_id)

@hardware_bp.route('/assignments/<int:assignment_id>', methods=['DELETE'])
@roles_required('HR', 'Admin')
def delete_assignment(assignment_id):
    return HardwareController.delete_assignment(assignment_id)

# Hardware Maintenance Routes
@hardware_bp.route('/maintenance', methods=['GET'])
@roles_required('HR', 'Admin')
def get_all_maintenance():
    return HardwareController.get_all_maintenance()

@hardware_bp.route('/maintenance', methods=['POST'])
@roles_required('HR', 'Admin')
def create_maintenance():
    return HardwareController.create_maintenance()

@hardware_bp.route('/maintenance/<int:maintenance_id>', methods=['PUT'])
@roles_required('HR', 'Admin')
def update_maintenance(maintenance_id):
    return HardwareController.update_maintenance(maintenance_id)

@hardware_bp.route('/maintenance/<int:maintenance_id>', methods=['DELETE'])
@roles_required('HR', 'Admin')
def delete_maintenance(maintenance_id):
    return HardwareController.delete_maintenance(maintenance_id)
