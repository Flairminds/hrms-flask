"""
Feedback Controller for Capability Development
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..services.feedback_service_enhanced import FeedbackService
from ..utils.logger import Logger


class FeedbackControllerEnhanced:
    """Controller for enhanced feedback endpoints."""

    @staticmethod
    @jwt_required()
    def submit_feedback():
        """Submit feedback for another employee."""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json()
            result = FeedbackService.submit_feedback(payload, employee_id)
            return jsonify(result), result.get("statusCode", 201)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in submit_feedback", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_received_feedback():
        """Get feedback received by current user."""
        try:
            employee_id = get_jwt_identity()
            
            # Get filters from query params
            filters = {}
            if request.args.get("category"):
                filters["category"] = request.args.get("category")
            if request.args.get("minRating"):
                filters["minRating"] = float(request.args.get("minRating"))
            if request.args.get("dateFrom"):
                filters["dateFrom"] = request.args.get("dateFrom")
            if request.args.get("dateTo"):
                filters["dateTo"] = request.args.get("dateTo")
            
            result = FeedbackService.get_received_feedback(employee_id, filters if filters else None)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_received_feedback", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_given_feedback():
        """Get feedback given by current user."""
        try:
            employee_id = get_jwt_identity()
            
            # Get filters from query params
            filters = {}
            if request.args.get("category"):
                filters["category"] = request.args.get("category")
            if request.args.get("minRating"):
                filters["minRating"] = float(request.args.get("minRating"))
            if request.args.get("dateFrom"):
                filters["dateFrom"] = request.args.get("dateFrom")
            if request.args.get("dateTo"):
                filters["dateTo"] = request.args.get("dateTo")
            
            result = FeedbackService.get_given_feedback(employee_id, filters if filters else None)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_given_feedback", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_employee_feedback(employee_id):
        """Get all feedback for specific employee (admin/manager)."""
        try:
            requesting_user_id = get_jwt_identity()
            result = FeedbackService.get_employee_feedback(employee_id, requesting_user_id)
            return jsonify(result), 200
        except Exception as e:
            Logger.error("Error in get_employee_feedback", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_feedback(feedback_id):
        """Update feedback (only by creator)."""
        try:
            employee_id = get_jwt_identity()
            payload = request.get_json()
            FeedbackService.update_feedback(feedback_id, payload, employee_id)
            return jsonify({"message": "Feedback updated successfully"}), 200
        except PermissionError as e:
            return jsonify({"error": str(e)}), 403
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in update_feedback", error=str(e))
            return jsonify({"error": str(e)}), 500

    @staticmethod
    @jwt_required()
    def delete_feedback(feedback_id):
        """Delete feedback."""
        try:
            employee_id = get_jwt_identity()
            # TODO: Check if user is admin
            is_admin = False  # Placeholder
            FeedbackService.delete_feedback(feedback_id, employee_id, is_admin)
            return jsonify({"message": "Feedback deleted successfully"}), 200
        except PermissionError as e:
            return jsonify({"error": str(e)}), 403
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            Logger.error("Error in delete_feedback", error=str(e))
            return jsonify({"error": str(e)}), 500
