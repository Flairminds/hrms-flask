from flask import request, jsonify, g
from ..services.project_service import ProjectService
from ..utils.logger import Logger

class ProjectController:
    @staticmethod
    def get_projects():
        """Get all projects with detailed information."""
        try:
            projects = ProjectService.get_all_projects()
            return jsonify(projects), 200
        except Exception as e:
            Logger.error("Error in get_projects", error=str(e))
            return jsonify({"error": "Failed to fetch projects"}), 500

    @staticmethod
    def get_stats():
        """Get project dashboard statistics."""
        try:
            stats = ProjectService.get_dashboard_stats()
            return jsonify(stats), 200
        except Exception as e:
            Logger.error("Error in get_stats", error=str(e))
            return jsonify({"error": "Failed to fetch stats"}), 500

    @staticmethod
    def get_project(project_id):
        """Get a single project."""
        try:
            project = ProjectService.get_project_by_id(project_id)
            if not project:
                return jsonify({"error": "Project not found"}), 404
            
            return jsonify({
                "project_id": project.project_id,
                "project_name": project.project_name,
                "description": project.description,
                "client": project.client,
                "lead_by": project.lead_by,
                "start_date": project.start_date.strftime('%Y-%m-%d') if project.start_date else None,
                "end_date": project.end_date.strftime('%Y-%m-%d') if project.end_date else None
            }), 200
        except Exception as e:
            Logger.error("Error in get_project", error=str(e))
            return jsonify({"error": "Failed to fetch project"}), 500

    @staticmethod
    def add_project():
        """Create a new project."""
        try:
            data = request.json
            if not data.get("project_name"):
                return jsonify({"error": "Project name is required"}), 400
            
            project_id = ProjectService.create_project(data)
            return jsonify({"message": "Project created successfully", "project_id": project_id}), 201
        except Exception as e:
            Logger.error("Error in add_project", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def update_project(project_id):
        """Update an existing project."""
        try:
            data = request.json
            success = ProjectService.update_project(project_id, data)
            if not success:
                return jsonify({"error": "Project not found or update failed"}), 404
            
            return jsonify({"message": "Project updated successfully"}), 200
        except Exception as e:
            Logger.error("Error in update_project", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def delete_project(project_id):
        """Delete a project (currently uses legacy service method, might need update)."""
        try:
            # Note: ProjectService.delete_project targets ProjectList. 
            # We might want to update this to delete from 'Project' table too if needed.
            # For now, keeping as is or we can implement real delete in Service.
            # Assuming 'Project' table deletion is handled manually or strict.
            # Implementing basic check if needed.
            return jsonify({"message": "Delete functionality pending verification"}), 501
            # ProjectService.delete_project(project_id)
            # return jsonify({"message": "Project deleted successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    @staticmethod
    def get_allocations(project_id):
        """Get allocations for a project."""
        try:
            allocations = ProjectService.get_allocations(project_id)
            return jsonify(allocations), 200
        except Exception as e:
             Logger.error("Error in get_allocations", error=str(e))
             return jsonify({"error": str(e)}), 500

    @staticmethod
    def manage_allocation():
        """Add or Update an allocation."""
        try:
            data = request.json
            if not data.get('project_id') or not data.get('employee_id'):
                 return jsonify({"error": "Project ID and Employee ID are required"}), 400

            ProjectService.manage_allocation(data)
            return jsonify({"message": "Allocation saved successfully"}), 200
        except Exception as e:
            Logger.error("Error in manage_allocation", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def delete_allocation(project_id, employee_id):
        """Delete an allocation."""
        try:
            success = ProjectService.delete_allocation(project_id, employee_id)
            if success:
                 return jsonify({"message": "Allocation removed successfully"}), 200
            return jsonify({"error": "Allocation not found"}), 404
        except Exception as e:
             Logger.error("Error in delete_allocation", error=str(e))
             return jsonify({"error": str(e)}), 500
