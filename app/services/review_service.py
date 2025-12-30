import uuid
from datetime import datetime
from typing import Dict, List

from sqlalchemy import text, func
from sqlalchemy.exc import SQLAlchemyError

from .. import db
from ..models.hr import Employee, EmployeeSkill, Skill, EmployeeEvaluators, EmployeeSkillReview
from ..utils.logger import Logger


class ReviewService:
    """Service for skill review, statuses, and employee skills for evaluators."""

    @staticmethod
    def get_assigned_employees_skills() -> List[Dict]:
        """Retrieves assigned employees with their skills using ORM."""
        Logger.info("Retrieving assigned employees with skills")
        try:
            # Create alias for evaluator employee
            Evaluator = db.aliased(Employee)
            
            # Complex ORM query with multiple JOINs
            result = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.last_name,
                EmployeeSkill.skill_id,
                func.coalesce(EmployeeSkill.skill_level, 'Secondary').label('skill_level'),
                EmployeeSkill.self_evaluation,
                EmployeeSkill.is_ready,
                Skill.skill_name,
                EmployeeSkillReview.evaluator_id.label('reviewed_by_id'),
                func.coalesce(
                    Evaluator.first_name.concat(' ').concat(Evaluator.last_name), 
                    ''
                ).label('reviewed_by_name'),
                EmployeeSkillReview.status
            ).outerjoin(
                EmployeeSkill,
                Employee.employee_id == EmployeeSkill.employee_id
            ).outerjoin(
                Skill,
                EmployeeSkill.skill_id == Skill.skill_id
            ).outerjoin(
                EmployeeSkillReview,
                (EmployeeSkillReview.employee_id == Employee.employee_id) &
                (EmployeeSkillReview.skill_id == EmployeeSkill.skill_id)
            ).outerjoin(
                Evaluator,
                Evaluator.employee_id == EmployeeSkillReview.evaluator_id
            ).filter(
                EmployeeEvaluators.query.filter(
                    EmployeeEvaluators.emp_id == Employee.employee_id
                ).exists()
            ).all()

            employees: Dict[str, Dict] = {}
            for row in result:
                emp_id = row.employee_id
                if emp_id not in employees:
                    employees[emp_id] = {
                        "EmployeeId": emp_id,
                        "Name": f"{row.first_name or ''} {row.last_name or ''}".strip(),
                        "Skills": {"Primary": [], "Secondary": [], "CrossTechSkill": []},
                    }

                skill_level = row.skill_level
                if skill_level in ["Primary", "Secondary", "CrossTechSkill"]:
                    employees[emp_id]["Skills"][skill_level].append(
                        {
                            "SkillLevel": skill_level,
                            "SkillName": row.skill_name or "Unknown",
                            "SkillId": row.skill_id,
                            "SelfEvaluation": float(row.self_evaluation)
                            if row.self_evaluation
                            else 0.0,
                            "isReady": bool(row.is_ready),
                            "reviewedBy":
                                {
                                    "id": row.reviewed_by_id,
                                    "name": row.reviewed_by_name,
                                }
                                if row.reviewed_by_id
                                else None,
                            "Status": row.status or "Available",
                        }
                    )
            Logger.info("Retrieved assigned employees with skills", employee_count=len(employees))
            return list(employees.values())
        except SQLAlchemyError as se:
            Logger.error("Database error retrieving assigned employees", error=str(se))
            raise
        except Exception as e:
            Logger.error("Error retrieving assigned employees", error=str(e))
            raise

    @staticmethod
    def get_skill_statuses(employee_id: str) -> List[Dict]:
        """Retrieves skill review statuses for an employee using ORM."""
        Logger.info("Retrieving skill statuses", employee_id=employee_id)
        try:
            # Create alias for evaluator
            Evaluator = db.aliased(Employee)
            
            result = db.session.query(
                EmployeeSkillReview.review_id,
                EmployeeSkillReview.employee_id,
                EmployeeSkillReview.skill_id,
                EmployeeSkillReview.evaluator_id,
                EmployeeSkillReview.evaluator_score,
                EmployeeSkillReview.comments,
                EmployeeSkillReview.is_ready,
                EmployeeSkillReview.status,
                EmployeeSkillReview.review_date,
                func.coalesce(
                    Evaluator.first_name.concat(' ').concat(Evaluator.last_name),
                    ''
                ).label('evaluator_name'),
                Skill.skill_name,
                EmployeeSkillReview.is_new,
                EmployeeSkill.self_evaluation,
                EmployeeSkill.skill_level
            ).join(
                Skill,
                Skill.skill_id == EmployeeSkillReview.skill_id
            ).outerjoin(
                Evaluator,
                Evaluator.employee_id == EmployeeSkillReview.evaluator_id
            ).outerjoin(
                EmployeeSkill,
                (EmployeeSkill.employee_id == EmployeeSkillReview.employee_id) &
                (EmployeeSkill.skill_id == EmployeeSkillReview.skill_id)
            ).filter(
                EmployeeSkillReview.employee_id == employee_id
            ).all()

            statuses = [
                {
                    "ReviewId": row.review_id,
                    "EmployeeId": row.employee_id,
                    "SkillId": row.skill_id,
                    "EvaluatorId": row.evaluator_id,
                    "EvaluatorScore": float(row.evaluator_score)
                    if row.evaluator_score
                    else 0.0,
                    "Comments": row.comments,
                    "IsReady": bool(row.is_ready),
                    "Status": row.status,
                    "ReviewDate": row.review_date.isoformat() if row.review_date else None,
                    "EvaluatorName": row.evaluator_name,
                    "SkillName": row.skill_name,
                    "IsNew": bool(row.is_new),
                    "SelfEvaluation": float(row.self_evaluation)
                    if row.self_evaluation
                    else 0.0,
                    "SkillLevel": row.skill_level,
                }
                for row in result
            ]
            Logger.debug("Skill statuses retrieved", employee_id=employee_id, count=len(statuses))
            return statuses
        except SQLAlchemyError as se:
            Logger.error("Database error retrieving skill statuses",
                        employee_id=employee_id,
                        error=str(se))
            raise
        except Exception as e:
            Logger.error("Error retrieving skill statuses",
                        employee_id=employee_id,
                        error=str(e))
            raise

    @staticmethod
    def save_review(payload: Dict) -> Dict:
        """Saves or updates a skill review using ORM."""
        employee_id = payload.get("employeeId")
        skill_id = payload.get("skillId")
        evaluator_id = payload.get("evaluatorId")
        
        Logger.info("Saving skill review",
                   employee_id=employee_id,
                   skill_id=skill_id,
                   evaluator_id=evaluator_id)
        
        try:
            evaluator_score = payload.get("evaluatorScore")
            comments = payload.get("comments", "")
            is_ready = payload.get("isReady", False)
            review_id = payload.get("reviewId")

            if not all([employee_id, skill_id, evaluator_id]):
                Logger.warning("Missing required fields for save_review")
                raise ValueError("Missing required fields")
            if evaluator_score is None or not (0 <= evaluator_score <= 5):
                Logger.warning("Invalid evaluator score", score=evaluator_score)
                raise ValueError("Evaluator score must be between 0 and 5")

            # Check evaluator assignment using ORM
            exists_check = EmployeeEvaluators.query.filter_by(
                emp_id=employee_id,
                evaluator_id=evaluator_id
            ).first()
            if not exists_check:
                Logger.warning("Evaluator not assigned to employee",
                             employee_id=employee_id,
                             evaluator_id=evaluator_id)
                raise PermissionError("Evaluator not assigned to employee")

            # Check for existing review using ORM
            existing_review = EmployeeSkillReview.query.filter_by(
                employee_id=employee_id,
                skill_id=skill_id
            ).first()

            # Get evaluator name using ORM
            evaluator = Employee.query.filter_by(employee_id=evaluator_id).first()
            evaluator_name = f"{evaluator.first_name} {evaluator.last_name}" if evaluator else ""

            if existing_review:
                # Update existing review using ORM
                existing_review.evaluator_id = evaluator_id
                existing_review.evaluator_score = evaluator_score
                existing_review.comments = comments
                existing_review.is_ready = is_ready
                existing_review.status = 'Reviewed'
                existing_review.review_date = datetime.now()
                review_id = existing_review.review_id
                Logger.debug("Updated existing review", review_id=review_id)
            else:
                # Insert new review using ORM
                review_id = str(uuid.uuid4())
                new_review = EmployeeSkillReview(
                    review_id=review_id,
                    employee_id=employee_id,
                    skill_id=skill_id,
                    evaluator_id=evaluator_id,
                    evaluator_score=evaluator_score,
                    comments=comments,
                    is_ready=is_ready,
                    status='Reviewed',
                    review_date=datetime.now(),
                    is_new=False
                )
                db.session.add(new_review)
                Logger.debug("Created new review", review_id=review_id)

            db.session.commit()
            Logger.info("Review saved successfully",
                       review_id=review_id,
                       employee_id=employee_id)
            return {"reviewId": review_id, "evaluatorName": evaluator_name}
            
        except (ValueError, PermissionError):
            db.session.rollback()
            raise
        except SQLAlchemyError as se:
            db.session.rollback()
            Logger.error("Database error saving review",
                        employee_id=employee_id,
                        error=str(se))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Error saving review",
                        employee_id=employee_id,
                        error=str(e))
            raise

    @staticmethod
    def add_employee_skill(payload: Dict) -> Dict:
        """Adds a new skill to an employee using ORM."""
        employee_id = payload.get("employeeId")
        skill_name = payload.get("skillName")
        
        Logger.info("Adding employee skill",
                   employee_id=employee_id,
                   skill_name=skill_name)
        
        try:
            skill_type = payload.get("skillType")
            self_score = payload.get("selfScore", 1)
            is_ready = payload.get("isReady", False)
            evaluator_id = payload.get("evaluatorId")

            if not all([employee_id, skill_name, skill_type, evaluator_id]):
                Logger.warning("Missing required fields for add_employee_skill")
                raise ValueError("Missing required fields")
            if skill_type not in ["Primary", "Secondary", "CrossTechSkill"]:
                Logger.warning("Invalid skill type", skill_type=skill_type)
                raise ValueError("Invalid skill type")

            # Check evaluator assignment using ORM
            exists_check = EmployeeEvaluators.query.filter_by(
                emp_id=employee_id,
                evaluator_id=evaluator_id
            ).first()
            if not exists_check:
                Logger.warning("Evaluator not assigned to employee",
                             employee_id=employee_id,
                             evaluator_id=evaluator_id)
                raise PermissionError("Evaluator not assigned to employee")

            # Check if skill exists using ORM
            existing_skill = Skill.query.filter_by(skill_name=skill_name).first()
            if existing_skill:
                skill_id = existing_skill.skill_id
                Logger.debug("Using existing skill", skill_id=skill_id)
            else:
                # Create new skill using ORM
                skill_id = str(uuid.uuid4())
                new_skill = Skill(
                    skill_id=skill_id,
                    skill_name=skill_name
                )
                db.session.add(new_skill)
                db.session.flush()
                Logger.debug("Created new skill", skill_id=skill_id, skill_name=skill_name)

            # Check if employee already has this skill using ORM
            skill_exists = EmployeeSkill.query.filter_by(
                employee_id=employee_id,
                skill_id=skill_id
            ).first()
            if skill_exists:
                Logger.warning("Skill already assigned",
                             employee_id=employee_id,
                             skill_name=skill_name)
                raise ValueError(f"Skill {skill_name} already assigned to employee")

            # Add skill to employee using ORM
            new_emp_skill = EmployeeSkill(
                employee_id=employee_id,
                skill_id=skill_id,
                skill_level=skill_type,
                self_evaluation=self_score,
                is_ready=is_ready
            )
            db.session.add(new_emp_skill)

            # Create initial review with IsNew = True using ORM
            review_id = str(uuid.uuid4())
            new_review = EmployeeSkillReview(
                review_id=review_id,
                employee_id=employee_id,
                skill_id=skill_id,
                evaluator_id=evaluator_id,
                evaluator_score=self_score,
                comments='',
                is_ready=is_ready,
                status='Reviewed',
                review_date=datetime.now(),
                is_new=True
            )
            db.session.add(new_review)

            db.session.commit()
            Logger.info("Employee skill added successfully",
                       employee_id=employee_id,
                       skill_id=skill_id)
            return {"skillId": skill_id}
            
        except (ValueError, PermissionError):
            db.session.rollback()
            raise
        except SQLAlchemyError as se:
            db.session.rollback()
            Logger.error("Database error adding employee skill",
                        employee_id=employee_id,
                        error=str(se))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Error adding employee skill",
                        employee_id=employee_id,
                        error=str(e))
            raise

    @staticmethod
    def update_skill_score(payload: Dict) -> None:
        """Updates an employee's self-evaluation score for a skill using ORM."""
        employee_id = payload.get("employeeId")
        skill_id = payload.get("skillId")
        
        Logger.info("Updating skill score",
                   employee_id=employee_id,
                   skill_id=skill_id)
        
        try:
            self_score = payload.get("selfScore")
            is_ready = payload.get("isReady", False)
            evaluator_id = payload.get("evaluatorId")

            if not all([employee_id, skill_id, self_score, evaluator_id]):
                Logger.warning("Missing required fields for update_skill_score")
                raise ValueError("Missing required fields")
            if not (0 <= self_score <= 5):
                Logger.warning("Invalid self score", score=self_score)
                raise ValueError("Self score must be between 0 and 5")

            # Check evaluator assignment using ORM
            exists_check = EmployeeEvaluators.query.filter_by(
                emp_id=employee_id,
                evaluator_id=evaluator_id
            ).first()
            if not exists_check:
                Logger.warning("Evaluator not assigned to employee",
                             employee_id=employee_id,
                             evaluator_id=evaluator_id)
                raise PermissionError("Evaluator not assigned to employee")

            # Check if skill exists for employee using ORM
            emp_skill = EmployeeSkill.query.filter_by(
                employee_id=employee_id,
                skill_id=skill_id
            ).first()
            if not emp_skill:
                Logger.warning("Skill not found for employee",
                             employee_id=employee_id,
                             skill_id=skill_id)
                raise ValueError("Skill not found for employee")

            # Update using ORM
            emp_skill.self_evaluation = self_score
            emp_skill.is_ready = is_ready
            db.session.commit()
            Logger.info("Skill score updated successfully",
                       employee_id=employee_id,
                       skill_id=skill_id)
                       
        except (ValueError, PermissionError):
            db.session.rollback()
            raise
        except SQLAlchemyError as se:
            db.session.rollback()
            Logger.error("Database error updating skill score",
                        employee_id=employee_id,
                        skill_id=skill_id,
                        error=str(se))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating skill score",
                        employee_id=employee_id,
                        skill_id=skill_id,
                        error=str(e))
            raise

    @staticmethod
    def get_master_skills() -> List[Dict]:
        """Retrieves all master skills using ORM."""
        Logger.info("Retrieving master skills")
        try:
            skills = Skill.query.filter_by(is_master_skill=True).all()
            Logger.debug("Master skills retrieved", count=len(skills))
            return [
                {"SkillId": skill.skill_id, "SkillName": skill.skill_name}
                for skill in skills
            ]
        except SQLAlchemyError as se:
            Logger.error("Database error retrieving master skills", error=str(se))
            raise
        except Exception as e:
            Logger.error("Error retrieving master skills", error=str(e))
            raise

