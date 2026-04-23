"""
Capability Development - Skills Controller

Handles HTTP layer for My Skills endpoints.
Uses JWT identity exclusively (no g.employee_id).
"""

from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ...services.capability_development.skills_service import SkillsService
from ...utils.logger import Logger


class SkillsController:
    """Controller for Capability Development / My Skills."""

    @staticmethod
    @jwt_required()
    def get_my_skills():
        """GET /api/capability-dev/skills/my-skills"""
        try:
            employee_id = get_jwt_identity()
            result = SkillsService.get_my_skills(employee_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_my_skills", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_my_skills():
        """POST /api/capability-dev/skills/my-skills"""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json() or {}
            skills = payload.get("skills", [])
            SkillsService.add_or_update_my_skills(employee_id, skills)
            return jsonify({"message": "Skills updated successfully"}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in update_my_skills", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_master_skills():
        """GET /api/capability-dev/skills/master-skills"""
        try:
            result = SkillsService.get_master_skills()
            return jsonify({"data": result}), 200
        except Exception as e:
            Logger.error("Error in get_master_skills", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def add_master_skill():
        """POST /api/capability-dev/skills/master-skills"""
        try:
            payload = request.get_json() or {}
            result = SkillsService.add_master_skill(payload)
            return jsonify({"message": "Skill added successfully", "data": result}), 201
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in add_master_skill", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_team_skills():
        """GET /api/capability-dev/skills/team-skills"""
        try:
            result = SkillsService.get_team_skills()
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_team_skills", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def add_or_update_team_skill_review():
        """POST /api/capability-dev/skills/team-skills/review"""
        try:
            evaluator_id = get_jwt_identity()
            payload = request.get_json() or {}
            
            employee_id = payload.get('employeeId')
            skill_id = payload.get('skillId')
            evaluator_score = payload.get('evaluatorScore')
            comments = payload.get('comments', '')

            if not all([employee_id, skill_id, evaluator_score]):
                return jsonify({"error": "Missing required fields: employeeId, skillId, evaluatorScore"}), 400

            result = SkillsService.add_or_update_team_skill_review(
                employee_id=employee_id,
                skill_id=skill_id,
                evaluator_id=evaluator_id,
                evaluator_score=evaluator_score,
                comments=comments
            )
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in add_or_update_team_skill_review", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def delete_team_skill_review(employee_id, skill_id):
        """DELETE /api/capability-dev/skills/team-skills/review/<employee_id>/<skill_id>"""
        try:
            evaluator_id = get_jwt_identity()
            SkillsService.delete_team_skill_review(
                employee_id=employee_id,
                skill_id=skill_id,
                evaluator_id=evaluator_id
            )
            return jsonify({"message": "Review deleted successfully"}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in delete_team_skill_review", error=str(e))
            return jsonify({"error": str(e)}), 500

