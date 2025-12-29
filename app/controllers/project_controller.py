from flask import request, jsonify
from ..services.project_service import ProjectService

class ProjectController:
    @staticmethod
    def get_projects():
        try:
            projects = ProjectService.get_projects()
            return jsonify({"projects": projects}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def add_project():
        try:
            data = request.json
            name = data.get("project_name")
            if not name:
                return jsonify({"error": "Project name is required"}), 400
            ProjectService.add_project(name, data.get("end_date"), data.get("required", 0))
            return jsonify({"message": "Project added successfully"}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def delete_project(project_id):
        try:
            ProjectService.delete_project(project_id)
            return jsonify({"message": "Project deleted successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
