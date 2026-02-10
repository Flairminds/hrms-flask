"""
Capability Development Routes - Enhanced Goals
"""

from flask import Blueprint
from ..controllers.goals_controller_enhanced import EnhancedGoalsController

# Create blueprint
capability_dev_goals_bp = Blueprint('capability_dev_goals', __name__)

# My Goals endpoints
@capability_dev_goals_bp.route("/my-goals", methods=["GET"])
def get_my_goals():
    """Get goals assigned to me"""
    return EnhancedGoalsController.get_my_goals()

@capability_dev_goals_bp.route("/goals-created-by-me", methods=["GET"])
def get_goals_created_by_me():
    """Get goals I created for others"""
    return EnhancedGoalsController.get_goals_created_by_me()

# Goal CRUD
@capability_dev_goals_bp.route("/goals", methods=["POST"])
def create_goal():
    """Create a new goal"""
    return EnhancedGoalsController.create_goal()

@capability_dev_goals_bp.route("/goals/<int:goal_id>", methods=["PUT"])
def update_goal(goal_id):
    """Update goal details"""
    return EnhancedGoalsController.update_goal(goal_id)

@capability_dev_goals_bp.route("/goals/<int:goal_id>/progress", methods=["PUT"])
def update_goal_progress(goal_id):
    """Update goal progress"""
    return EnhancedGoalsController.update_goal_progress(goal_id)

# Comments
@capability_dev_goals_bp.route("/goals/<int:goal_id>/comments", methods=["GET"])
def get_goal_comments(goal_id):
    """Get all comments for a goal"""
    return EnhancedGoalsController.get_goal_comments(goal_id)

@capability_dev_goals_bp.route("/goals/<int:goal_id>/comments", methods=["POST"])
def add_goal_comment(goal_id):
    """Add comment to goal"""
    return EnhancedGoalsController.add_goal_comment(goal_id)

# Reviews
@capability_dev_goals_bp.route("/goals/<int:goal_id>/reviews", methods=["GET"])
def get_goal_reviews(goal_id):
    """Get all reviews for a goal"""
    return EnhancedGoalsController.get_goal_reviews(goal_id)

@capability_dev_goals_bp.route("/goals/<int:goal_id>/reviews", methods=["POST"])
def add_goal_review(goal_id):
    """Add review to goal"""
    return EnhancedGoalsController.add_goal_review(goal_id)
