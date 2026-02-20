from ...models.capability_development import EmployeeReview, db
from sqlalchemy.exc import SQLAlchemyError
from ...utils.logger import Logger
from datetime import datetime

class EmployeeReviewService:
    @staticmethod
    def get_reviews(employee_id=None):
        """
        Retrieves reviews.
        If employee_id is provided, returns reviews for that employee.
        Otherwise, returns all reviews.
        """
        try:
            query = EmployeeReview.query
            if employee_id:
                query = query.filter_by(employee_id=employee_id)
            # Sort by review_date descending
            return query.order_by(EmployeeReview.review_date.desc()).all()
        except Exception as e:
            Logger.error("Error fetching reviews", error=str(e))
            return []

    @staticmethod
    def create_review(data, created_by_id):
        """
        Creates a new employee review.
        """
        try:
            # Parse dates if they are strings
            review_date = data.get('review_date')
            reviewed_date = data.get('reviewed_date')

            if isinstance(review_date, str):
                review_date = datetime.strptime(review_date, '%Y-%m-%d').date()
            if isinstance(reviewed_date, str) and reviewed_date:
                reviewed_date = datetime.strptime(reviewed_date, '%Y-%m-%d').date()
            else:
                reviewed_date = None

            review = EmployeeReview(
                employee_id=data['employee_id'],
                review_date=review_date,
                reviewed_date=reviewed_date,
                review_comment=data.get('review_comment'),
                other_comments=data.get('other_comments'),
                file_link=data.get('file_link'),
                status=data.get('status', 'Pending'),
                created_by=created_by_id
            )
            db.session.add(review)
            db.session.commit()
            return review
        except Exception as e:
            db.session.rollback()
            Logger.error("Error creating review", error=str(e))
            raise e

    @staticmethod
    def update_review(review_id, data):
        """
        Updates an existing review.
        """
        try:
            review = EmployeeReview.query.get(review_id)
            if not review:
                return None
            
            if 'review_date' in data: 
                r_date = data['review_date']
                if isinstance(r_date, str):
                    r_date = datetime.strptime(r_date, '%Y-%m-%d').date()
                review.review_date = r_date
                
            if 'reviewed_date' in data:
                r_date = data['reviewed_date']
                if isinstance(r_date, str) and r_date:
                    r_date = datetime.strptime(r_date, '%Y-%m-%d').date()
                elif r_date is None or r_date == '':
                    r_date = None
                review.reviewed_date = r_date
                
            if 'review_comment' in data: review.review_comment = data['review_comment']
            if 'other_comments' in data: review.other_comments = data['other_comments']
            if 'file_link' in data: review.file_link = data['file_link']
            if 'status' in data: review.status = data['status']
            
            db.session.commit()
            return review
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating review", error=str(e))
            raise e
            
    @staticmethod
    def delete_review(review_id):
        """
        Deletes a review.
        """
        try:
            review = EmployeeReview.query.get(review_id)
            if not review:
                return False
            db.session.delete(review)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error deleting review", error=str(e))
            raise e
