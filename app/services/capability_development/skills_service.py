"""
Capability Development - Skills Service

Handles all My Skills business logic for the Capability Development module.
Migrated from app/services/skills_service.py
"""

from datetime import datetime

from sqlalchemy.exc import SQLAlchemyError

from ... import db
from ...models.hr import Employee, EmployeeSkill, MasterSkill
from ...utils.logger import Logger


class SkillsService:
    """Service for employee skills within the Capability Development module."""

    @staticmethod
    def get_my_skills(employee_id: str) -> dict:
        """
        Fetch all skills for a single employee including proficiency, category,
        self-evaluation, and notes.
        """
        Logger.info("Retrieving skills for employee", employee_id=employee_id)
        try:
            employee = Employee.query.filter_by(employee_id=employee_id).first()

            if not employee:
                Logger.debug("Employee not found", employee_id=employee_id)
                return {
                    "employeeId": employee_id,
                    "qualificationYearMonth": None,
                    "fullStackReady": None,
                    "skills": [],
                }

            employee_skills = (
                db.session.query(
                    EmployeeSkill.skill_id,
                    EmployeeSkill.skill_level,
                    EmployeeSkill.skill_category,
                    EmployeeSkill.self_evaluation,
                    EmployeeSkill.is_ready,
                    EmployeeSkill.is_ready_date,
                    EmployeeSkill.notes,
                    MasterSkill.skill_name,
                )
                .join(MasterSkill, EmployeeSkill.skill_id == MasterSkill.skill_id)
                .filter(EmployeeSkill.employee_id == employee_id)
                .all()
            )

            skills = []
            for row in employee_skills:
                # Backwards-compat: old rows stored category in skill_level column
                s_level = row.skill_level
                s_category = row.skill_category
                if not s_category and s_level in ["Primary", "Secondary", "Cross Tech Skill"]:
                    s_category = s_level
                    s_level = None

                skills.append(
                    {
                        "skillId": row.skill_id,
                        "skillName": row.skill_name,
                        "skillLevel": s_level,        # Proficiency: Beginner / Intermediate / Expert
                        "skillCategory": s_category,  # Category: Primary / Secondary / Cross Tech Skill
                        "selfEvaluation": row.self_evaluation,
                        "isReady": int(row.is_ready) if row.is_ready else 0,
                        "isReadyDate": row.is_ready_date.isoformat() if row.is_ready_date else None,
                        "notes": row.notes,
                    }
                )

            return {
                "employeeId": employee_id,
                "qualificationYearMonth": employee.qualification_year_month,
                "fullStackReady": employee.full_stack_ready,
                "skills": skills,
            }

        except SQLAlchemyError as e:
            Logger.error("DB error retrieving skills", employee_id=employee_id, error=str(e))
            raise
        except Exception as e:
            Logger.error("Error retrieving skills", employee_id=employee_id, error=str(e))
            raise

    @staticmethod
    def add_or_update_my_skills(employee_id: str, skills: list) -> None:
        """
        Upsert a list of skills for the given employee.

        Each skill dict should contain:
            skillId       (int, required)
            skillLevel    (str) — Proficiency
            skillCategory (str) — Category
            selfEvaluation (float)
            notes         (str)
        """
        Logger.info("Upserting skills for employee", employee_id=employee_id)
        try:
            if not skills:
                raise ValueError("skills list cannot be empty")

            employee = Employee.query.filter_by(employee_id=employee_id).first()
            if not employee:
                raise ValueError(f"Employee {employee_id} not found")

            for skill in skills:
                skill_id = skill.get("skillId")
                if not skill_id:
                    raise ValueError("Each skill must include skillId")

                existing = EmployeeSkill.query.filter_by(
                    employee_id=employee_id, skill_id=skill_id
                ).first()

                if existing:
                    existing.skill_level = skill.get("skillLevel")
                    existing.skill_category = skill.get("skillCategory")
                    existing.self_evaluation = skill.get("selfEvaluation")
                    existing.notes = skill.get("notes")
                else:
                    db.session.add(
                        EmployeeSkill(
                            employee_id=employee_id,
                            skill_id=skill_id,
                            skill_level=skill.get("skillLevel"),
                            skill_category=skill.get("skillCategory"),
                            self_evaluation=skill.get("selfEvaluation"),
                            notes=skill.get("notes"),
                        )
                    )

            db.session.commit()
            Logger.info("Skills upserted", employee_id=employee_id, count=len(skills))

        except ValueError:
            db.session.rollback()
            raise
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("DB error upserting skills", employee_id=employee_id, error=str(e))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Error upserting skills", employee_id=employee_id, error=str(e))
            raise

    @staticmethod
    def get_master_skills() -> list:
        """Return all master skills as a plain list."""
        try:
            skills = MasterSkill.query.order_by(MasterSkill.skill_name).all()
            return [
                {"skillId": s.skill_id, "skillName": s.skill_name}
                for s in skills
            ]
        except Exception as e:
            Logger.error("Error retrieving master skills", error=str(e))
            raise
