from flask import jsonify, request

from ..services.goals_service import GoalsService


class GoalsController:
    """Controller for employee goals APIs."""

    @staticmethod
    def create_goal():
        try:
            payload = request.get_json() or {}
            result = GoalsService.create_goal(payload)
            status_code = result.pop("status_code", 201)
            message = result.pop("message", "Goal created successfully")
            return jsonify({"status": "success", "data": result, "message": message}), status_code
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def get_goals_for_employee(employee_id: str):
        try:
            goals = GoalsService.get_goals_for_employee(employee_id)
            return jsonify({"status": "success", "data": goals}), 200
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 404
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def update_goal(goal_id: int):
        try:
            payload = request.get_json() or {}
            GoalsService.update_goal(goal_id, payload)
            return (
                jsonify({"status": "success", "data": {"goalId": goal_id}, "message": "Goal updated successfully"}),
                200,
            )
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 400
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    @staticmethod
    def delete_goal(goal_id: int):
        try:
            GoalsService.delete_goal(goal_id)
            return jsonify({"status": "success", "data": {}, "message": "Goal deleted successfully"}), 200
        except ValueError as ve:
            return jsonify({"status": "error", "message": str(ve)}), 404
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
