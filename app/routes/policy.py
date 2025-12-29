from flask import Blueprint

from ..auth_config import ROLE_PERMISSIONS
from ..controllers.policy_controller import PolicyController
from ..utils.auth import roles_required


policy_bp = Blueprint("policy", __name__)


@policy_bp.route("/policy-acknowledgment/<employee_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_policy_acknowledgment(employee_id):
    return PolicyController.get_policy_acknowledgment(employee_id)


@policy_bp.route("/policy-acknowledgment", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def update_policy_acknowledgment():
    return PolicyController.update_policy_acknowledgment()


@policy_bp.route("/send-policy-email", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def send_policy_email():
    return PolicyController.send_policy_email()


@policy_bp.route("/update-warning-count", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def update_warning_count():
    return PolicyController.update_warning_count()


@policy_bp.route("/warning-count/<employee_id>", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_warning_count(employee_id):
    return PolicyController.get_warning_count(employee_id)
