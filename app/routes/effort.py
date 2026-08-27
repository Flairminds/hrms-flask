from flask import Blueprint
from ..controllers.effort_controller import EffortController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

effort_bp = Blueprint('effort', __name__)


@effort_bp.route('/save-report', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['effort']['save_report'])
def save_report():
    return EffortController.save_report()


@effort_bp.route('/tasks', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['effort']['get_tasks'])
def get_tasks():
    return EffortController.get_tasks()


@effort_bp.route('/reports', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['effort']['get_reports'])
def get_reports():
    return EffortController.get_reports()
