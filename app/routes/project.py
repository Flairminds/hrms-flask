from flask import Blueprint
from ..controllers.project_controller import ProjectController
# from ..middlewares.auth_middleware import roles_required # Assuming middleware exists, but project uses global or decorator based.
# Checking existing patterns, auth seems handled via configuration in `auth_config.py` coupled with a middleware that reads it.

project_bp = Blueprint('project', __name__)

@project_bp.route('/projects', methods=['GET'])
def get_projects():
    return ProjectController.get_projects()

@project_bp.route('/projects/stats', methods=['GET'])
def get_stats():
    return ProjectController.get_stats()

@project_bp.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    return ProjectController.get_project(project_id)

@project_bp.route('/projects', methods=['POST'])
def add_project():
    return ProjectController.add_project()

@project_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    return ProjectController.update_project(project_id)

@project_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    return ProjectController.delete_project(project_id)

@project_bp.route('/projects/<int:project_id>/allocations', methods=['GET'])
def get_allocations(project_id):
    return ProjectController.get_allocations(project_id)

@project_bp.route('/projects/allocations', methods=['POST'])
def manage_allocation():
    return ProjectController.manage_allocation()

@project_bp.route('/projects/<int:project_id>/allocations/<string:employee_id>', methods=['DELETE'])
def delete_allocation(project_id, employee_id):
    return ProjectController.delete_allocation(project_id, employee_id)

@project_bp.route('/employee-allocations', methods=['GET'])
def get_employee_allocations():
    return ProjectController.get_employee_allocations()
