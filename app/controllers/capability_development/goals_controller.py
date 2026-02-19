"""
Capability Development - Goals Controller

HTTP layer for My Goals endpoints.
All methods use JWT identity exclusively (no g.employee_id).
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ...services.goals_service_enhanced import EnhancedGoalsService
from ...utils.logger import Logger


class GoalsController:
    """Controller for Capability Development / My Goals."""

    # ──────────────────────────────────────────
    # Retrieval
    # ──────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def get_my_goals():
        """GET /api/capability-dev/goals/my-goals"""
        try:
            employee_id = get_jwt_identity()
            result = EnhancedGoalsService.get_my_goals(employee_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_my_goals", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_goals_created_by_me():
        """GET /api/capability-dev/goals/created-by-me"""
        try:
            employee_id = get_jwt_identity()
            result = EnhancedGoalsService.get_goals_created_by_me(employee_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_goals_created_by_me", error=str(e))
            return jsonify({"error": str(e)}), 500

    # ──────────────────────────────────────────
    # Create
    # ──────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def create_my_goal():
        """POST /api/capability-dev/goals/my-goals"""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json() or {}
            result = EnhancedGoalsService.create_my_goal(payload, employee_id)
            return jsonify(result), result.get("statusCode", 201)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in create_my_goal", error=str(e))
            return jsonify({"error": str(e)}), 500

    # ──────────────────────────────────────────
    # Update
    # ──────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def update_goal(goal_id: int):
        """PUT /api/capability-dev/goals/<goal_id>"""
        try:
            payload = request.get_json() or {}
            EnhancedGoalsService.update_goal(goal_id, payload)
            return jsonify({"message": "Goal updated successfully"}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in update_goal", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_goal_progress(goal_id: int):
        """PUT /api/capability-dev/goals/<goal_id>/progress"""
        try:
            payload = request.get_json() or {}
            progress = payload.get("progress")
            notes = payload.get("notes")
            result = EnhancedGoalsService.update_goal_progress(goal_id, progress, notes)
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in update_goal_progress", error=str(e))
            return jsonify({"error": str(e)}), 500

    # ──────────────────────────────────────────
    # Delete
    # ──────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def delete_goal(goal_id: int):
        """DELETE /api/capability-dev/goals/<goal_id>"""
        try:
            EnhancedGoalsService.delete_goal(goal_id)
            return jsonify({"message": "Goal deleted successfully"}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 404
        except Exception as e:
            Logger.error("Error in delete_goal", error=str(e))
            return jsonify({"error": str(e)}), 500

    # ──────────────────────────────────────────
    # Comments
    # ──────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def get_goal_comments(goal_id: int):
        """GET /api/capability-dev/goals/<goal_id>/comments"""
        try:
            result = EnhancedGoalsService.get_goal_comments(goal_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_goal_comments", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def add_goal_comment(goal_id: int):
        """POST /api/capability-dev/goals/<goal_id>/comments"""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json() or {}
            comment_text = payload.get("commentText")
            if not comment_text:
                return jsonify({"error": "commentText is required"}), 400
            result = EnhancedGoalsService.add_goal_comment(goal_id, comment_text, employee_id)
            return jsonify(result), 201
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in add_goal_comment", error=str(e))
            return jsonify({"error": str(e)}), 500

    # ──────────────────────────────────────────
    # Reviews
    # ──────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def get_goal_reviews(goal_id: int):
        """GET /api/capability-dev/goals/<goal_id>/reviews"""
        try:
            result = EnhancedGoalsService.get_goal_reviews(goal_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_goal_reviews", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def add_goal_review(goal_id: int):
        """POST /api/capability-dev/goals/<goal_id>/reviews"""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json() or {}
            rating = payload.get("rating")
            review_text = payload.get("reviewText", "")
            if not rating:
                return jsonify({"error": "rating is required"}), 400
            result = EnhancedGoalsService.add_goal_review(goal_id, rating, review_text, employee_id)
            return jsonify(result), 201
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in add_goal_review", error=str(e))
            return jsonify({"error": str(e)}), 500
