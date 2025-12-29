from flask import Blueprint

from ..auth_config import ROLE_PERMISSIONS
from ..controllers.evaluators_controller import EvaluatorsController
from ..utils.auth import roles_required


evaluators_bp = Blueprint("evaluators", __name__)


@evaluators_bp.route("/HRFunctionality/AssignEvaluatorsToEmp", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def assign_evaluators_to_emp():
    return EvaluatorsController.assign_evaluators_to_emp()


@evaluators_bp.route("/HRFunctionality/SendEvaluatorReminder", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def send_evaluator_reminder():
    return EvaluatorsController.send_evaluator_reminder()


@evaluators_bp.route("/HRFunctionality/GetAllEmployeeEvaluators", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_all_employee_evaluators():
    return EvaluatorsController.get_all_employee_evaluators()


@evaluators_bp.route("/HRFunctionality/GetAllEmployeesForEvaluators/<evaluator_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_all_employees_for_evaluators(evaluator_id):
    return EvaluatorsController.get_all_employees_for_evaluators(evaluator_id)


@evaluators_bp.route("/HRFunctionality/DeleteEvaluators", methods=["DELETE"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def delete_evaluators():
    return EvaluatorsController.delete_evaluators()
