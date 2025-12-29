from flask import Blueprint
from ..controllers.project_controller import ProjectController

project_bp = Blueprint('project', __name__)

@project_bp.route('/projects', methods=['GET'])
def get_projects():
    return ProjectController.get_projects()

@project_bp.route('/add-project', methods=['POST'])
def add_project():
    return ProjectController.add_project()

@project_bp.route('/delete-project/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    return ProjectController.delete_project(project_id)
