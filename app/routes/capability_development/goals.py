"""
Capability Development - Goals Routes

All My Goals endpoints for the Capability Development module.
Mounted at: /api/capability-dev/goals
"""

from flask import Blueprint

from ...controllers.capability_development.goals_controller import GoalsController

capability_dev_goals_bp = Blueprint("capability_dev_goals", __name__)


# ──────────────────────────────────────────
# My Goals (self)
# ──────────────────────────────────────────

@capability_dev_goals_bp.route("/my-goals", methods=["GET"])
def get_my_goals():
    """Get all goals for the currently logged-in employee."""
    return GoalsController.get_my_goals()


@capability_dev_goals_bp.route("/my-goals", methods=["POST"])
def create_my_goal():
    """Create a new goal for the currently logged-in employee."""
    return GoalsController.create_my_goal()


@capability_dev_goals_bp.route("/created-by-me", methods=["GET"])
def get_goals_created_by_me():
    """Get all goals that the current user has created for others."""
    return GoalsController.get_goals_created_by_me()


@capability_dev_goals_bp.route("/team-goals", methods=["GET"])
def get_team_goals():
    """Get all goals for all active employees (HR/Manager view)."""
    return GoalsController.get_team_goals()


# ──────────────────────────────────────────
# Goal detail operations
# ──────────────────────────────────────────

@capability_dev_goals_bp.route("/<int:goal_id>", methods=["PUT"])
def update_goal(goal_id):
    """Update goal details."""
    return GoalsController.update_goal(goal_id)


@capability_dev_goals_bp.route("/<int:goal_id>", methods=["DELETE"])
def delete_goal(goal_id):
    """Delete a goal."""
    return GoalsController.delete_goal(goal_id)


@capability_dev_goals_bp.route("/<int:goal_id>/progress", methods=["PUT"])
def update_goal_progress(goal_id):
    """Update the progress percentage for a goal."""
    return GoalsController.update_goal_progress(goal_id)


# ──────────────────────────────────────────
# Comments
# ──────────────────────────────────────────

@capability_dev_goals_bp.route("/<int:goal_id>/comments", methods=["GET"])
def get_goal_comments(goal_id):
    """Get all comments for a goal."""
    return GoalsController.get_goal_comments(goal_id)


@capability_dev_goals_bp.route("/<int:goal_id>/comments", methods=["POST"])
def add_goal_comment(goal_id):
    """Add a comment to a goal."""
    return GoalsController.add_goal_comment(goal_id)


# ──────────────────────────────────────────
# Reviews
# ──────────────────────────────────────────

@capability_dev_goals_bp.route("/<int:goal_id>/reviews", methods=["GET"])
def get_goal_reviews(goal_id):
    """Get all reviews for a goal."""
    return GoalsController.get_goal_reviews(goal_id)


@capability_dev_goals_bp.route("/<int:goal_id>/reviews", methods=["POST"])
def add_goal_review(goal_id):
    """Add a review to a goal."""
    return GoalsController.add_goal_review(goal_id)


# ──────────────────────────────────────────
# Coverage
# ──────────────────────────────────────────

@capability_dev_goals_bp.route("/goals-coverage", methods=["GET"])
def get_goals_coverage():
    """Get goal coverage for all active employees (HR/Manager view)."""
    return GoalsController.get_goals_coverage()
