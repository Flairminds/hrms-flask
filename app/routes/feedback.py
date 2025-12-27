from flask import Blueprint
from ..controllers.feedback_controller import FeedbackController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

feedback_bp = Blueprint('feedback', __name__)

@feedback_bp.route('/get-emp-report', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['feedback']['get_emp_report'])
def get_emp_report():
    return FeedbackController.get_emp_report()

@feedback_bp.route('/add-emp-report', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['feedback']['add_emp_report'])
def add_emp_report():
    return FeedbackController.add_emp_report()
