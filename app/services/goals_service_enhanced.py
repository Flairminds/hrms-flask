"""
Enhanced Goals Service for Capability Development

Supports creating goals for self/others, tracking progress, comments, and reviews.
"""

from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy import or_, and_
from flask_jwt_extended import get_jwt_identity

from .. import db
from ..models.hr import Employee, MasterSkill
from ..models.capability_development import (
    EmployeeGoalEnhanced,
    GoalComment,
    GoalReview
)
from ..utils.logger import Logger


class EnhancedGoalsService:
    """Service for enhanced employee goal management with peer interaction."""

    @staticmethod
    def create_goal(payload: Dict, created_by_id: str) -> Dict:
        """
        Creates a new employee goal (skill or custom type).
        
        Args:
            payload: Goal data including for_employee_id, goal_type, etc.
            created_by_id: Employee ID of the goal creator
            
        Returns:
            Dict with goal details and success message
        """
        try:
            for_employee_id = payload.get("forEmployeeId")
            goal_type = payload.get("goalType")  # 'skill' or 'other'
            skill_id = payload.get("skillId")
            goal_title = payload.get("goalTitle")
            goal_description = payload.get("goalDescription", "")
            goal_category = payload.get("goalCategory")
            deadline = payload.get("deadline")
            notes = payload.get("notes", "")

            # Validation
            if not for_employee_id or not goal_type or not deadline:
                raise ValueError("Missing required fields: forEmployeeId, goalType, deadline")

            if goal_type == "skill" and not skill_id:
                raise ValueError("skillId is required for skill-type goals")
            
            if goal_type == "other" and not goal_title:
                raise ValueError("goalTitle is required for other-type goals")

            # Validate deadline
            try:
                deadline_dt = datetime.strptime(deadline, "%Y-%m-%d").date()
                if deadline_dt <= datetime.now().date():
                    raise ValueError("Deadline must be in the future")
            except ValueError as e:
                if "Deadline must be in the future" in str(e):
                    raise
                raise ValueError("Invalid date format, use YYYY-MM-DD")

            # Validate employee exists
            employee = Employee.query.filter_by(employee_id=for_employee_id).first()
            if not employee:
                raise ValueError(f"Employee {for_employee_id} not found")

            # Validate skill if skill-type goal
            if goal_type == "skill":
                skill = MasterSkill.query.filter_by(skill_id=skill_id).first()
                if not skill:
                    raise ValueError(f"Skill {skill_id} not found")

            # Create new goal
            new_goal = EmployeeGoalEnhanced(
                for_employee_id=for_employee_id,
                set_by_employee_id=created_by_id,
                goal_type=goal_type,
                skill_id=skill_id if goal_type == "skill" else None,
                goal_title=goal_title,
                goal_description=goal_description,
                goal_category=goal_category,
                status="pending",
                progress_percentage=0,
                deadline=deadline_dt,
                notes=notes
            )
            
            db.session.add(new_goal)
            db.session.commit()

            return {
                "goalId": new_goal.goal_id,
                "forEmployeeId": for_employee_id,
                "setByEmployeeId": created_by_id,
                "goalType": goal_type,
                "skillId": skill_id,
                "goalTitle": goal_title,
                "deadline": deadline,
                "status": "pending",
                "message": "Goal created successfully",
                "statusCode": 201
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error creating goal", error=str(e))
            raise

    @staticmethod
    def get_my_goals(employee_id: str) -> Dict:
        """
        Get goals assigned to the current user, grouped by type.
        
        Returns:
            Dict with skillDevelopment and other goals lists
        """
        try:
            goals = EmployeeGoalEnhanced.query.filter_by(
                for_employee_id=employee_id
            ).order_by(EmployeeGoalEnhanced.deadline.asc()).all()

            skill_goals = []
            other_goals = []

            for goal in goals:
                goal_data = EnhancedGoalsService._format_goal(goal)
                
                if goal.goal_type == "skill":
                    skill_goals.append(goal_data)
                else:
                    other_goals.append(goal_data)

            return {
                "skillDevelopment": skill_goals,
                "other": other_goals
            }

        except Exception as e:
            Logger.error("Error getting goals", error=str(e), employee_id=employee_id)
            raise

    @staticmethod
    def get_goals_created_by_me(employee_id: str) -> List[Dict]:
        """Get goals created by current user for other employees."""
        try:
            goals = EmployeeGoalEnhanced.query.filter(
                and_(
                    EmployeeGoalEnhanced.set_by_employee_id == employee_id,
                    EmployeeGoalEnhanced.for_employee_id != employee_id
                )
            ).order_by(EmployeeGoalEnhanced.deadline.asc()).all()

            return [EnhancedGoalsService._format_goal(goal) for goal in goals]

        except Exception as e:
            Logger.error("Error getting created goals", error=str(e), employee_id=employee_id)
            raise

    @staticmethod
    def update_goal_progress(goal_id: int, progress: float, notes: Optional[str] = None) -> Dict:
        """Update goal progress percentage."""
        try:
            goal = EmployeeGoalEnhanced.query.filter_by(goal_id=goal_id).first()
            if not goal:
                raise ValueError(f"Goal {goal_id} not found")

            if not 0 <= progress <= 100:
                raise ValueError("Progress must be between 0 and 100")

            goal.progress_percentage = progress
            
            # Auto-update status based on progress
            if progress == 0:
                goal.status = "pending"
            elif progress == 100:
                goal.status = "completed"
                goal.completion_date = datetime.now()
            else:
                goal.status = "in_progress"

            if notes:
                goal.notes = notes

            goal.modified_on = datetime.now()
            db.session.commit()

            return {
                "goalId": goal_id,
                "progress": float(progress),
                "status": goal.status,
                "message": "Goal progress updated successfully"
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating goal progress", error=str(e), goal_id=goal_id)
            raise

    @staticmethod
    def update_goal(goal_id: int, payload: Dict) -> None:
        """Update goal details."""
        try:
            goal = EmployeeGoalEnhanced.query.filter_by(goal_id=goal_id).first()
            if not goal:
                raise ValueError(f"Goal {goal_id} not found")

            # Update allowed fields
            if "goalTitle" in payload:
                goal.goal_title = payload["goalTitle"]
            if "goalDescription" in payload:
                goal.goal_description = payload["goalDescription"]
            if "deadline" in payload:
                deadline_dt = datetime.strptime(payload["deadline"], "%Y-%m-%d").date()
                goal.deadline = deadline_dt
            if "status" in payload:
                goal.status = payload["status"]
            if "goalCategory" in payload:
                goal.goal_category = payload["goalCategory"]

            goal.modified_on = datetime.now()
            db.session.commit()

        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating goal", error=str(e), goal_id=goal_id)
            raise

    @staticmethod
    def add_goal_comment(goal_id: int, comment_text: str, commented_by_id: str) -> Dict:
        """Add a comment to a goal."""
        try:
            goal = EmployeeGoalEnhanced.query.filter_by(goal_id=goal_id).first()
            if not goal:
                raise ValueError(f"Goal {goal_id} not found")

            comment = GoalComment(
                goal_id=goal_id,
                commented_by_id=commented_by_id,
                comment_text=comment_text
            )
            
            db.session.add(comment)
            db.session.commit()

            return {
                "commentId": comment.comment_id,
                "goalId": goal_id,
                "commentedById": commented_by_id,
                "commentText": comment_text,
                "commentDate": comment.comment_date.isoformat(),
                "message": "Comment added successfully"
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error adding comment", error=str(e), goal_id=goal_id)
            raise

    @staticmethod
    def get_goal_comments(goal_id: int) -> List[Dict]:
        """Get all comments for a goal."""
        try:
            comments = GoalComment.query.filter_by(goal_id=goal_id).order_by(
                GoalComment.comment_date.desc()
            ).all()

            result = []
            for comment in comments:
                employee = Employee.query.filter_by(employee_id=comment.commented_by_id).first()
                result.append({
                    "commentId": comment.comment_id,
                    "commentedById": comment.commented_by_id,
                    "commentedByName": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
                    "commentText": comment.comment_text,
                    "commentDate": comment.comment_date.isoformat()
                })

            return result

        except Exception as e:
            Logger.error("Error getting comments", error=str(e), goal_id=goal_id)
            raise

    @staticmethod
    def add_goal_review(goal_id: int, rating: float, review_text: str, reviewed_by_id: str) -> Dict:
        """Add a review/rating to a goal."""
        try:
            goal = EmployeeGoalEnhanced.query.filter_by(goal_id=goal_id).first()
            if not goal:
                raise ValueError(f"Goal {goal_id} not found")

            if not 1 <= rating <= 5:
                raise ValueError("Rating must be between 1 and 5")

            review = GoalReview(
                goal_id=goal_id,
                reviewed_by_id=reviewed_by_id,
                rating=rating,
                review_text=review_text
            )
            
            db.session.add(review)
            db.session.commit()

            return {
                "reviewId": review.review_id,
                "goalId": goal_id,
                "reviewedById": reviewed_by_id,
                "rating": float(rating),
                "reviewText": review_text,
                "reviewDate": review.review_date.isoformat(),
                "message": "Review added successfully"
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error adding review", error=str(e), goal_id=goal_id)
            raise

    @staticmethod
    def get_goal_reviews(goal_id: int) -> List[Dict]:
        """Get all reviews for a goal."""
        try:
            reviews = GoalReview.query.filter_by(goal_id=goal_id).order_by(
                GoalReview.review_date.desc()
            ).all()

            result = []
            for review in reviews:
                employee = Employee.query.filter_by(employee_id=review.reviewed_by_id).first()
                result.append({
                    "reviewId": review.review_id,
                    "reviewedById": review.reviewed_by_id,
                    "reviewedByName": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
                    "rating": float(review.rating) if review.rating else None,
                    "reviewText": review.review_text,
                    "reviewDate": review.review_date.isoformat()
                })

            return result

        except Exception as e:
            Logger.error("Error getting reviews", error=str(e), goal_id=goal_id)
            raise

    @staticmethod
    def _format_goal(goal: EmployeeGoalEnhanced) -> Dict:
        """Format goal object for API response."""
        # Get employee names
        for_employee = Employee.query.filter_by(employee_id=goal.for_employee_id).first()
        set_by_employee = Employee.query.filter_by(employee_id=goal.set_by_employee_id).first()
        
        # Get skill name if skill-type goal
        skill_name = None
        if goal.skill_id:
            skill = MasterSkill.query.filter_by(skill_id=goal.skill_id).first()
            skill_name = skill.skill_name if skill else None

        # Get counts
        comments_count = GoalComment.query.filter_by(goal_id=goal.goal_id).count()
        reviews_count = GoalReview.query.filter_by(goal_id=goal.goal_id).count()

        return {
            "goalId": goal.goal_id,
            "forEmployeeId": goal.for_employee_id,
            "forEmployeeName": f"{for_employee.first_name} {for_employee.last_name}" if for_employee else "Unknown",
            "setByEmployeeId": goal.set_by_employee_id,
            "setByName": f"{set_by_employee.first_name} {set_by_employee.last_name}" if set_by_employee else "Unknown",
            "goalType": goal.goal_type,
            "skillId": goal.skill_id,
            "skillName": skill_name,
            "goalTitle": goal.goalTitle,
            "goalDescription": goal.goal_description,
            "goalCategory": goal.goal_category,
            "status": goal.status,
            "progressPercentage": float(goal.progress_percentage) if goal.progress_percentage else 0,
            "deadline": goal.deadline.isoformat() if goal.deadline else None,
            "completionDate": goal.completion_date.isoformat() if goal.completion_date else None,
            "notes": goal.notes,
            "commentsCount": comments_count,
            "reviewsCount": reviews_count,
            "createdOn": goal.created_on.isoformat() if goal.created_on else None,
            "modifiedOn": goal.modified_on.isoformat() if goal.modified_on else None
        }
