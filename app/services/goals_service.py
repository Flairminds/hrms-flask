from datetime import datetime
from typing import Dict, List

from sqlalchemy import text, func, case

from .. import db
from ..models.hr import Employee, EmployeeGoal, MasterSkill, LeadAssignedByHR
from ..utils.logger import Logger

class GoalsService:
    """Service for employee goal setting and retrieval."""

    @staticmethod
    def create_goal(payload: Dict) -> Dict:
        """Creates a new employee goal using ORM."""
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

        # Resolve / create skill using ORM
        if custom_skill_name:
            existing_skill = MasterSkill.query.filter_by(
                skill_name=custom_skill_name,
                skill_type='Other'
            ).first()
            
            if not existing_skill:
                # Get max skill_id and create new skill
                max_skill_id = db.session.query(func.max(MasterSkill.skill_id)).scalar() or 0
                new_skill = MasterSkill(
                    skill_id=max_skill_id + 1,
                    skill_name=custom_skill_name,
                    skill_type='Other'
                )
                db.session.add(new_skill)
                db.session.flush()
                skill_id = new_skill.skill_id
            else:
                skill_id = existing_skill.skill_id
        else:
            # Validate existing skill using ORM
            existing_skill = MasterSkill.query.filter_by(skill_id=skill_id).first()
            if not existing_skill:
                raise ValueError(f"Skill {skill_id} not found")

        # Check for existing goal using ORM
        existing_goal = EmployeeGoal.query.filter_by(
            employee_id=employee_id,
            skill_id=skill_id
        ).first()

        if existing_goal:
            existing_target_date = existing_goal.target_date
            if target_date_dt > existing_target_date:
                existing_goal.target_date = target_date_dt
                db.session.commit()
                return {
                    "goalId": existing_goal.goal_id,
                    "employeeId": employee_id,
                    "skillId": skill_id,
                    "customSkillName": custom_skill_name or None,
                    "targetDate": target_date,
                    "setByEmployeeId": set_by_employee_id,
                    "createdOn": existing_goal.created_on.strftime("%Y-%m-%dT%H:%M:%S"),
                    "message": "Goal target date updated successfully",
                    "status_code": 200,
                }
            raise ValueError(
                "A goal for this skill already exists with a later or same target date"
            )

        # Insert new goal using ORM
        new_goal = EmployeeGoal(
            employee_id=employee_id,
            skill_id=skill_id,
            target_date=target_date_dt,
            set_by_employee_id=set_by_employee_id,
            created_on=datetime.now()
        )
        db.session.add(new_goal)
        db.session.flush()
        goal_id = new_goal.goal_id
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
        """Retrieves goals for an employee using ORM with complex JOIN."""
        # Validate employee using ORM
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            raise ValueError(f"Employee {employee_id} not found")

        # Create aliases for employee joins
        EmployeeAlias = db.aliased(Employee)
        SetByAlias = db.aliased(Employee)

        # Complex query using ORM
        results = db.session.query(
            EmployeeGoal.goal_id,
            EmployeeGoal.employee_id,
            (EmployeeAlias.first_name + ' ' + EmployeeAlias.last_name).label('employee_name'),
            EmployeeGoal.skill_id,
            MasterSkill.skill_name,
            EmployeeGoal.target_date,
            EmployeeGoal.set_by_employee_id,
            (SetByAlias.first_name + ' ' + SetByAlias.last_name).label('set_by_name'),
            case(
                (EmployeeGoal.employee_id == EmployeeGoal.set_by_employee_id, 'self_'),
                else_='others_'
            ).concat(MasterSkill.skill_type).label('goal_type')
        ).join(
            EmployeeAlias,
            EmployeeGoal.employee_id == EmployeeAlias.employee_id
        ).join(
            MasterSkill,
            EmployeeGoal.skill_id == MasterSkill.skill_id
        ).join(
            SetByAlias,
            EmployeeGoal.set_by_employee_id == SetByAlias.employee_id
        ).filter(
            (EmployeeGoal.employee_id == employee_id) |
            (EmployeeGoal.set_by_employee_id == employee_id)
        ).all()

        return [
            {
                "goalId": row.goal_id,
                "employeeId": row.employee_id,
                "employeeName": row.employee_name,
                "skillId": row.skill_id,
                "skillName": row.skill_name,
                "targetDate": row.target_date.strftime("%Y-%m-%d") if row.target_date else None,
                "setByEmployeeId": row.set_by_employee_id,
                "setByName": row.set_by_name,
                "goalType": row.goal_type,
            }
            for row in results
        ]

    @staticmethod
    def update_goal(goal_id: int, payload: Dict) -> None:
        """Updates an employee goal using ORM."""
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

        # Validate goal exists using ORM
        goal = EmployeeGoal.query.filter_by(goal_id=goal_id).first()
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")

        # Handle custom skill using ORM
        if custom_skill_name:
            existing_skill = MasterSkill.query.filter_by(
                skill_name=custom_skill_name,
                skill_type='Other'
            ).first()
            
            if not existing_skill:
                max_skill_id = db.session.query(func.max(MasterSkill.skill_id)).scalar() or 0
                new_skill = MasterSkill(
                    skill_id=max_skill_id + 1,
                    skill_name=custom_skill_name,
                    skill_type='Other'
                )
                db.session.add(new_skill)
                db.session.flush()
                skill_id = new_skill.skill_id
            else:
                skill_id = existing_skill.skill_id
        elif skill_id:
            # Validate existing skill using ORM
            existing_skill = MasterSkill.query.filter_by(skill_id=skill_id).first()
            if not existing_skill:
                raise ValueError(f"Skill {skill_id} not found")

        # Update goal using ORM
        goal.skill_id = skill_id
        goal.target_date = target_date_dt
        db.session.commit()

    @staticmethod
    def delete_goal(goal_id: int) -> None:
        """Deletes an employee goal using ORM."""
        goal = EmployeeGoal.query.filter_by(goal_id=goal_id).first()
        if not goal:
            raise ValueError(f"Goal {goal_id} not found")

        db.session.delete(goal)
        db.session.commit()

    # ============= GOAL FUNCTIONALITY METHODS (from C# GoalFunctionality) =============

    @staticmethod
    def _check_lead_and_emp_id(emp_id: str, lead_id: str) -> bool:
        """
        Private helper method to validate that both employee and lead IDs exist using ORM.
        
        Args:
            emp_id: Employee ID to validate
            lead_id: Lead ID to validate
            
        Returns:
            True if both IDs exist, False otherwise
        """
        try:
            emp_exists = Employee.query.filter_by(employee_id=emp_id).first() is not None
            lead_exists = Employee.query.filter_by(employee_id=lead_id).first() is not None
            
            return emp_exists and lead_exists
        except Exception as e:
            Logger.error("Error checking employee/lead IDs", error=str(e), employee_id=emp_id, lead_id=lead_id)
            return False

    @staticmethod
    def assign_lead_to_emp(emp_id: str, lead_id: str) -> bool:
        """
        Assigns a lead to an employee, or updates the existing assignment using ORM.
        Implements upsert logic - updates if assignment exists, inserts if new.
        
        Args:
            emp_id: Employee ID to assign lead to
            lead_id: Lead ID to assign
            
        Returns:
            True if successful, False if validation fails
            
        Raises:
            Exception: If database error occurs
        """
        try:
            # Validate both IDs exist
            check_is_valid_ids = GoalsService._check_lead_and_emp_id(emp_id, lead_id)
            if not check_is_valid_ids:
                return False
            
            # Check if assignment already exists using ORM
            existing = LeadAssignedByHR.query.filter_by(emp_id=emp_id).first()
            
            if existing:
                # Update existing assignment
                existing.lead_id = lead_id
            else:
                # Insert new assignment
                new_assignment = LeadAssignedByHR(
                    emp_id=emp_id,
                    lead_id=lead_id
                )
                db.session.add(new_assignment)
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            Logger.error("Database error in assign_lead_to_emp", error=str(e), employee_id=emp_id, lead_id=lead_id)
            raise Exception(f"A database error occurred while adding or updating the employee IDs: {str(e)}")

    @staticmethod
    def get_all_employee_list() -> List[Dict]:
        """
        Retrieves all employees with specific employment statuses using ORM.
        
        Returns list of employees who are:
        - Intern
        - Probation
        - Confirmed
        - Active
        - Resigned
        
        Returns:
            List of employee dicts with employee_id, first_name, last_name, email
            
        Raises:
            Exception: If database error occurs
        """
        try:
            # Use SQLAlchemy ORM with filter and order_by
            employees = Employee.query.filter(
                Employee.employment_status.in_(['Intern', 'Probation', 'Confirmed', 'Active', 'Resigned'])
            ).order_by(
                Employee.first_name,
                Employee.last_name
            ).all()
            
            return [
                {
                    'employee_id': emp.employee_id,
                    'first_name': emp.first_name,
                    'last_name': emp.last_name,
                    'email': emp.email
                } for emp in employees
            ]
            
        except Exception as e:
            Logger.error("Database error in get_all_employee_list", error=str(e))
            raise Exception(f"A database error occurred while getting the employee list: {str(e)}")

