from flask import Blueprint

from ..auth_config import ROLE_PERMISSIONS
from ..controllers.capability_controller import CapabilityController
from ..utils.auth import roles_required


capability_bp = Blueprint("capability", __name__)


# Leads
@capability_bp.route("/capability-leads", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_capability_leads():
    return CapabilityController.get_leads()


@capability_bp.route("/capability-leads", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def create_capability_lead():
    return CapabilityController.create_leads()


@capability_bp.route("/capability-leads/<int:lead_id>", methods=["DELETE"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def delete_capability_lead(lead_id):
    return CapabilityController.delete_lead(lead_id)


# Assignments
@capability_bp.route("/assigned-capability-leads", methods=["GET"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def get_assigned_capability_leads():
    return CapabilityController.get_assignments()


@capability_bp.route("/assigned-capability-leads", methods=["POST"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def create_capability_assignment():
    return CapabilityController.create_assignment()


@capability_bp.route("/assigned-capability-leads/<int:assignment_id>", methods=["PUT"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def update_capability_assignment(assignment_id):
    return CapabilityController.update_assignment(assignment_id)


@capability_bp.route("/assigned-capability-leads/<int:assignment_id>", methods=["DELETE"])
@roles_required(*ROLE_PERMISSIONS["hr"])
def delete_capability_assignment(assignment_id):
    return CapabilityController.delete_assignment(assignment_id)
