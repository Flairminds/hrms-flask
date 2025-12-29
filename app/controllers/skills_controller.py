from flask import jsonify, request

from ..services.skills_service import SkillsService


class SkillsController:
    """Controller for employee skills endpoints (migrated from Phase 2 app.py)."""

    @staticmethod
    def get_employee_skills_overview():
        try:
            employees = SkillsService.get_employee_skills_overview()
            return jsonify(employees), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def add_or_update_skills():
        try:
            data = request.get_json()
            SkillsService.add_or_update_skills(data)
            return jsonify({"message": "Skills added/updated successfully"}), 201
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_employee_skills(employee_id: str):
        try:
            payload = SkillsService.get_employee_skills_for_employee(employee_id)
            return jsonify(payload), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @staticmethod
    def get_employees_with_skills():
        try:
            employees = SkillsService.get_employees_with_skills()
            return jsonify(employees), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
