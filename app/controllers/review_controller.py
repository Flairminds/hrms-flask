from flask import jsonify, request

from ..services.review_service import ReviewService


class ReviewController:
    """Controller for skill review and status APIs."""

    @staticmethod
    def get_assigned_employees_skills():
        try:
            data = ReviewService.get_assigned_employees_skills()
            return jsonify({"status": "success", "data": data}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def get_skill_statuses(employee_id: str):
        try:
            data = ReviewService.get_skill_statuses(employee_id)
            return jsonify({"status": "success", "data": data}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def save_review():
        try:
            payload = request.get_json() or {}
            result = ReviewService.save_review(payload)
            return jsonify({"status": "success", "data": result}), 200
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except PermissionError as pe:
            return jsonify({"status": "error", "message": str(pe)}), 403
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def add_employee_skill():
        try:
            payload = request.get_json() or {}
            result = ReviewService.add_employee_skill(payload)
            return jsonify({"status": "success", "message": "Skill added successfully", "data": result}), 200
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except PermissionError as pe:
            return jsonify({"status": "error", "message": str(pe)}), 403
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def update_skill_score():
        try:
            payload = request.get_json() or {}
            ReviewService.update_skill_score(payload)
            return jsonify({"status": "success", "message": "Skill score updated successfully"}), 200
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except PermissionError as pe:
            return jsonify({"status": "error", "message": str(pe)}), 403
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def get_master_skills():
        try:
            skills = ReviewService.get_master_skills()
            return jsonify({"status": "success", "data": skills}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
