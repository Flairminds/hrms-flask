from flask import Blueprint

from ..controllers.skills_controller import SkillsController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS


skills_bp = Blueprint("skills", __name__)


@skills_bp.route("/employee-skills", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_employee_skills_overview():
    return SkillsController.get_employee_skills_overview()


@skills_bp.route("/add-update-skills", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def add_or_update_skills():
    return SkillsController.add_or_update_skills()


@skills_bp.route("/employee-skills/<employee_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_employee_skills(employee_id):
    return SkillsController.get_employee_skills(employee_id)


@skills_bp.route("/employees", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_employees_with_skills():
    return SkillsController.get_employees_with_skills()
