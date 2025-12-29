import uuid
from datetime import datetime
from typing import Dict, List

from sqlalchemy import text

from .. import db


class ReviewService:
    """Service for skill review, statuses, and employee skills for evaluators."""

    @staticmethod
    def get_assigned_employees_skills() -> List[Dict]:
        result = db.session.execute(
            text(
                """
                SELECT e.EmployeeId, e.FirstName, e.LastName,
                       es.SkillId,
                       COALESCE(es.SkillLevel, 'Secondary') AS SkillLevel,
                       es.SelfEvaluation, es.isReady,
                       s.SkillName,
                       r.EvaluatorId AS ReviewedById,
                       COALESCE(e2.FirstName || ' ' || e2.LastName, '') AS ReviewedByName,
                       r.Status
                FROM Employee e
                LEFT JOIN EmployeeSkill es ON e.EmployeeId = es.EmployeeId
                LEFT JOIN Skill s ON es.SkillId = s.SkillId
                LEFT JOIN EmployeeSkillReview r ON r.EmployeeId = e.EmployeeId AND r.SkillId = es.SkillId
                LEFT JOIN Employee e2 ON e2.EmployeeId = r.EvaluatorId
                WHERE EXISTS (
                    SELECT 1 FROM EmployeeEvaluators ee
                    WHERE ee.EmpId = e.EmployeeId
                )
                """
            )
        )

        employees: Dict[str, Dict] = {}
        for row in result:
            emp_id = row.EmployeeId
            if emp_id not in employees:
                employees[emp_id] = {
                    "EmployeeId": emp_id,
                    "Name": f"{row.FirstName or ''} {row.LastName or ''}".strip(),
                    "Skills": {"Primary": [], "Secondary": [], "CrossTechSkill": []},
                }

            skill_level = row.SkillLevel
            if skill_level in ["Primary", "Secondary", "CrossTechSkill"]:
                employees[emp_id]["Skills"][skill_level].append(
                    {
                        "SkillLevel": skill_level,
                        "SkillName": row.SkillName or "Unknown",
                        "SkillId": row.SkillId,
                        "SelfEvaluation": float(row.SelfEvaluation)
                        if row.SelfEvaluation
                        else 0.0,
                        "isReady": bool(row.isReady),
                        "reviewedBy":
                            {
                                "id": row.ReviewedById,
                                "name": row.ReviewedByName,
                            }
                            if row.ReviewedById
                            else None,
                        "Status": row.Status or "Available",
                    }
                )
        return list(employees.values())

    @staticmethod
    def get_skill_statuses(employee_id: str) -> List[Dict]:
        result = db.session.execute(
            text(
                """
                SELECT r.ReviewId, r.EmployeeId, r.SkillId, r.EvaluatorId,
                       r.EvaluatorScore, r.Comments, r.IsReady, r.Status, r.ReviewDate,
                       COALESCE(e.FirstName || ' ' || e.LastName, '') AS EvaluatorName,
                       s.SkillName, r.IsNew,
                       es.SelfEvaluation, es.SkillLevel
                FROM EmployeeSkillReview r
                JOIN Skill s ON s.SkillId = r.SkillId
                LEFT JOIN Employee e ON e.EmployeeId = r.EvaluatorId
                LEFT JOIN EmployeeSkill es ON es.EmployeeId = r.EmployeeId AND es.SkillId = r.SkillId
                WHERE r.EmployeeId = :employee_id
                """
            ),
            {"employee_id": employee_id},
        ).fetchall()

        return [
            {
                "ReviewId": row.ReviewId,
                "EmployeeId": row.EmployeeId,
                "SkillId": row.SkillId,
                "EvaluatorId": row.EvaluatorId,
                "EvaluatorScore": float(row.EvaluatorScore)
                if row.EvaluatorScore
                else 0.0,
                "Comments": row.Comments,
                "IsReady": bool(row.IsReady),
                "Status": row.Status,
                "ReviewDate": row.ReviewDate.isoformat() if row.ReviewDate else None,
                "EvaluatorName": row.EvaluatorName,
                "SkillName": row.SkillName,
                "IsNew": bool(row.IsNew),
                "SelfEvaluation": float(row.SelfEvaluation)
                if row.SelfEvaluation
                else 0.0,
                "SkillLevel": row.SkillLevel,
            }
            for row in result
        ]

    @staticmethod
    def save_review(payload: Dict) -> Dict:
        employee_id = payload.get("employeeId")
        skill_id = payload.get("skillId")
        evaluator_id = payload.get("evaluatorId")
        evaluator_score = payload.get("evaluatorScore")
        comments = payload.get("comments", "")
        is_ready = payload.get("isReady", False)
        review_id = payload.get("reviewId")

        if not all([employee_id, skill_id, evaluator_id]):
            raise ValueError("Missing required fields")
        if evaluator_score is None or not (0 <= evaluator_score <= 5):
            raise ValueError("Evaluator score must be between 0 and 5")

        exists_check = db.session.execute(
            text(
                """SELECT 1 FROM EmployeeEvaluators
                WHERE EmpId = :employee_id AND EvaluatorId = :evaluator_id"""
            ),
            {"employee_id": employee_id, "evaluator_id": evaluator_id},
        ).fetchone()
        if not exists_check:
            raise PermissionError("Evaluator not assigned to employee")

        existing_review = db.session.execute(
            text(
                """SELECT ReviewId, EvaluatorId
                FROM EmployeeSkillReview
                WHERE EmployeeId = :employee_id AND SkillId = :skill_id"""
            ),
            {"employee_id": employee_id, "skill_id": skill_id},
        ).fetchone()

        evaluator_name = db.session.execute(
            text(
                """SELECT FirstName || ' ' || LastName AS EvaluatorName
                FROM Employee WHERE EmployeeId = :evaluator_id"""
            ),
            {"evaluator_id": evaluator_id},
        ).fetchone().EvaluatorName

        if existing_review:
            db.session.execute(
                text(
                    """UPDATE EmployeeSkillReview
                    SET EvaluatorId = :evaluator_id,
                        EvaluatorScore = :evaluator_score,
                        Comments = :comments,
                        IsReady = :is_ready,
                        Status = 'Reviewed',
                        ReviewDate = NOW()
                    WHERE ReviewId = :review_id AND EmployeeId = :employee_id AND SkillId = :skill_id"""
                ),
                {
                    "review_id": existing_review.ReviewId,
                    "employee_id": employee_id,
                    "skill_id": skill_id,
                    "evaluator_id": evaluator_id,
                    "evaluator_score": evaluator_score,
                    "comments": comments,
                    "is_ready": is_ready,
                },
            )
            review_id = existing_review.ReviewId
        else:
            review_id = str(uuid.uuid4())
            db.session.execute(
                text(
                    """INSERT INTO EmployeeSkillReview
                    (ReviewId, EmployeeId, SkillId, EvaluatorId, EvaluatorScore, Comments, IsReady, Status, ReviewDate, IsNew)
                    VALUES (:review_id, :employee_id, :skill_id, :evaluator_id, :evaluator_score, :comments, :is_ready, 'Reviewed', NOW(), 0)"""
                ),
                {
                    "review_id": review_id,
                    "employee_id": employee_id,
                    "skill_id": skill_id,
                    "evaluator_id": evaluator_id,
                    "evaluator_score": evaluator_score,
                    "comments": comments,
                    "is_ready": is_ready,
                },
            )

        db.session.commit()
        return {"reviewId": review_id, "evaluatorName": evaluator_name}

    @staticmethod
    def add_employee_skill(payload: Dict) -> Dict:
        employee_id = payload.get("employeeId")
        skill_name = payload.get("skillName")
        skill_type = payload.get("skillType")
        self_score = payload.get("selfScore", 1)
        is_ready = payload.get("isReady", False)
        evaluator_id = payload.get("evaluatorId")

        if not all([employee_id, skill_name, skill_type, evaluator_id]):
            raise ValueError("Missing required fields")
        if skill_type not in ["Primary", "Secondary", "CrossTechSkill"]:
            raise ValueError("Invalid skill type")

        exists_check = db.session.execute(
            text(
                """SELECT 1 FROM EmployeeEvaluators
                WHERE EmpId = :employee_id AND EvaluatorId = :evaluator_id"""
            ),
            {"employee_id": employee_id, "evaluator_id": evaluator_id},
        ).fetchone()
        if not exists_check:
            raise PermissionError("Evaluator not assigned to employee")

        existing_skill = db.session.execute(
            text("SELECT SkillId FROM Skill WHERE SkillName = :skill_name"),
            {"skill_name": skill_name},
        ).fetchone()
        if existing_skill:
            skill_id = existing_skill.SkillId
        else:
            skill_id = str(uuid.uuid4())
            db.session.execute(
                text(
                    """INSERT INTO Skill (SkillId, SkillName)
                    VALUES (:skill_id, :skill_name)"""
                ),
                {"skill_id": skill_id, "skill_name": skill_name},
            )

        skill_exists = db.session.execute(
            text(
                """SELECT 1 FROM EmployeeSkill
                WHERE EmployeeId = :employee_id AND SkillId = :skill_id"""
            ),
            {"employee_id": employee_id, "skill_id": skill_id},
        ).fetchone()
        if skill_exists:
            raise ValueError(f"Skill {skill_name} already assigned to employee")

        db.session.execute(
            text(
                """INSERT INTO EmployeeSkill (EmployeeId, SkillId, SkillLevel, SelfEvaluation, isReady)
                VALUES (:employee_id, :skill_id, :skill_type, :self_score, :is_ready)"""
            ),
            {
                "employee_id": employee_id,
                "skill_id": skill_id,
                "skill_type": skill_type,
                "self_score": self_score,
                "is_ready": is_ready,
            },
        )

        # Initial review with IsNew = true (mirroring Phase2 behavior)
        review_id = str(uuid.uuid4())
        db.session.execute(
            text(
                """INSERT INTO EmployeeSkillReview
                (ReviewId, EmployeeId, SkillId, EvaluatorId, EvaluatorScore, Comments, IsReady, Status, ReviewDate, IsNew)
                VALUES (:review_id, :employee_id, :skill_id, :evaluator_id, :self_score, '', :is_ready, 'Reviewed', NOW(), 1)"""
            ),
            {
                "review_id": review_id,
                "employee_id": employee_id,
                "skill_id": skill_id,
                "evaluator_id": evaluator_id,
                "self_score": self_score,
                "is_ready": is_ready,
            },
        )

        db.session.commit()
        return {"skillId": skill_id}

    @staticmethod
    def update_skill_score(payload: Dict) -> None:
        employee_id = payload.get("employeeId")
        skill_id = payload.get("skillId")
        self_score = payload.get("selfScore")
        is_ready = payload.get("isReady", False)
        evaluator_id = payload.get("evaluatorId")

        if not all([employee_id, skill_id, self_score, evaluator_id]):
            raise ValueError("Missing required fields")
        if not (0 <= self_score <= 5):
            raise ValueError("Self score must be between 0 and 5")

        exists_check = db.session.execute(
            text(
                """SELECT 1 FROM EmployeeEvaluators
                WHERE EmpId = :employee_id AND EvaluatorId = :evaluator_id"""
            ),
            {"employee_id": employee_id, "evaluator_id": evaluator_id},
        ).fetchone()
        if not exists_check:
            raise PermissionError("Evaluator not assigned to employee")

        skill_exists = db.session.execute(
            text(
                """SELECT 1 FROM EmployeeSkill
                WHERE EmployeeId = :employee_id AND SkillId = :skill_id"""
            ),
            {"employee_id": employee_id, "skill_id": skill_id},
        ).fetchone()
        if not skill_exists:
            raise ValueError("Skill not found for employee")

        db.session.execute(
            text(
                """UPDATE EmployeeSkill
                SET SelfEvaluation = :self_score,
                    isReady = :is_ready
                WHERE EmployeeId = :employee_id AND SkillId = :skill_id"""
            ),
            {
                "employee_id": employee_id,
                "skill_id": skill_id,
                "self_score": self_score,
                "is_ready": is_ready,
            },
        )
        db.session.commit()

    @staticmethod
    def get_master_skills() -> List[Dict]:
        result = db.session.execute(
            text("SELECT SkillId, SkillName FROM Skill WHERE is_master_skill = 1")
        ).fetchall()
        return [
            {"SkillId": row.SkillId, "SkillName": row.SkillName}
            for row in result
        ]
