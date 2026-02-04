from datetime import datetime

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .. import db
from ..models.hr import Employee, EmployeeSkill, MasterSkill
from ..utils.logger import Logger


class SkillsService:
    """Service class for employee skills operations, migrated from Phase 2 app.py."""

    @staticmethod
    def get_employee_skills_overview(limit: int = 1000):
        """Return a basic list of employees with core details using ORM."""
        Logger.info("Retrieving employee skills overview", limit=limit)
        try:
            # Use SQLAlchemy ORM
            employees = Employee.query.limit(limit).all()
            
            result = [
                {
                    "EmployeeId": emp.employee_id,
                    "FirstName": emp.first_name,
                    "MiddleName": emp.middle_name,
                    "LastName": emp.last_name,
                    "DateOfBirth": emp.date_of_birth,
                    "ContactNumber": emp.contact_number,
                    "EmergencyContactNumber": emp.emergency_contact_number,
                    "EmergencyContactPerson": emp.emergency_contact_person,
                    "EmergencyContactRelation": emp.emergency_contact_relation,
                    "Email": emp.email,
                    "Gender": emp.gender,
                    "BloodGroup": emp.blood_group,
                    "DateOfJoining": emp.date_of_joining,
                    "CTC": emp.ctc,
                    "TeamLeadId": emp.team_lead_id,
                    "HighestQualification": emp.highest_qualification,
                    "EmploymentStatus": emp.employment_status,
                    "PersonalEmail": emp.personal_email,
                    "SubRole": emp.sub_role,
                    "LobLead": emp.lob_lead,
                    "IsLead": emp.is_lead,
                }
                for emp in employees
            ]
            Logger.debug("Employee skills overview retrieved", count=len(result))
            return result
        except SQLAlchemyError as se:
            Logger.error("Database error retrieving employee skills overview",
                        error=str(se))
            raise
        except Exception as e:
            Logger.error("Error retrieving employee skills overview",
                        error=str(e))
            raise

    @staticmethod
    def add_or_update_skills(payload: dict):
        """Add or update multiple skills for an employee using ORM."""
        Logger.info("Adding or updating employee skills")
        
        try:
            if not payload:
                Logger.warning("Empty payload for add_or_update_skills")
                raise ValueError("Request body is required")

            employee_id = payload.get("EmployeeId")
            skills = payload.get("skills", [])
            qualification_year_month = payload.get("QualificationYearMonth")
            full_stack_ready = payload.get("FullStackReady", 0)

            if not employee_id:
                Logger.warning("Missing employee_id",
                             employee_id_present=bool(employee_id))
                raise ValueError("EmployeeId is required")

            if qualification_year_month:
                try:
                    datetime.strptime(qualification_year_month, "%Y-%m-%d")
                except ValueError:
                    Logger.warning("Invalid qualification date format",
                                 qualification_year_month=qualification_year_month)
                    raise ValueError("Invalid QualificationYearMonth format. Expected YYYY-MM.")

            # Get employee using ORM
            employee = Employee.query.filter_by(employee_id=employee_id).first()
            if not employee:
                Logger.warning("Employee not found", employee_id=employee_id)
                raise ValueError(f"Employee {employee_id} not found")

            # Update QualificationYearMonth on Employee using ORM
            if qualification_year_month:
                employee.qualification_year_month = qualification_year_month

            # Update FullStackReady on Employee using ORM
            employee.full_stack_ready = full_stack_ready

            # Upsert skills using ORM
            for skill in skills:
                skill_id = skill.get("SkillId")
                skill_level = skill.get("SkillLevel") # This is now Proficiency (Beginner, Intermediate, Expert)
                skill_category = skill.get("SkillCategory") # This is now Category (Primary, Secondary, Cross Tech)
                is_ready = skill.get("isReady", 0)
                is_ready_date = skill.get("isReadyDate")
                self_evaluation = skill.get("SelfEvaluation")

                if not skill_id:
                    Logger.warning("Skill missing required fields",
                                 skill_id_present=bool(skill_id))
                    raise ValueError("Each skill must have SkillId")

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
                        Logger.warning("Invalid date format for isReadyDate",
                                     is_ready_date=is_ready_date)
                        raise ValueError(f"Invalid date format: {is_ready_date}")
                else:
                    is_ready_date = datetime.utcnow().strftime("%Y-%m-%d")

                # Check if the skill already exists using ORM
                existing_emp_skill = EmployeeSkill.query.filter_by(
                    employee_id=employee_id,
                    skill_id=skill_id
                ).first()

                if existing_emp_skill:
                    # Update existing using ORM
                    existing_emp_skill.skill_level = skill_level
                    existing_emp_skill.skill_category = skill_category
                    existing_emp_skill.is_ready = is_ready
                    existing_emp_skill.is_ready_date = is_ready_date
                    existing_emp_skill.self_evaluation = self_evaluation
                    Logger.debug("Updated existing skill",
                               employee_id=employee_id,
                               skill_id=skill_id)
                else:
                    # Insert new using ORM
                    new_emp_skill = EmployeeSkill(
                        employee_id=employee_id,
                        skill_id=skill_id,
                        skill_level=skill_level,
                        skill_category=skill_category,
                        is_ready=is_ready,
                        is_ready_date=is_ready_date,
                        self_evaluation=self_evaluation
                    )
                    db.session.add(new_emp_skill)
                    Logger.debug("Added new skill",
                               employee_id=employee_id,
                               skill_id=skill_id)

            # --- DELETION LOGIC STARTS HERE ---
            # 1. Get all current skill IDs from DB for this employee
            current_db_skills = db.session.query(EmployeeSkill.skill_id)\
                .filter_by(employee_id=employee_id).all()
            current_db_skill_ids = {s.skill_id for s in current_db_skills}
            
            # 2. Get all skill IDs from the payload
            payload_skill_ids = {s.get("SkillId") for s in skills if s.get("SkillId")}
            
            # 3. Find IDs that are in DB but NOT in payload
            ids_to_delete = current_db_skill_ids - payload_skill_ids
            
            if ids_to_delete:
                Logger.info("Deleting removed skills", employee_id=employee_id, count=len(ids_to_delete))
                EmployeeSkill.query.filter(
                    EmployeeSkill.employee_id == employee_id,
                    EmployeeSkill.skill_id.in_(ids_to_delete)
                ).delete(synchronize_session=False)
            # --- DELETION LOGIC ENDS HERE ---

            db.session.commit()
            Logger.info("Employee skills updated successfully",
                       employee_id=employee_id,
                       skill_count=len(skills))
                       
        except ValueError:
            db.session.rollback()
            raise
        except SQLAlchemyError as se:
            db.session.rollback()
            Logger.error("Database error updating employee skills",
                        error=str(se))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating employee skills",
                        error=str(e))
            raise

    @staticmethod
    def get_employee_skills_for_employee(employee_id: str):
        """Fetch skills and qualification info for a single employee using ORM."""
        Logger.info("Retrieving skills for employee", employee_id=employee_id)
        
        try:
            # Get employee with skills using ORM JOIN
            employee = Employee.query.filter_by(employee_id=employee_id).first()
            
            if not employee:
                Logger.debug("Employee not found, returning empty skills",
                           employee_id=employee_id)
                return {
                    "EmployeeId": employee_id,
                    "QualificationYearMonth": None,
                    "FullStackReady": None,
                    "skills": [],
                }

            # Get skills with JOIN using ORM
            employee_skills = db.session.query(
                EmployeeSkill.skill_id,
                EmployeeSkill.skill_level,
                EmployeeSkill.skill_category,
                EmployeeSkill.self_evaluation,
                MasterSkill.skill_name,
                EmployeeSkill.is_ready,
                EmployeeSkill.is_ready_date
            ).join(
                MasterSkill,
                EmployeeSkill.skill_id == MasterSkill.skill_id
            ).filter(
                EmployeeSkill.employee_id == employee_id
            ).all()

            skills = []
            for skill_row in employee_skills:
                # Compatibility logic for legacy data
                # If skill_category is missing and skill_level contains a category keyword
                s_level = skill_row.skill_level
                s_category = skill_row.skill_category
                
                if not s_category and s_level in ["Primary", "Secondary", "Cross Tech Skill"]:
                    s_category = s_level
                    s_level = None # Reset level so user can select Proficiency cleanly
                
                skills.append(
                    {
                        "SkillId": skill_row.skill_id,
                        "SkillLevel": s_level, # Proficiency
                        "SkillCategory": s_category, # Category
                        "SkillName": skill_row.skill_name,
                        "isReady": int(skill_row.is_ready) if skill_row.is_ready else 0,
                        "isReadyDate": skill_row.is_ready_date,
                        "SelfEvaluation": skill_row.self_evaluation,
                    }
                )

            result = {
                "EmployeeId": employee_id,
                "QualificationYearMonth": employee.qualification_year_month,
                "FullStackReady": employee.full_stack_ready,
                "skills": skills,
            }
            Logger.debug("Employee skills retrieved",
                       employee_id=employee_id,
                       skill_count=len(skills))
            return result
            
        except SQLAlchemyError as se:
            Logger.error("Database error retrieving employee skills",
                        employee_id=employee_id,
                        error=str(se))
            raise
        except Exception as e:
            Logger.error("Error retrieving employee skills",
                        employee_id=employee_id,
                        error=str(e))
            raise

    @staticmethod
    def get_employees_with_skills():
        """Fetch employees and group their skills by Primary/Secondary/CrossTech using ORM."""
        Logger.info("Retrieving all employees with skills")
        
        try:
            # Use ORM query with LEFT JOIN
            results = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.last_name,
                Employee.date_of_joining,
                Employee.team_lead_id,
                Employee.sub_role,
                Employee.lob_lead,
                Employee.is_lead,
                Employee.full_stack_ready,
                EmployeeSkill.skill_id,
                MasterSkill.skill_name,
                EmployeeSkill.skill_level,
                EmployeeSkill.skill_category,
                EmployeeSkill.is_ready,
                EmployeeSkill.is_ready_date,
                EmployeeSkill.self_evaluation
            ).outerjoin(
                EmployeeSkill,
                Employee.employee_id == EmployeeSkill.employee_id
            ).outerjoin(
                MasterSkill,
                EmployeeSkill.skill_id == MasterSkill.skill_id
            ).all()

            employees_dict = {}

            for row in results:
                emp_id = row.employee_id
                if emp_id not in employees_dict:
                    employees_dict[emp_id] = {
                        "EmployeeId": emp_id,
                        "FirstName": row.first_name,
                        "LastName": row.last_name,
                        "DateOfJoining": row.date_of_joining.strftime("%a, %d %b %Y %H:%M:%S GMT") if row.date_of_joining else None,
                        "TeamLeadId": row.team_lead_id,
                        "SubRole": row.sub_role,
                        "LobLead": row.lob_lead,
                        "IsLead": row.is_lead,
                        "FullStackReady": bool(row.full_stack_ready),
                        "Skills": {"Primary": [], "Secondary": [], "CrossTechSkill": []},
                    }

                skill_category = row.skill_category # Use category for grouping
                skill_entry = {
                    "SkillId": row.skill_id,
                    "SkillName": row.skill_name,
                    "SkillLevel": row.skill_level, # Proficiency
                    "isReady": row.is_ready,
                    "isReadyDate": row.is_ready_date,
                    "SelfEvaluation": row.self_evaluation,
                }

                if not row.skill_id:
                    continue

                if skill_category == "Primary":
                    employees_dict[emp_id]["Skills"]["Primary"].append(skill_entry)
                elif skill_category == "Secondary":
                    employees_dict[emp_id]["Skills"]["Secondary"].append(skill_entry)
                elif skill_category == "Cross Tech Skill":
                    employees_dict[emp_id]["Skills"]["CrossTechSkill"].append(skill_entry)
                # Fallback for old data or mismatches - maybe assume Primary or just ignore?
                # For now let's also check old style if category is empty
                elif not skill_category and row.skill_level in ["Primary", "Secondary", "Cross Tech Skill"]:
                     if row.skill_level == "Primary":
                        employees_dict[emp_id]["Skills"]["Primary"].append(skill_entry)
                     elif row.skill_level == "Secondary":
                        employees_dict[emp_id]["Skills"]["Secondary"].append(skill_entry)
                     elif row.skill_level == "Cross Tech Skill":
                        employees_dict[emp_id]["Skills"]["CrossTechSkill"].append(skill_entry)
                        
            result = list(employees_dict.values())
            Logger.info("Employees with skills retrieved", employee_count=len(result))
            return result
            
        except SQLAlchemyError as se:
            Logger.error("Database error retrieving employees with skills",
                        error=str(se))
            raise
        except Exception as e:
            Logger.error("Error retrieving employees with skills",
                        error=str(e))
            raise

