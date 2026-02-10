"""
Enhanced Goals Controller for Capability Development
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..services.goals_service_enhanced import EnhancedGoalsService
from ..utils.logger import Logger


class EnhancedGoalsController:
    """Controller for enhanced goal management endpoints."""

    @staticmethod
    @jwt_required()
    def get_my_goals():
        """Get goals assigned to current user."""
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
        """Get goals created by current user for others."""
        try:
            employee_id = get_jwt_identity()
            result = EnhancedGoalsService.get_goals_created_by_me(employee_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_goals_created_by_me", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def create_goal():
        """Create a new goal (for self or others)."""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json()
            result = EnhancedGoalsService.create_goal(payload, employee_id)
            return jsonify(result), result.get("statusCode", 201)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in create_goal", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_goal_progress(goal_id):
        """Update goal progress."""
        try:
            payload = request.get_json()
            progress = payload.get("progress")
            notes = payload.get("notes")
            
            result = EnhancedGoalsService.update_goal_progress(goal_id, progress, notes)
            return jsonify(result), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in update_goal_progress", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_goal(goal_id):
        """Update goal details."""
        try:
            payload = request.get_json()
            EnhancedGoalsService.update_goal(goal_id, payload)
            return jsonify({"message": "Goal updated successfully"}), 200
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in update_goal", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def add_goal_comment(goal_id):
        """Add comment to goal."""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json()
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

    @staticmethod
    @jwt_required()
    def get_goal_comments(goal_id):
        """Get all comments for a goal."""
        try:
            result = EnhancedGoalsService.get_goal_comments(goal_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_goal_comments", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def add_goal_review(goal_id):
        """Add review to goal."""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json()
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

    @staticmethod
    @jwt_required()
    def get_goal_reviews(goal_id):
        """Get all reviews for a goal."""
        try:
            result = EnhancedGoalsService.get_goal_reviews(goal_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_goal_reviews", error=str(e))
            return jsonify({"error": str(e)}), 500
