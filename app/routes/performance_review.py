from flask import Blueprint
from ..controllers.performance_review_controller import PerformanceReviewController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

performance_review_bp = Blueprint('performance_review', __name__)

_P = ROLE_PERMISSIONS['performance_review']

# ---------------- Config ----------------

@performance_review_bp.route('/config', methods=['GET'])
@roles_required(*_P['get_config'])
def get_config():
    return PerformanceReviewController.get_config()


@performance_review_bp.route('/config/versions', methods=['GET'])
@roles_required(*_P['manage_config'])
def get_config_versions():
    return PerformanceReviewController.get_config_versions()


@performance_review_bp.route('/config/sections', methods=['POST'])
@roles_required(*_P['manage_config'])
def create_section():
    return PerformanceReviewController.create_section()


@performance_review_bp.route('/config/sections/<string:section_id>', methods=['PUT'])
@roles_required(*_P['manage_config'])
def update_section(section_id):
    return PerformanceReviewController.update_section(section_id)


@performance_review_bp.route('/config/sections/<string:section_id>', methods=['DELETE'])
@roles_required(*_P['manage_config'])
def delete_section(section_id):
    return PerformanceReviewController.delete_section(section_id)


@performance_review_bp.route('/config/sections/<string:section_id>/questions', methods=['POST'])
@roles_required(*_P['manage_config'])
def add_questions(section_id):
    return PerformanceReviewController.add_questions(section_id)


@performance_review_bp.route('/config/weightage/distribute-equal', methods=['POST'])
@roles_required(*_P['manage_config'])
def distribute_weightage():
    return PerformanceReviewController.distribute_weightage()


@performance_review_bp.route('/config/written-questions', methods=['POST'])
@roles_required(*_P['manage_config'])
def save_written_question():
    return PerformanceReviewController.save_written_question()


@performance_review_bp.route('/config/written-questions/<string:question_id>', methods=['DELETE'])
@roles_required(*_P['manage_config'])
def delete_written_question(question_id):
    return PerformanceReviewController.delete_written_question(question_id)


@performance_review_bp.route('/config/activity', methods=['GET'])
@roles_required(*_P['manage_config'])
def get_activity_log():
    return PerformanceReviewController.get_activity_log()

# ---------------- Cycles ----------------

@performance_review_bp.route('/cycles', methods=['GET'])
@roles_required(*_P['get_cycles'])
def get_cycles():
    return PerformanceReviewController.get_cycles()


@performance_review_bp.route('/review-list', methods=['GET'])
@roles_required(*_P['get_review'])
def get_review_list():
    return PerformanceReviewController.get_review_list()


@performance_review_bp.route('/my-reviewees', methods=['GET'])
@roles_required(*_P['get_review'])
def get_my_reviewees():
    return PerformanceReviewController.get_my_reviewees()


@performance_review_bp.route('/cycles', methods=['POST'])
@roles_required(*_P['manage_cycles'])
def create_cycle():
    return PerformanceReviewController.create_cycle()

# ---------------- Reviews ----------------

@performance_review_bp.route('/reviewers/preview', methods=['GET'])
@roles_required(*_P['get_review'])
def preview_reviewers():
    return PerformanceReviewController.preview_reviewers()


@performance_review_bp.route('/reviews/initiate', methods=['POST'])
@roles_required(*_P['manage_cycles'])
def initiate_review():
    return PerformanceReviewController.initiate_review()


@performance_review_bp.route('/review/complete', methods=['POST'])
@roles_required(*_P['complete_review'])
def complete_review():
    return PerformanceReviewController.complete_review()


@performance_review_bp.route('/review', methods=['GET'])
@roles_required(*_P['get_review'])
def get_review():
    return PerformanceReviewController.get_review()


@performance_review_bp.route('/summary', methods=['GET'])
@roles_required(*_P['get_review'])
def get_summary():
    return PerformanceReviewController.get_summary()


@performance_review_bp.route('/reviewers/<string:reviewer_id>/scores', methods=['PUT'])
@roles_required(*_P['submit_review'])
def save_score(reviewer_id):
    return PerformanceReviewController.save_score(reviewer_id)


@performance_review_bp.route('/reviewers/<string:reviewer_id>/answers', methods=['PUT'])
@roles_required(*_P['submit_review'])
def save_answer(reviewer_id):
    return PerformanceReviewController.save_answer(reviewer_id)


@performance_review_bp.route('/reviewers/<string:reviewer_id>/comments', methods=['PUT'])
@roles_required(*_P['submit_review'])
def save_comment(reviewer_id):
    return PerformanceReviewController.save_comment(reviewer_id)


@performance_review_bp.route('/reviewers/<string:reviewer_id>/reset', methods=['POST'])
@roles_required(*_P['submit_review'])
def reset_reviewer(reviewer_id):
    return PerformanceReviewController.reset_reviewer(reviewer_id)


@performance_review_bp.route('/reviewers/<string:reviewer_id>/submit', methods=['POST'])
@roles_required(*_P['submit_review'])
def submit_reviewer(reviewer_id):
    return PerformanceReviewController.submit_reviewer(reviewer_id)


@performance_review_bp.route('/reviewers/<string:reviewer_id>/unlock', methods=['POST'])
@roles_required(*_P['submit_review'])
def unlock_reviewer(reviewer_id):
    return PerformanceReviewController.unlock_reviewer(reviewer_id)
