from ..models.feedback import db, EmployeeFeedback
import json
from datetime import datetime

class FeedbackService:
    """Service class for managing performance feedback and goals for employees."""

    @staticmethod
    def get_feedback_by_employee(emp_id):
        """Retrieves all feedback records for a specific employee, parsing JSON data fields."""
        try:
            feedbacks = EmployeeFeedback.query.filter_by(EmpID=emp_id).all()
            result = []
            for f in feedbacks:
                result.append({
                    "FeedBackId": f.FeedBackId,
                    "Category": f.Category,
                    "Goal": json.loads(f.Goals) if f.Goals else [],
                    "Measure": json.loads(f.Measures) if f.Measures else [],
                    "Comments": json.loads(f.Comments) if f.Comments else [],
                    "TargetDate": f.TargetedDate.strftime('%Y-%m-%d') if f.TargetedDate else None
                })
            return result
        except Exception as e:
            print(f"Error fetching feedback for employee {emp_id}: {e}")
            return []

    @staticmethod
    def add_feedback(data):
        """Saves a new performance feedback record, serializing data to JSON for storage."""
        try:
            # Ensure JSON storage parity with the existing SQL Server schema
            feedback = EmployeeFeedback(
                EmpID=data.get('EmployeeId'),
                Category=data.get('Category'),
                Goals=json.dumps(data.get('Goal', [])),
                Measures=json.dumps(data.get('Measure', [])),
                Comments=json.dumps(data.get('Comments', [])),
                TargetedDate=datetime.strptime(data.get('TargetDate'), '%Y-%m-%d') if data.get('TargetDate') else None
            )
            db.session.add(feedback)
            db.session.commit()
            return feedback.FeedBackId
        except Exception as e:
            db.session.rollback()
            print(f"Error adding feedback: {e}")
            raise e
