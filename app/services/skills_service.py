from datetime import datetime

from sqlalchemy import text

from .. import db


class SkillsService:
    """Service class for employee skills operations, migrated from Phase 2 app.py."""

    @staticmethod
    def get_employee_skills_overview(limit: int = 1000):
        """Return a basic list of employees with core details (Phase 2 get_employee_skills)."""
        query = text(
            """
            SELECT
                EmployeeId, FirstName, MiddleName, LastName,
                DateOfBirth, ContactNumber, EmergencyContactNumber,
                EmergencyContactPerson, EmergencyContactRelation,
                Email, Gender, BloodGroup, DateOfJoining, CTC,
                TeamLeadId, HighestQualification, EmploymentStatus,
                PersonalEmail, SubRole, LobLead, IsLead
            FROM Employee
            LIMIT :limit
            """
        )
        result = db.session.execute(query, {"limit": limit})
        return [dict(row) for row in result.mappings()]

    @staticmethod
    def add_or_update_skills(payload: dict):
        """Add or update multiple skills for an employee (Phase 2 add_or_update_skills)."""
        if not payload:
            raise ValueError("Request body is required")

        employee_id = payload.get("EmployeeId")
        skills = payload.get("skills", [])
        qualification_year_month = payload.get("QualificationYearMonth")
        full_stack_ready = payload.get("FullStackReady", 0)

        if not employee_id or not skills:
            raise ValueError("EmployeeId and skills are required")

        if qualification_year_month:
            try:
                datetime.strptime(qualification_year_month, "%Y-%m-%d")
            except ValueError:
                raise ValueError("Invalid QualificationYearMonth format. Expected YYYY-MM.")

        # Update QualificationYearMonth on Employee
        if qualification_year_month:
            db.session.execute(
                text(
                    """
                    UPDATE Employee
                    SET QualificationYearMonth = :qualification_year_month
                    WHERE EmployeeId = :employee_id
                    """
                ),
                {
                    "qualification_year_month": qualification_year_month,
                    "employee_id": employee_id,
                },
            )

        # Update FullStackReady on Employee
        db.session.execute(
            text(
                """
                UPDATE Employee
                SET FullStackReady = :full_stack_ready
                WHERE EmployeeId = :employee_id
                """
            ),
            {"full_stack_ready": full_stack_ready, "employee_id": employee_id},
        )

        # Upsert skills
        for skill in skills:
            skill_id = skill.get("SkillId")
            skill_level = skill.get("SkillLevel")
            is_ready = skill.get("isReady", 0)
            is_ready_date = skill.get("isReadyDate")
            self_evaluation = skill.get("SelfEvaluation")

            if not skill_id or not skill_level:
                raise ValueError("Each skill must have SkillId and SkillLevel")

            if is_ready_date:
                try:
                    if len(is_ready_date) == 10 and is_ready_date.count("-") == 2:
                        datetime.strptime(is_ready_date, "%Y-%m-%d")
                    else:
                        is_ready_date = datetime.strptime(
                            is_ready_date,
                            "%a, %d %b %Y %H:%M:%S GMT",
                        ).strftime("%Y-%m-%d")
                except ValueError:
                    raise ValueError(f"Invalid date format: {is_ready_date}")
            else:
                is_ready_date = datetime.utcnow().strftime("%Y-%m-%d")

            # Check if the skill already exists
            exists = db.session.execute(
                text(
                    """
                    SELECT COUNT(*) FROM EmployeeSkill
                    WHERE EmployeeId = :employee_id AND SkillId = :skill_id
                    """
                ),
                {"employee_id": employee_id, "skill_id": skill_id},
            ).scalar()

            if exists and exists > 0:
                # Update existing
                db.session.execute(
                    text(
                        """
                        UPDATE EmployeeSkill
                        SET SkillLevel = :skill_level,
                            isReady = :is_ready,
                            isReadyDate = :is_ready_date,
                            SelfEvaluation = :self_evaluation
                        WHERE EmployeeId = :employee_id AND SkillId = :skill_id
                        """
                    ),
                    {
                        "employee_id": employee_id,
                        "skill_id": skill_id,
                        "skill_level": skill_level,
                        "is_ready": is_ready,
                        "is_ready_date": is_ready_date,
                        "self_evaluation": self_evaluation,
                    },
                )
            else:
                # Insert new
                db.session.execute(
                    text(
                        """
                        INSERT INTO EmployeeSkill (
                            EmployeeId, SkillId, SkillLevel, isReady, isReadyDate, SelfEvaluation
                        )
                        VALUES (:employee_id, :skill_id, :skill_level, :is_ready, :is_ready_date, :self_evaluation)
                        """
                    ),
                    {
                        "employee_id": employee_id,
                        "skill_id": skill_id,
                        "skill_level": skill_level,
                        "is_ready": is_ready,
                        "is_ready_date": is_ready_date,
                        "self_evaluation": self_evaluation,
                    },
                )

        db.session.commit()

    @staticmethod
    def get_employee_skills_for_employee(employee_id: str):
        """Fetch skills and qualification info for a single employee (Phase 2 get_employee_skills/<id>)."""
        query = text(
            """
            SELECT e.EmployeeId, e.QualificationYearMonth, e.FullStackReady,
                   es.SkillId, es.SkillLevel, es.SelfEvaluation,
                   s.SkillName, es.isReady, es.isReadyDate
            FROM Employee e
            LEFT JOIN EmployeeSkill es ON e.EmployeeId = es.EmployeeId
            LEFT JOIN Skill s ON es.SkillId = s.SkillId
            WHERE e.EmployeeId = :employee_id
            """
        )
        result = db.session.execute(query, {"employee_id": employee_id})

        rows = result.fetchall()
        skills = []
        qualification_year_month = None
        full_stack_ready = None

        for row in rows:
            row_dict = dict(zip(result.keys(), row))

            if qualification_year_month is None:
                qualification_year_month = row_dict.pop("QualificationYearMonth", None)

            if full_stack_ready is None:
                full_stack_ready = row_dict.pop("FullStackReady", None)

            if row_dict.get("SkillId"):
                skills.append(
                    {
                        "SkillId": row_dict["SkillId"],
                        "SkillLevel": row_dict["SkillLevel"],
                        "SkillName": row_dict["SkillName"],
                        "isReady": int(row_dict["isReady"]),
                        "isReadyDate": row_dict["isReadyDate"],
                        "SelfEvaluation": row_dict["SelfEvaluation"],
                    }
                )

        return {
            "EmployeeId": employee_id,
            "QualificationYearMonth": qualification_year_month,
            "FullStackReady": full_stack_ready,
            "skills": skills,
        }

    @staticmethod
    def get_employees_with_skills():
        """Fetch employees and group their skills by Primary/Secondary/CrossTech (Phase 2 /api/employees)."""
        query = text(
            """
            SELECT
                e.EmployeeId, e.FirstName, e.LastName, e.DateOfJoining,
                e.TeamLeadId, e.SubRole, e.LobLead, e.IsLead, e.FullStackReady,
                es.SkillId, s.SkillName, es.SkillLevel, es.isReady, es.isReadyDate, es.SelfEvaluation
            FROM Employee e
            LEFT JOIN EmployeeSkill es ON e.EmployeeId = es.EmployeeId
            LEFT JOIN Skill s ON es.SkillId = s.SkillId
            """
        )

        result = db.session.execute(query)
        employees_dict = {}

        for row in result.mappings():
            emp_id = row["EmployeeId"]
            if emp_id not in employees_dict:
                employees_dict[emp_id] = {
                    "EmployeeId": emp_id,
                    "FirstName": row["FirstName"],
                    "LastName": row["LastName"],
                    "DateOfJoining": row["DateOfJoining"].strftime("%a, %d %b %Y %H:%M:%S GMT") if row["DateOfJoining"] else None,
                    "TeamLeadId": row["TeamLeadId"],
                    "SubRole": row["SubRole"],
                    "LobLead": row["LobLead"],
                    "IsLead": row["IsLead"],
                    "FullStackReady": bool(row["FullStackReady"]),
                    "Skills": {"Primary": [], "Secondary": [], "CrossTechSkill": []},
                }

            skill_level = row["SkillLevel"]
            skill_entry = {
                "SkillId": row["SkillId"],
                "SkillName": row["SkillName"],
                "isReady": row["isReady"],
                "isReadyDate": row["isReadyDate"],
                "SelfEvaluation": row["SelfEvaluation"],
            }

            if not row["SkillId"]:
                continue

            if skill_level == "Primary":
                employees_dict[emp_id]["Skills"]["Primary"].append(skill_entry)
            elif skill_level == "Secondary":
                employees_dict[emp_id]["Skills"]["Secondary"].append(skill_entry)
            elif skill_level == "Cross Tech Skill":
                employees_dict[emp_id]["Skills"]["CrossTechSkill"].append(skill_entry)

        return list(employees_dict.values())
