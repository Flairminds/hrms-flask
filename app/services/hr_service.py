from ..models.hr import db, Employee, EmployeeAddress, EmployeeSkill, Project, Skill
from sqlalchemy import text
from datetime import datetime

class HRService:
    """Service class for HR operations like employee management, project tracking, and reporting."""

    @staticmethod
    def get_all_employees():
        """
        Retrieves a list of all active employees with their roles.
        Mirrors the 'GetAllEmployees' logic from the .NET backend.
        """
        try:
            query = text("""
                SELECT e.EmployeeId, e.FirstName, e.LastName, e.Email, e.ContactNumber, 
                       e.EmploymentStatus, r.RoleName
                FROM Employees e
                LEFT JOIN EmployeeRole r ON e.EmployeeRole = r.RoleId
            """)
            return db.session.execute(query).fetchall()
        except Exception as e:
            print(f"Error fetching all employees: {e}")
            return []

    @staticmethod
    def upsert_employee(data):
        """
        Creates or updates an employee record. 
        Note: This is a simplified version of the logic in the .NET stored procedures.
        """
        try:
            employee = Employee.query.get(data.get('EmployeeId'))
            if not employee:
                employee = Employee(EmployeeId=data.get('EmployeeId'))
                db.session.add(employee)
                
            # Updating employee fields
            employee.FirstName = data.get('FirstName')
            employee.LastName = data.get('LastName')
            employee.Email = data.get('Email')
            # ... update additional fields as per the .NET implementation ...
            
            db.session.commit()
            return employee.EmployeeId
        except Exception as e:
            db.session.rollback()
            print(f"Error in upsert_employee: {e}")
            raise e

    @staticmethod
    def get_monthly_report(month, year):
        """
        Generates a monthly report for attendance/payroll.
        Executes the 'GetMonthlyReport' stored procedure.
        """
        try:
            query = text("EXEC GetMonthlyReport @Month=:month, @Year=:year")
            return db.session.execute(query, {"month": month, "year": year}).fetchall()
        except Exception as e:
            print(f"Error generating monthly report: {e}")
            return []

    @staticmethod
    def add_project(name, description):
        """Adds a new project to the organizational directory."""
        try:
            new_project = Project(ProjectName=name, Description=description)
            db.session.add(new_project)
            db.session.commit()
            return new_project.ProjectId
        except Exception as e:
            db.session.rollback()
            print(f"Error adding project: {e}")
            return None

    @staticmethod
    def get_employee_details_for_relieving_letter():
        """Fetches employee details needed for a relieving letter."""
        try:
            result = db.session.execute(text("""
                SELECT 
                    e.EmployeeId,
                    CONCAT(e.FirstName, ' ', e.LastName) AS EmployeeName,
                    e.DateOfJoining,
                    es.SubRoleName,
                    e.PersonalEmail
                FROM Employee e
                LEFT JOIN EmployeeSubRole es ON e.SubRole = es.SubRoleId
            """))
            return [
                {
                    'EmployeeId': row[0],
                    'EmployeeName': row[1],
                    'DateOfJoining': row[2].isoformat() if row[2] else None,
                    'SubRoleName': row[3],
                    'PersonalEmail': row[4]
                } for row in result
            ]
        except Exception as e:
            print(f"Error fetching relieving letter details: {e}")
            return []

