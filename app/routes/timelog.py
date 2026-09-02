from flask import Blueprint
from ..controllers.timelog_controller import TimelogController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

timelog_bp = Blueprint('timelog', __name__)


@timelog_bp.route('/save-report', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['timelog']['save_report'])
def save_report():
    return TimelogController.save_report()


@timelog_bp.route('/entries', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['timelog']['get_entries'])
def get_entries():
    return TimelogController.get_entries()


@timelog_bp.route('/reports', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['timelog']['get_reports'])
def get_reports():
    return TimelogController.get_reports()
