from ..models.feedback import db, EmpFeedBackData
from sqlalchemy import text
import json
from datetime import datetime
from ..utils.logger import Logger

class FeedbackService:
    """Service class for managing employee feedback reports and goals (migrated from C# GoalAssign)."""

    # Supported date formats for parsing
    DATE_FORMATS = [
        "%Y-%m-%d",      # yyyy-MM-dd
        "%m/%d/%Y",      # MM/dd/yyyy
        "%d-%m-%Y",      # dd-MM-yyyy
        "%d/%m/%Y",      # dd/MM/yyyy
        "%m-%d-%Y",      # MM-dd-yyyy
        "%Y%m%d"         # yyyyMMdd
    ]

    @staticmethod
    def _parse_date(date_str):
        """
        Parses a date string using multiple format attempts.
        Raises ValueError if none of the formats match.
        """
        if not date_str:
            return None
            
        for fmt in FeedbackService.DATE_FORMATS:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        raise ValueError(f"Invalid TargetDate format: {date_str}. Please use a valid date format.")

    @staticmethod
    def add_feedback_in_db(employee_report):
        """
        Adds or updates employee feedback data in the database.
        Implements upsert logic - updates if record exists, inserts if new.
        
        Args:
            employee_report: dict containing:
                - employee_id: Employee ID
                - feedback_id: Feedback ID (0 or None for new records)
                - category: Feedback category
                - goal: List of goals (will be JSON serialized)
                - measure: List of measures (will be JSON serialized)
                - comments: List of comments (will be JSON serialized)
                - target_date: Target date string (supports multiple formats)
                
        Returns:
            True if successful, raises ApplicationError otherwise
        """
        try:
            employee_id = employee_report.get('employee_id')
            feedback_id = employee_report.get('feedback_id', 0)
            category = employee_report.get('category')
            goals = employee_report.get('goal', [])
            measures = employee_report.get('measure', [])
            comments = employee_report.get('comments', [])
            target_date_str = employee_report.get('target_date')
            
            # Serialize lists to JSON
            goals_json = json.dumps(goals)
            measures_json = json.dumps(measures)
            comments_json = json.dumps(comments)
            
            # Parse target date with multiple format support
            target_date = FeedbackService._parse_date(target_date_str)
            
            # Use SQLAlchemy ORM for upsert logic
            # Check if record exists
            existing_record = None
            if feedback_id and feedback_id > 0:
                existing_record = EmpFeedBackData.query.filter_by(
                    emp_id=employee_id,
                    feedback_id=feedback_id
                ).first()
            
            if existing_record:
                # Update existing record using ORM
                existing_record.category = category
                existing_record.goals = goals_json
                existing_record.measures = measures_json
                existing_record.comments = comments_json
                existing_record.targeted_date = target_date
            else:
                # Insert new record using ORM
                new_feedback = EmpFeedBackData(
                    emp_id=employee_id,
                    category=category,
                    goals=goals_json,
                    measures=measures_json,
                    comments=comments_json,
                    targeted_date=target_date
                )
                db.session.add(new_feedback)
            
            db.session.commit()
            return True
            
        except ValueError as ve:
            db.session.rollback()
            Logger.warning("Validation error in add_feedback_in_db", error=str(ve))
            raise Exception(f"Validation error: {str(ve)}")
        except Exception as e:
            db.session.rollback()
            Logger.error("Database error in add_feedback_in_db", error=str(e))
            raise Exception(f"A database error occurred while adding or updating the employee feedback: {str(e)}")

    @staticmethod
    def get_feedback_by_employee_id(emp_id):
        """
        Retrieves all feedback records for a specific employee.
        Deserializes JSON fields back to Python lists.
        
        Args:
            emp_id: Employee ID
            
        Returns:
            List of feedback records with deserialized JSON fields
        """
        try:
            # Use SQLAlchemy ORM
            results = EmpFeedBackData.query.filter_by(emp_id=emp_id).order_by(
                EmpFeedBackData.feedback_id.desc()
            ).all()
            
            if not results:
                return []
            
            feedback_list = []
            for record in results:
                feedback_list.append({
                    'feedback_id': record.feedback_id,
                    'employee_id': record.emp_id,
                    'category': record.category,
                    'goal': json.loads(record.goals) if record.goals else [],
                    'measure': json.loads(record.measures) if record.measures else [],
                    'comments': json.loads(record.comments) if record.comments else [],
                    'target_date': record.targeted_date.strftime('%Y-%m-%d') if record.targeted_date else None
                })
            
            return feedback_list
            
        except Exception as e:
            Logger.error("Database error in get_feedback_by_employee_id", error=str(e), employee_id=emp_id)
            raise Exception(f"A database error occurred while getting employee feedback: {str(e)}")

    @staticmethod
    def get_report_by_feedback_id(employee_id, feedback_id):
        """
        Retrieves a specific feedback record by employee ID and feedback ID.
        
        Args:
            employee_id: Employee ID
            feedback_id: Feedback ID
            
        Returns:
            Single feedback record dict, or None if not found
        """
        try:
            # Use SQLAlchemy ORM
            result = EmpFeedBackData.query.filter_by(
                emp_id=employee_id,
                feedback_id=feedback_id
            ).first()
            
            if not result:
                return None
            
            return {
                'feedback_id': result.feedback_id,
                'employee_id': result.emp_id,
                'category': result.category,
                'goal': json.loads(result.goals) if result.goals else [],
                'measure': json.loads(result.measures) if result.measures else [],
                'comments': json.loads(result.comments) if result.comments else [],
                'target_date': result.targeted_date.strftime('%Y-%m-%d') if result.targeted_date else None
            }
            
        except Exception as e:
            Logger.error("Database error in get_report_by_feedback_id", error=str(e), employee_id=employee_id, feedback_id=feedback_id)
            raise Exception(f"A database error occurred while fetching the feedback data: {str(e)}")

    # ============= LEGACY METHODS (for backward compatibility) =============

    @staticmethod
    def get_feedback_by_employee(emp_id):
        """
        Legacy method - redirects to get_feedback_by_employee_id.
        Kept for backward compatibility.
        """
        return FeedbackService.get_feedback_by_employee_id(emp_id)

    @staticmethod
    def add_feedback(data):
        """
        Legacy method - adds new feedback only (no update).
        Kept for backward compatibility but should use add_feedback_in_db for upsert behavior.
        """
        try:
            # Transform data format to match new method
            employee_report = {
                'employee_id': data.get('EmployeeId') or data.get('employee_id'),
                'feedback_id': 0,  # Always insert new
                'category': data.get('Category') or data.get('category'),
                'goal': data.get('Goal') or data.get('goal', []),
                'measure': data.get('Measure') or data.get('measure', []),
                'comments': data.get('Comments') or data.get('comments', []),
                'target_date': data.get('TargetDate') or data.get('target_date')
            }
            
            # Call new upsert method
            FeedbackService.add_feedback_in_db(employee_report)
            
            # Return the newly created feedback_id using ORM
            latest_feedback = EmpFeedBackData.query.filter_by(
                emp_id=employee_report['employee_id']
            ).order_by(EmpFeedBackData.feedback_id.desc()).first()
            
            return latest_feedback.feedback_id if latest_feedback else None
            
        except Exception as e:
            db.session.rollback()
            Logger.error("Error adding feedback", error=str(e))
            raise e

