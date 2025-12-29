from datetime import datetime
from typing import Dict, List

from sqlalchemy import text

from .. import db


class GoalsService:
    """Service for employee goal setting and retrieval."""

    @staticmethod
    def create_goal(payload: Dict) -> Dict:
        employee_id = payload.get("employeeId")
        skill_id = payload.get("skillId")
        custom_skill_name = payload.get("customSkillName")
        target_date = payload.get("targetDate")
        set_by_employee_id = payload.get("setByEmployeeId", employee_id)

        if not employee_id or not target_date:
            raise ValueError("Missing required fields: employeeId, targetDate")
        if not skill_id and not custom_skill_name:
            raise ValueError("Either skillId or customSkillName is required")

        # Validate target date
        try:
            target_date_dt = datetime.strptime(target_date, "%Y-%m-%d")
            if target_date_dt <= datetime.now():
                raise ValueError("Target date must be in the future")
        except ValueError:
            raise ValueError("Invalid date format, use YYYY-MM-DD")

        # Resolve / create skill
        if custom_skill_name:
            result = db.session.execute(
                text(
                    "SELECT SkillId FROM Skill WHERE SkillName = :skill_name AND SkillType = 'Other'"
                ),
                {"skill_name": custom_skill_name},
            ).scalar()
            if not result:
                db.session.execute(
                    text(
                        "INSERT INTO Skill (SkillId, SkillName, SkillType) "
                        "VALUES ((SELECT COALESCE(MAX(SkillId), 0) + 1 FROM Skill), :skill_name, 'Other')"
                    ),
                    {"skill_name": custom_skill_name},
                )
                skill_id = db.session.execute(text("SELECT MAX(SkillId) FROM Skill")).scalar()
            else:
                skill_id = result
        else:
            # Validate existing skill
            result = db.session.execute(
                text("SELECT SkillId FROM Skill WHERE SkillId = :skill_id"),
                {"skill_id": skill_id},
            ).scalar()
            if not result:
                raise ValueError(f"Skill {skill_id} not found")

        # Check for existing goal
        existing_goal = db.session.execute(
            text(
                "SELECT GoalId, TargetDate FROM EmployeeGoal WHERE EmployeeId = :employee_id AND SkillId = :skill_id"
            ),
            {"employee_id": employee_id, "skill_id": skill_id},
        ).fetchone()

        if existing_goal:
            existing_target_date = existing_goal.TargetDate
            if target_date_dt > existing_target_date:
                db.session.execute(
                    text("UPDATE EmployeeGoal SET TargetDate = :target_date WHERE GoalId = :goal_id"),
                    {"target_date": target_date, "goal_id": existing_goal.GoalId},
                )
                db.session.commit()
                return {
                    "goalId": existing_goal.GoalId,
                    "employeeId": employee_id,
                    "skillId": skill_id,
                    "customSkillName": custom_skill_name or None,
                    "targetDate": target_date,
                    "setByEmployeeId": set_by_employee_id,
                    "createdOn": existing_target_date.strftime("%Y-%m-%dT%H:%M:%S"),
                    "message": "Goal target date updated successfully",
                    "status_code": 200,
                }
            raise ValueError(
                "A goal for this skill already exists with a later or same target date"
            )

        # Insert new goal
        result = db.session.execute(
            text(
                """
                INSERT INTO EmployeeGoal (EmployeeId, SkillId, TargetDate, SetByEmployeeId, CreatedOn)
                VALUES (:employee_id, :skill_id, :target_date, :set_by_employee_id, NOW())
                RETURNING GoalId
                """
            ),
            {
                "employee_id": employee_id,
                "skill_id": skill_id,
                "target_date": target_date,
                "set_by_employee_id": set_by_employee_id,
            },
        )
        goal_id = result.scalar()
        db.session.commit()
        return {
            "goalId": goal_id,
            "employeeId": employee_id,
            "skillId": skill_id,
            "customSkillName": custom_skill_name or None,
            "targetDate": target_date,
            "setByEmployeeId": set_by_employee_id,
            "createdOn": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "message": "Goal created successfully",
            "status_code": 201,
        }

    @staticmethod
    def get_goals_for_employee(employee_id: str) -> List[Dict]:
        # Validate employee
        exists = db.session.execute(
            text("SELECT EmployeeId FROM Employee WHERE EmployeeId = :employee_id"),
            {"employee_id": employee_id},
        ).scalar()
        if not exists:
            raise ValueError(f"Employee {employee_id} not found")

        result = db.session.execute(
            text(
                """
                SELECT g.GoalId, g.EmployeeId, e.FirstName || ' ' || e.LastName AS EmployeeName,
                       g.SkillId, s.SkillName, g.TargetDate,
                       g.SetByEmployeeId, se.FirstName || ' ' || se.LastName AS SetByName,
                       CASE WHEN g.EmployeeId = g.SetByEmployeeId THEN 'self_' ELSE 'others_' END || s.SkillType AS GoalType
                FROM EmployeeGoal g
                JOIN Employee e ON g.EmployeeId = e.EmployeeId
                JOIN Skill s ON g.SkillId = s.SkillId
                JOIN Employee se ON g.SetByEmployeeId = se.EmployeeId
                WHERE g.EmployeeId = :employee_id OR g.SetByEmployeeId = :employee_id
                """
            ),
            {"employee_id": employee_id},
        )
        return [
            {
                "goalId": row[0],
                "employeeId": row[1],
                "employeeName": row[2],
                "skillId": row[3],
                "skillName": row[4],
                "targetDate": row[5].strftime("%Y-%m-%d") if row[5] else None,
                "setByEmployeeId": row[6],
                "setByName": row[7],
                "goalType": row[8],
            }
            for row in result.fetchall()
        ]

    @staticmethod
    def update_goal(goal_id: int, payload: Dict) -> None:
        skill_id = payload.get("skillId")
        custom_skill_name = payload.get("customSkillName")
        target_date = payload.get("targetDate")

        if not target_date:
            raise ValueError("Missing required field: targetDate")

        try:
            target_date_dt = datetime.strptime(target_date, "%Y-%m-%d")
            if target_date_dt <= datetime.now():
                raise ValueError("Target date must be in the future")
        except ValueError:
            raise ValueError("Invalid date format, use YYYY-MM-DD")

        exists = db.session.execute(
            text("SELECT GoalId FROM EmployeeGoal WHERE GoalId = :goal_id"),
            {"goal_id": goal_id},
        ).scalar()
        if not exists:
            raise ValueError(f"Goal {goal_id} not found")

        if custom_skill_name:
            result = db.session.execute(
                text(
                    "SELECT SkillId FROM Skill WHERE SkillName = :skill_name AND SkillType = 'Other'"
                ),
                {"skill_name": custom_skill_name},
            ).scalar()
            if not result:
                db.session.execute(
                    text(
                        "INSERT INTO Skill (SkillId, SkillName, SkillType) VALUES ((SELECT COALESCE(MAX(SkillId), 0) + 1 FROM Skill), :skill_name, 'Other')"
                    ),
                    {"skill_name": custom_skill_name},
                )
                skill_id = db.session.execute(text("SELECT MAX(SkillId) FROM Skill")).scalar()
            else:
                skill_id = result
        elif skill_id:
            result = db.session.execute(
                text("SELECT SkillId FROM Skill WHERE SkillId = :skill_id"),
                {"skill_id": skill_id},
            ).scalar()
            if not result:
                raise ValueError(f"Skill {skill_id} not found")

        db.session.execute(
            text(
                """UPDATE EmployeeGoal
                SET SkillId = :skill_id, TargetDate = :target_date
                WHERE GoalId = :goal_id"""
            ),
            {"skill_id": skill_id, "target_date": target_date, "goal_id": goal_id},
        )
        db.session.commit()

    @staticmethod
    def delete_goal(goal_id: int) -> None:
        exists = db.session.execute(
            text("SELECT GoalId FROM EmployeeGoal WHERE GoalId = :goal_id"),
            {"goal_id": goal_id},
        ).scalar()
        if not exists:
            raise ValueError(f"Goal {goal_id} not found")

        db.session.execute(
            text("DELETE FROM EmployeeGoal WHERE GoalId = :goal_id"),
            {"goal_id": goal_id},
        )
        db.session.commit()
