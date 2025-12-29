from flask import Blueprint

from ..auth_config import ROLE_PERMISSIONS
from ..controllers.review_controller import ReviewController
from ..utils.auth import roles_required


review_bp = Blueprint("review", __name__)


@review_bp.route("/employees/skills", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_assigned_employees_skills():
    return ReviewController.get_assigned_employees_skills()


@review_bp.route("/skill-statuses/<employee_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_skill_statuses(employee_id):
    return ReviewController.get_skill_statuses(employee_id)


@review_bp.route("/save-review", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def save_review():
    return ReviewController.save_review()


@review_bp.route("/add-employee-skill", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def add_employee_skill():
    return ReviewController.add_employee_skill()


@review_bp.route("/update-skill-score", methods=["PUT"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def update_skill_score():
    return ReviewController.update_skill_score()


@review_bp.route("/skills/employee", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_skills():
    return ReviewController.get_master_skills()
