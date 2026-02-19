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
                {
                    "skillId": s.skill_id,
                    "skillName": s.skill_name,
                    "skillType": s.skill_type,
                    "skillCategory": s.skill_category,
                    "isMasterSkill": bool(s.is_master_skill),
                }
                for s in skills
            ]
        except Exception as e:
            Logger.error("Error retrieving master skills", error=str(e))
            raise

    @staticmethod
    def add_master_skill(payload: dict) -> dict:
        """
        Add a new skill to master_skills table.
        Raises ValueError if the skill_name already exists.
        """
        skill_name = (payload.get("skillName") or "").strip()
        skill_type = (payload.get("skillType") or "Technical").strip()
        skill_category = (payload.get("skillCategory") or "").strip() or None

        if not skill_name:
            raise ValueError("skillName is required")

        existing = MasterSkill.query.filter(
            db.func.lower(MasterSkill.skill_name) == skill_name.lower()
        ).first()
        if existing:
            raise ValueError(f"Skill '{skill_name}' already exists")

        try:
            new_skill = MasterSkill(
                skill_name=skill_name,
                skill_type=skill_type,
                skill_category=skill_category,
                is_master_skill=True,
            )
            db.session.add(new_skill)
            db.session.commit()
            Logger.info("Master skill added", skill_name=skill_name)
            return {
                "skillId": new_skill.skill_id,
                "skillName": new_skill.skill_name,
                "skillType": new_skill.skill_type,
                "skillCategory": new_skill.skill_category,
                "isMasterSkill": True,
            }
        except Exception as e:
            db.session.rollback()
            Logger.error("Error adding master skill", error=str(e))
            raise


    @staticmethod
    def get_team_skills() -> dict:
        """
        Return a flat list of all active employees' skills plus a
        top-5 leaderboard scored by:  count * level_weight * avg_self_evaluation
        where level_weight: Beginner=1, Intermediate=2, Expert=3 (unknown=1).
        """
        LEVEL_WEIGHT = {"Beginner": 1, "Intermediate": 2, "Expert": 3}

        try:
            rows = (
                db.session.query(
                    Employee.employee_id,
                    Employee.first_name,
                    Employee.last_name,
                    Employee.employment_status,
                    EmployeeSkill.skill_id,
                    EmployeeSkill.skill_level,
                    EmployeeSkill.skill_category,
                    EmployeeSkill.self_evaluation,
                    MasterSkill.skill_name,
                )
                .join(EmployeeSkill, Employee.employee_id == EmployeeSkill.employee_id)
                .join(MasterSkill, EmployeeSkill.skill_id == MasterSkill.skill_id)
                .filter(Employee.employment_status.notin_(['Relieved', 'Absconding']))
                .order_by(Employee.first_name, MasterSkill.skill_name)
                .all()
            )

            skill_stats: dict = {}   # skill_id -> {name, count, total_weight, total_eval}
            flat: list = []

            for r in rows:
                s_level = r.skill_level
                s_category = r.skill_category
                # backwards-compat
                if not s_category and s_level in ["Primary", "Secondary", "Cross Tech Skill"]:
                    s_category = s_level
                    s_level = None

                flat.append({
                    "employeeId": r.employee_id,
                    "employeeName": f"{r.first_name} {r.last_name}".strip(),
                    "skillId": r.skill_id,
                    "skillName": r.skill_name,
                    "skillCategory": s_category,
                    "skillLevel": s_level,
                    "selfEvaluation": float(r.self_evaluation) if r.self_evaluation else None,
                })

                # accumulate stats for leaderboard
                if r.skill_id not in skill_stats:
                    skill_stats[r.skill_id] = {
                        "skillId": r.skill_id,
                        "skillName": r.skill_name,
                        "count": 0,
                        "totalWeight": 0,
                        "totalEval": 0,
                        "evalCount": 0,
                    }
                stat = skill_stats[r.skill_id]
                weight = LEVEL_WEIGHT.get(s_level, 1)
                eval_val = float(r.self_evaluation) if r.self_evaluation else 0
                stat["count"] += 1
                stat["totalWeight"] += weight
                stat["totalEval"] += eval_val
                stat["evalCount"] += 1 if r.self_evaluation else 0

            # compute score = count * avg_weight * avg_eval
            leaderboard = []
            for stat in skill_stats.values():
                avg_weight = stat["totalWeight"] / stat["count"] if stat["count"] else 0
                avg_eval = stat["totalEval"] / stat["evalCount"] if stat["evalCount"] else 1
                score = round(stat["count"] * avg_weight * avg_eval, 2)
                leaderboard.append({
                    "skillId": stat["skillId"],
                    "skillName": stat["skillName"],
                    "employeeCount": stat["count"],
                    "avgLevel": round(avg_weight, 2),
                    "avgSelfEval": round(avg_eval, 2),
                    "score": score,
                })

            top5 = sorted(leaderboard, key=lambda x: x["score"], reverse=True)[:5]

            return {"skills": flat, "top5": top5}

        except SQLAlchemyError as e:
            Logger.error("DB error retrieving team skills", error=str(e))
            raise
        except Exception as e:
            Logger.error("Error retrieving team skills", error=str(e))
            raise
