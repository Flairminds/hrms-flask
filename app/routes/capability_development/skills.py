"""
Capability Development - Skills Routes

All skill-related endpoints for the Capability Development module.
Mounted at: /api/capability-dev/skills
"""

from flask import Blueprint

from ...controllers.capability_development.skills_controller import SkillsController

capability_dev_skills_bp = Blueprint("capability_dev_skills", __name__)


@capability_dev_skills_bp.route("/my-skills", methods=["GET"])
def get_my_skills():
    """Get all skills for the currently logged-in employee."""
    return SkillsController.get_my_skills()


@capability_dev_skills_bp.route("/my-skills", methods=["POST"])
def update_my_skills():
    """Add or update skills for the currently logged-in employee."""
    return SkillsController.update_my_skills()


@capability_dev_skills_bp.route("/master-skills", methods=["GET"])
def get_master_skills():
    """Get the full list of master skills."""
    return SkillsController.get_master_skills()


@capability_dev_skills_bp.route("/master-skills", methods=["POST"])
def add_master_skill():
    """Add a new skill to the master skills table (HR/Admin)."""
    return SkillsController.add_master_skill()


@capability_dev_skills_bp.route("/team-skills", methods=["GET"])
def get_team_skills():
    """Get all active employees' skills with leaderboard."""
    return SkillsController.get_team_skills()
