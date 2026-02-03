from typing import List, Dict, Any
from sqlalchemy import text
from ... import db
from ...models.hr import (Employee, EmployeeCredentials, EmployeeRole, MasterRole)
from ...utils.logger import Logger

class AccessService:
    @staticmethod
    def upsert_employee_credentials(employee_id: str, password: str, role_id: int, email: str) -> int:
        """
        Upserts employee credentials, roles, and email.
        Migrated from C# using stored procedure '[dbo].[UpsertEmployeeData]'.
        """
        Logger.info("Executing UpsertEmployeeData logic", employee_id=employee_id)
        rows_affected = 0
        try:
            # 2. Upsert EmployeeRole
            emp_role = EmployeeRole.query.filter_by(employee_id=employee_id).first()
            if emp_role:
                emp_role.role_id = role_id
            else:
                new_role = EmployeeRole(employee_id=employee_id, role_id=role_id)
                db.session.add(new_role)
            rows_affected += 1
            
            # 3. Upsert Employee Email
            employee = Employee.query.filter_by(employee_id=employee_id).first()
            if employee:
                employee.email = email
            else:
                new_emp = Employee(employee_id=employee_id, email=email)
                db.session.add(new_emp)
            rows_affected += 1
            
            db.session.commit()
            Logger.info("Employee data upserted successfully", employee_id=employee_id, rows_affected=rows_affected)
            return rows_affected
        except Exception as e:
            db.session.rollback()
            Logger.critical("Error in upsert_employee_credentials", employee_id=employee_id, error=str(e))
            raise e

    @staticmethod
    def get_employee_accessibility_details() -> List[Dict[str, Any]]:
        """Retrieves employee names, roles, emails, and passwords for accessibility management."""
        try:
            results = db.session.query(
                (Employee.first_name + ' ' + Employee.last_name).label('employee_name'),
                MasterRole.role_name,
                Employee.email,
                Employee.employee_id
            ).join(EmployeeRole, Employee.employee_id == EmployeeRole.employee_id
            ).join(MasterRole, EmployeeRole.role_id == MasterRole.role_id
            ).join(EmployeeCredentials, Employee.employee_id == EmployeeCredentials.employee_id
            ).all()
            
            return [
                {
                    'employee_name': row.employee_name,
                    'role_name': row.role_name,
                    'email': row.email,
                    'password': row.password,
                    'employee_id': row.employee_id
                } for row in results
            ]
        except Exception as e:
            Logger.error("Error fetching employee accessibility details", error=str(e))
            return []
