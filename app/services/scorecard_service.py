"""
Scorecard Service for Capability Development

Calculate and retrieve performance metrics over time.
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from sqlalchemy import func, and_, extract
from decimal import Decimal

from .. import db
from ..models.hr import Employee, EmployeeSkill
from ..models.capability_development import (
    EmployeeGoalEnhanced,
    EmployeeFeedback,
    EmployeePerformanceMetrics
)
from ..utils.logger import Logger


class ScorecardService:
    """Service for calculating and retrieving performance metrics."""

    @staticmethod
    def calculate_period_metrics(employee_id: str, period_type: str, 
                                 period_start: date, period_end: date) -> Dict:
        """
        Calculate all metrics for a specific time period.
        
        Args:
            employee_id: Employee ID
            period_type: 'monthly', 'quarterly', or 'yearly'
            period_start: Start date of period
            period_end: End date of period
        """
        try:
            # Calculate individual metrics
            skill_score = ScorecardService.calculate_skill_proficiency_score(employee_id)
            goal_rate = ScorecardService.calculate_goal_completion_rate(
                employee_id, period_start, period_end
            )
            feedback_score = ScorecardService.calculate_peer_feedback_score(
                employee_id, period_start, period_end
            )
            
            # Calculate overall score (weighted average)
            # Weights: Skills=40%, Goals=30%, Feedback=30%
            overall_score = (
                (skill_score * 0.4) + 
                (goal_rate * 0.3) + 
                (feedback_score * 0.3)
            ) if all([skill_score, goal_rate, feedback_score]) else None

            # Get supporting counts
            goals_set = EmployeeGoalEnhanced.query.filter(
                and_(
                    EmployeeGoalEnhanced.for_employee_id == employee_id,
                    EmployeeGoalEnhanced.created_on >= period_start,
                    EmployeeGoalEnhanced.created_on <= period_end
                )
            ).count()

            goals_completed = EmployeeGoalEnhanced.query.filter(
                and_(
                    EmployeeGoalEnhanced.for_employee_id == employee_id,
                    EmployeeGoalEnhanced.status == 'completed',
                    EmployeeGoalEnhanced.completion_date >= period_start,
                    EmployeeGoalEnhanced.completion_date <= period_end
                )
            ).count()

            skills_evaluated = EmployeeSkill.query.filter(
                EmployeeSkill.employee_id == employee_id
            ).count()

            feedback_received = EmployeeFeedback.query.filter(
                and_(
                    EmployeeFeedback.for_employee_id == employee_id,
                    EmployeeFeedback.feedback_date >= period_start,
                    EmployeeFeedback.feedback_date <= period_end
                )
            ).count()

            # Check if metrics already exist
            existing = EmployeePerformanceMetrics.query.filter_by(
                employee_id=employee_id,
                period_type=period_type,
                period_start=period_start,
                period_end=period_end
            ).first()

            if existing:
                # Update existing
                existing.skill_proficiency_score = skill_score
                existing.goal_completion_rate = goal_rate
                existing.peer_feedback_score = feedback_score
                existing.overall_performance_score = overall_score
                existing.goals_set_count = goals_set
                existing.goals_completed_count = goals_completed
                existing.skills_evaluated_count = skills_evaluated
                existing.feedback_received_count = feedback_received
                existing.calculated_date = datetime.now()
            else:
                # Create new
                metrics = EmployeePerformanceMetrics(
                    employee_id=employee_id,
                    period_type=period_type,
                    period_start=period_start,
                    period_end=period_end,
                    skill_proficiency_score=skill_score,
                    goal_completion_rate=goal_rate,
                    peer_feedback_score=feedback_score,
                    overall_performance_score=overall_score,
                    goals_set_count=goals_set,
                    goals_completed_count=goals_completed,
                    skills_evaluated_count=skills_evaluated,
                    feedback_received_count=feedback_received
                )
                db.session.add(metrics)

            db.session.commit()

            return {
                "employeeId": employee_id,
                "periodType": period_type,
                "periodStart": period_start.isoformat(),
                "periodEnd": period_end.isoformat(),
                "skillProficiencyScore": float(skill_score) if skill_score else None,
                "goalCompletionRate": float(goal_rate) if goal_rate else None,
                "peerFeedbackScore": float(feedback_score) if feedback_score else None,
                "overallPerformanceScore": float(overall_score) if overall_score else None,
                "goalsSetCount": goals_set,
                "goalsCompletedCount": goals_completed,
                "skillsEvaluatedCount": skills_evaluated,
                "feedbackReceivedCount": feedback_received,
                "message": "Metrics calculated successfully"
            }

        except Exception as e:
            db.session.rollback()
            Logger.error("Error calculating metrics", error=str(e), employee_id=employee_id)
            raise

    @staticmethod
    def calculate_skill_proficiency_score(employee_id: str) -> Optional[Decimal]:
        """Calculate average skill proficiency score across all skills."""
        try:
            # Average of self_evaluation and score_by_lead
            result = db.session.query(
                func.avg(
                    (EmployeeSkill.self_evaluation + 
                     func.coalesce(EmployeeSkill.score_by_lead, EmployeeSkill.self_evaluation)) / 2
                )
            ).filter(
                EmployeeSkill.employee_id == employee_id
            ).scalar()

            return result if result else Decimal(0)

        except Exception as e:
            Logger.error("Error calculating skill score", error=str(e), employee_id=employee_id)
            return None

    @staticmethod
    def calculate_goal_completion_rate(employee_id: str, period_start: date, 
                                       period_end: date) -> Optional[Decimal]:
        """Calculate percentage of goals completed on time in period."""
        try:
            total_goals = EmployeeGoalEnhanced.query.filter(
                and_(
                    EmployeeGoalEnhanced.for_employee_id == employee_id,
                    EmployeeGoalEnhanced.deadline >= period_start,
                    EmployeeGoalEnhanced.deadline <= period_end
                )
            ).count()

            if total_goals == 0:
                return Decimal(0)

            completed_on_time = EmployeeGoalEnhanced.query.filter(
                and_(
                    EmployeeGoalEnhanced.for_employee_id == employee_id,
                    EmployeeGoalEnhanced.status == 'completed',
                    EmployeeGoalEnhanced.deadline >= period_start,
                    EmployeeGoalEnhanced.deadline <= period_end,
                    EmployeeGoalEnhanced.completion_date <= EmployeeGoalEnhanced.deadline
                )
            ).count()

            rate = (Decimal(completed_on_time) / Decimal(total_goals)) * Decimal(100)
            return rate

        except Exception as e:
            Logger.error("Error calculating goal rate", error=str(e), employee_id=employee_id)
            return None

    @staticmethod
    def calculate_peer_feedback_score(employee_id: str, period_start: date, 
                                       period_end: date) -> Optional[Decimal]:
        """Calculate average peer feedback rating in period."""
        try:
            result = db.session.query(
                func.avg(EmployeeFeedback.rating)
            ).filter(
                and_(
                    EmployeeFeedback.for_employee_id == employee_id,
                    EmployeeFeedback.rating.isnot(None),
                    EmployeeFeedback.feedback_date >= period_start,
                    EmployeeFeedback.feedback_date <= period_end,
                    EmployeeFeedback.is_visible_to_employee == True
                )
            ).scalar()

            return result if result else Decimal(0)

        except Exception as e:
            Logger.error("Error calculating feedback score", error=str(e), employee_id=employee_id)
            return None

    @staticmethod
    def get_my_metrics(employee_id: str, period_type: str = 'monthly') -> Dict:
        """Get current period metrics for employee."""
        try:
            # Determine current period
            today = date.today()
            
            if period_type == 'monthly':
                period_start = date(today.year, today.month, 1)
                next_month = today.month + 1 if today.month < 12 else 1
                next_year = today.year if today.month < 12 else today.year + 1
                period_end = date(next_year, next_month, 1) - timedelta(days=1)
            elif period_type == 'quarterly':
                quarter = (today.month - 1) // 3 + 1
                period_start = date(today.year, (quarter - 1) * 3 + 1, 1)
                period_end = date(today.year, quarter * 3 + 1, 1) - timedelta(days=1) if quarter < 4 else date(today.year, 12, 31)
            elif period_type == 'yearly':
                period_start = date(today.year, 1, 1)
                period_end = date(today.year, 12, 31)
            else:
                raise ValueError("Invalid period type. Must be 'monthly', 'quarterly', or 'yearly'")

            # Get or calculate metrics
            metrics = EmployeePerformanceMetrics.query.filter_by(
                employee_id=employee_id,
                period_type=period_type,
                period_start=period_start,
                period_end=period_end
            ).first()

            if not metrics:
                # Calculate new metrics
                return ScorecardService.calculate_period_metrics(
                    employee_id, period_type, period_start, period_end
                )

            return {
                "employeeId": employee_id,
                "periodType": period_type,
                "periodStart": period_start.isoformat(),
                "periodEnd": period_end.isoformat(),
                "skillProficiencyScore": float(metrics.skill_proficiency_score) if metrics.skill_proficiency_score else None,
                "goalCompletionRate": float(metrics.goal_completion_rate) if metrics.goal_completion_rate else None,
                "peerFeedbackScore": float(metrics.peer_feedback_score) if metrics.peer_feedback_score else None,
                "overallPerformanceScore": float(metrics.overall_performance_score) if metrics.overall_performance_score else None,
                "goalsSetCount": metrics.goals_set_count,
                "goalsCompletedCount": metrics.goals_completed_count,
                "skillsEvaluatedCount": metrics.skills_evaluated_count,
                "feedbackReceivedCount": metrics.feedback_received_count,
                "calculatedDate": metrics.calculated_date.isoformat() if metrics.calculated_date else None
            }

        except Exception as e:
            Logger.error("Error getting metrics", error=str(e), employee_id=employee_id)
            raise

    @staticmethod
    def get_metrics_history(employee_id: str, period_type: str = 'monthly', 
                           limit: int = 12) -> List[Dict]:
        """Get historical metrics for employee."""
        try:
            metrics = EmployeePerformanceMetrics.query.filter_by(
                employee_id=employee_id,
                period_type=period_type
            ).order_by(
                EmployeePerformanceMetrics.period_start.desc()
            ).limit(limit).all()

            return [{
                "periodStart": m.period_start.isoformat(),
                "periodEnd": m.period_end.isoformat(),
                "skillProficiencyScore": float(m.skill_proficiency_score) if m.skill_proficiency_score else None,
                "goalCompletionRate": float(m.goal_completion_rate) if m.goal_completion_rate else None,
                "peerFeedbackScore": float(m.peer_feedback_score) if m.peer_feedback_score else None,
                "overallPerformanceScore": float(m.overall_performance_score) if m.overall_performance_score else None,
                "goalsSetCount": m.goals_set_count,
                "goalsCompletedCount": m.goals_completed_count
            } for m in metrics]

        except Exception as e:
            Logger.error("Error getting metrics history", error=str(e), employee_id=employee_id)
            raise
