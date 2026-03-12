from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ...services.capability_development.employee_review_service import EmployeeReviewService
from ...utils.logger import Logger

class EmployeeReviewController:
    @staticmethod
    @jwt_required()
    def get_reviews():
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        role = claims.get('role', '').lower()
        
        # If employee, can only view own.
        # HR/Admin/Lead can view any.
        
        target_employee_id = request.args.get('employee_id')
        
        if role == 'employee':
            # Employees can only see their own reviews
            # They might not pass query param, or if they do, it must match
            if target_employee_id and target_employee_id != current_user_id:
                return jsonify({'message': 'Unauthorized'}), 403
            target_employee_id = current_user_id
        
        # If HR/Admin/Lead doesn't provide employee_id, they get all reviews (or filtered by other means)
        # Service handles 'None' by returning all.
        
        try:
            reviews = EmployeeReviewService.get_reviews(target_employee_id)
            return jsonify(reviews), 200
        except Exception as e:
            Logger.error(f"Error getting reviews: {str(e)}")
            return jsonify({'message': 'Error fetching reviews'}), 500

    @staticmethod
    @jwt_required()
    def create_review():
        claims = get_jwt()
        role = claims.get('role', '').lower()
        if role not in ['admin', 'hr', 'lead']:
            return jsonify({'message': 'Unauthorized'}), 403
            
        data = request.json
        if not data or 'employee_id' not in data or 'review_date' not in data:
            return jsonify({'message': 'Missing required fields'}), 400
            
        try:
            review = EmployeeReviewService.create_review(data, get_jwt_identity())
            return jsonify({'message': 'Review created', 'id': review.review_id}), 201
        except Exception as e:
            return jsonify({'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_review(review_id):
        claims = get_jwt()
        role = claims.get('role', '').lower()
        if role not in ['admin', 'hr', 'lead']:
            return jsonify({'message': 'Unauthorized'}), 403
            
        data = request.json
        try:
            review = EmployeeReviewService.update_review(review_id, data)
            if not review:
                return jsonify({'message': 'Review not found'}), 404
            return jsonify({'message': 'Review updated'}), 200
        except Exception as e:
            return jsonify({'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def delete_review(review_id):
        claims = get_jwt()
        role = claims.get('role', '').lower()
        if role not in ['admin', 'hr', 'lead']:
            return jsonify({'message': 'Unauthorized'}), 403
            
        try:
            if EmployeeReviewService.delete_review(review_id):
                return jsonify({'message': 'Review deleted'}), 200
            return jsonify({'message': 'Review not found'}), 404
        except Exception as e:
            return jsonify({'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def get_review_summaries():
        """Returns review summary data for all employees (HR/Admin/Lead only)."""
        claims = get_jwt()
        role = claims.get('role', '').lower()
        if role not in ['admin', 'hr', 'lead']:
            return jsonify({'message': 'Unauthorized'}), 403

        try:
            summaries = EmployeeReviewService.get_review_summaries()
            return jsonify(summaries), 200
        except Exception as e:
            Logger.error(f"Error getting review summaries: {str(e)}")
            return jsonify({'message': 'Error fetching review summaries'}), 500
