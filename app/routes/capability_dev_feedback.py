"""
Capability Development Routes - Feedback
"""

from flask import Blueprint
from ..controllers.feedback_controller_enhanced import FeedbackControllerEnhanced

# Create blueprint
capability_dev_feedback_bp = Blueprint('capability_dev_feedback', __name__)

# Submit and manage feedback
@capability_dev_feedback_bp.route("/feedback", methods=["POST"])
def submit_feedback():
    """Submit feedback for another employee"""
    return FeedbackControllerEnhanced.submit_feedback()

@capability_dev_feedback_bp.route("/feedback/received", methods=["GET"])
def get_received_feedback():
    """Get feedback received by me"""
    return FeedbackControllerEnhanced.get_received_feedback()

@capability_dev_feedback_bp.route("/feedback/given", methods=["GET"])
def get_given_feedback():
    """Get feedback I gave to others"""
    return FeedbackControllerEnhanced.get_given_feedback()

@capability_dev_feedback_bp.route("/feedback/employee/<employee_id>", methods=["GET"])
def get_employee_feedback(employee_id):
    """Get all feedback for specific employee (admin/manager)"""
    return FeedbackControllerEnhanced.get_employee_feedback(employee_id)

@capability_dev_feedback_bp.route("/feedback/<int:feedback_id>", methods=["PUT"])
def update_feedback(feedback_id):
    """Update feedback"""
    return FeedbackControllerEnhanced.update_feedback(feedback_id)

@capability_dev_feedback_bp.route("/feedback/<int:feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):
    """Delete feedback"""
    return FeedbackControllerEnhanced.delete_feedback(feedback_id)
