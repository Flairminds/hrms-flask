"""
Feedback Service for Capability Development

Peer-to-peer feedback system allowing employees to give and receive feedback.
"""

from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import or_, and_

from .. import db
from ..models.hr import Employee, MasterSkill
from ..models.capability_development import EmployeeFeedback, EmployeeGoal
from ..utils.logger import Logger


class FeedbackService:
    """Service for peer-to-peer employee feedback."""

    @staticmethod
    def submit_feedback(payload: Dict, feedback_by_id: str) -> Dict:
        """
        Submit feedback for another employee.
        
        Args:
            payload: Feedback data
            feedback_by_id: Employee ID giving feedback
            
        Returns:
            Dict with feedback details
        """
        try:
            for_employee_id = payload.get("forEmployeeId")
            feedback_category = payload.get("feedbackCategory")  # skill, performance, behavior, goal, general
            feedback_text = payload.get("feedbackText")
            rating = payload.get("rating")  # Optional 1-5
            related_skill_id = payload.get("relatedSkillId")
            related_goal_id = payload.get("relatedGoalId")
            is_visible = payload.get("isVisibleToEmployee", True)

            # Validation
            if not for_employee_id or not feedback_category or not feedback_text:
                raise ValueError("Missing required fields: forEmployeeId, feedbackCategory, feedbackText")

            valid_categories = ["skill", "performance", "behavior", "goal", "general"]
            if feedback_category not in valid_categories:
                raise ValueError(f"Invalid category. Must be one of: {', '.join(valid_categories)}")

            if rating and not (1 <= rating <= 5):
                raise ValueError("Rating must be between 1 and 5")

            # Validate employee exists
            employee = Employee.query.filter_by(employee_id=for_employee_id).first()
            if not employee:
                raise ValueError(f"Employee {for_employee_id} not found")

            # Validate related entities if provided
            if related_skill_id:
                skill = MasterSkill.query.filter_by(skill_id=related_skill_id).first()
                if not skill:
                    raise ValueError(f"Skill {related_skill_id} not found")

            if related_goal_id:
                goal = EmployeeGoal.query.filter_by(goal_id=related_goal_id).first()
                if not goal:
                    raise ValueError(f"Goal {related_goal_id} not found")

            # Create feedback
            feedback = EmployeeFeedback(
                for_employee_id=for_employee_id,
                feedback_by_id=feedback_by_id,
                feedback_category=feedback_category,
                related_skill_id=related_skill_id,
                related_goal_id=related_goal_id,
                rating=rating,
                feedback_text=feedback_text,
                is_visible_to_employee=is_visible
            )

            db.session.add(feedback)
            db.session.commit()

            return {
                "feedbackId": feedback.feedback_id,
                "forEmployeeId": for_employee_id,
                "feedbackById": feedback_by_id,
                "category": feedback_category,
                "rating": float(rating) if rating else None,
                "feedbackDate": feedback.feedback_date.isoformat(),
                "message": "Feedback submitted successfully",
                "statusCode": 201
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error submitting feedback", error=str(e))
            raise

    @staticmethod
    def get_received_feedback(employee_id: str, filters: Optional[Dict] = None) -> List[Dict]:
        """
        Get feedback received by an employee (only visible feedback).
        
        Args:
            employee_id: Employee ID
            filters: Optional filters (category, rating, dateFrom, dateTo)
        """
        try:
            query = EmployeeFeedback.query.filter(
                and_(
                    EmployeeFeedback.for_employee_id == employee_id,
                    EmployeeFeedback.is_visible_to_employee == True
                )
            )

            # Apply filters
            if filters:
                if filters.get("category"):
                    query = query.filter(EmployeeFeedback.feedback_category == filters["category"])
                
                if filters.get("minRating"):
                    query = query.filter(EmployeeFeedback.rating >= filters["minRating"])
                
                if filters.get("dateFrom"):
                    date_from = datetime.strptime(filters["dateFrom"], "%Y-%m-%d")
                    query = query.filter(EmployeeFeedback.feedback_date >= date_from)
                
                if filters.get("dateTo"):
                    date_to = datetime.strptime(filters["dateTo"], "%Y-%m-%d")
                    query = query.filter(EmployeeFeedback.feedback_date <= date_to)

            feedbacks = query.order_by(EmployeeFeedback.feedback_date.desc()).all()

            return [FeedbackService._format_feedback(fb) for fb in feedbacks]

        except Exception as e:
            Logger.error("Error getting received feedback", error=str(e), employee_id=employee_id)
            raise

    @staticmethod
    def get_given_feedback(employee_id: str, filters: Optional[Dict] = None) -> List[Dict]:
        """Get feedback given by an employee."""
        try:
            query = EmployeeFeedback.query.filter_by(feedback_by_id=employee_id)

            # Apply filters (same as received)
            if filters:
                if filters.get("category"):
                    query = query.filter(EmployeeFeedback.feedback_category == filters["category"])
                
                if filters.get("minRating"):
                    query = query.filter(EmployeeFeedback.rating >= filters["minRating"])
                
                if filters.get("dateFrom"):
                    date_from = datetime.strptime(filters["dateFrom"], "%Y-%m-%d")
                    query = query.filter(EmployeeFeedback.feedback_date >= date_from)
                
                if filters.get("dateTo"):
                    date_to = datetime.strptime(filters["dateTo"], "%Y-%m-%d")
                    query = query.filter(EmployeeFeedback.feedback_date <= date_to)

            feedbacks = query.order_by(EmployeeFeedback.feedback_date.desc()).all()

            return [FeedbackService._format_feedback(fb) for fb in feedbacks]

        except Exception as e:
            Logger.error("Error getting given feedback", error=str(e), employee_id=employee_id)
            raise

    @staticmethod
    def get_employee_feedback(employee_id: str, requesting_user_id: str) -> List[Dict]:
        """
        Get all feedback for an employee (admin/HR access).
        Includes non-visible feedback if requester has permission.
        """
        try:
            # For now, return all feedback
            # TODO: Add permission check for HR/admin
            feedbacks = EmployeeFeedback.query.filter_by(
                for_employee_id=employee_id
            ).order_by(EmployeeFeedback.feedback_date.desc()).all()

            return [FeedbackService._format_feedback(fb) for fb in feedbacks]

        except Exception as e:
            Logger.error("Error getting employee feedback", error=str(e), employee_id=employee_id)
            raise

    @staticmethod
    def update_feedback(feedback_id: int, payload: Dict, user_id: str) -> None:
        """
        Update feedback (only by creator).
        
        Args:
            feedback_id: Feedback ID
            payload: Updated data
            user_id: User attempting update (must match creator)
        """
        try:
            feedback = EmployeeFeedback.query.filter_by(feedback_id=feedback_id).first()
            if not feedback:
                raise ValueError(f"Feedback {feedback_id} not found")

            # Check permission
            if feedback.feedback_by_id != user_id:
                raise PermissionError("You can only edit your own feedback")

            # Update allowed fields
            if "feedbackText" in payload:
                feedback.feedback_text = payload["feedbackText"]
            if "rating" in payload:
                rating = payload["rating"]
                if rating and not (1 <= rating <= 5):
                    raise ValueError("Rating must be between 1 and 5")
                feedback.rating = rating
            if "isVisibleToEmployee" in payload:
                feedback.is_visible_to_employee = payload["isVisibleToEmployee"]
            if "feedbackCategory" in payload:
                feedback.feedback_category = payload["feedbackCategory"]

            feedback.modified_date = datetime.now()
            db.session.commit()

        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating feedback", error=str(e), feedback_id=feedback_id)
            raise

    @staticmethod
    def delete_feedback(feedback_id: int, user_id: str, is_admin: bool = False) -> None:
        """
        Delete feedback.
        
        Args:
            feedback_id: Feedback ID
            user_id: User attempting deletion
            is_admin: Whether user is admin (admins can delete any feedback)
        """
        try:
            feedback = EmployeeFeedback.query.filter_by(feedback_id=feedback_id).first()
            if not feedback:
                raise ValueError(f"Feedback {feedback_id} not found")

            # Check permission
            if not is_admin and feedback.feedback_by_id != user_id:
                raise PermissionError("You can only delete your own feedback")

            db.session.delete(feedback)
            db.session.commit()

        except Exception as e:
            db.session.rollback()
            Logger.error("Error deleting feedback", error=str(e), feedback_id=feedback_id)
            raise

    @staticmethod
    def _format_feedback(feedback: EmployeeFeedback) -> Dict:
        """Format feedback object for API response."""
        # Get employee names
        for_employee = Employee.query.filter_by(employee_id=feedback.for_employee_id).first()
        feedback_by = Employee.query.filter_by(employee_id=feedback.feedback_by_id).first()

        # Get related entities
        skill_name = None
        if feedback.related_skill_id:
            skill = MasterSkill.query.filter_by(skill_id=feedback.related_skill_id).first()
            skill_name = skill.skill_name if skill else None

        goal_title = None
        if feedback.related_goal_id:
            goal = EmployeeGoal.query.filter_by(goal_id=feedback.related_goal_id).first()
            goal_title = goal.goal_title if goal else None

        return {
            "feedbackId": feedback.feedback_id,
            "forEmployeeId": feedback.for_employee_id,
            "forEmployeeName": f"{for_employee.first_name} {for_employee.last_name}" if for_employee else "Unknown",
            "feedbackById": feedback.feedback_by_id,
            "feedbackByName": f"{feedback_by.first_name} {feedback_by.last_name}" if feedback_by else "Unknown",
            "feedbackCategory": feedback.feedback_category,
            "relatedSkillId": feedback.related_skill_id,
            "relatedSkillName": skill_name,
            "relatedGoalId": feedback.related_goal_id,
            "relatedGoalTitle": goal_title,
            "rating": float(feedback.rating) if feedback.rating else None,
            "feedbackText": feedback.feedback_text,
            "isVisibleToEmployee": feedback.is_visible_to_employee,
            "feedbackDate": feedback.feedback_date.isoformat(),
            "modifiedDate": feedback.modified_date.isoformat() if feedback.modified_date else None
        }
