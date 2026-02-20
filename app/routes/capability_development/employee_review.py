from flask import Blueprint
from ...controllers.capability_development.employee_review_controller import EmployeeReviewController

employee_review_bp = Blueprint('employee_review', __name__)

@employee_review_bp.route('/', methods=['GET'])
def get_reviews():
    return EmployeeReviewController.get_reviews()

@employee_review_bp.route('/', methods=['POST'])
def create_review():
    return EmployeeReviewController.create_review()

@employee_review_bp.route('/<int:review_id>', methods=['PUT'])
def update_review(review_id):
    return EmployeeReviewController.update_review(review_id)

@employee_review_bp.route('/<int:review_id>', methods=['DELETE'])
def delete_review(review_id):
    return EmployeeReviewController.delete_review(review_id)
