from flask import Blueprint

from ..auth_config import ROLE_PERMISSIONS
from ..controllers.goals_controller import GoalsController
from ..utils.auth import roles_required


goals_bp = Blueprint("goals", __name__)


@goals_bp.route("/goals", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def create_goal():
    return GoalsController.create_goal()


@goals_bp.route("/goals/employee/<employee_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_employee_goals(employee_id):
    return GoalsController.get_goals_for_employee(employee_id)


@goals_bp.route("/goals/<int:goal_id>", methods=["PUT"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def update_goal(goal_id):
    return GoalsController.update_goal(goal_id)


@goals_bp.route("/goals/<int:goal_id>", methods=["DELETE"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def delete_goal(goal_id):
    return GoalsController.delete_goal(goal_id)
