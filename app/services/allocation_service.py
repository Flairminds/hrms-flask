from sqlalchemy import text
from .. import db

class AllocationService:
    @staticmethod
    def assign_employee(emp_id, proj_id, cat_id, allocation):
        """Assigns an employee to a project."""
        db.session.execute(
            text("""
                INSERT INTO EmployeeAllocations (EmployeeID, ProjectID, WorkCategoryID, Allocation)
                VALUES (:eid, :pid, :cid, :alloc)
            """),
            {"eid": emp_id.strip(), "pid": proj_id, "cid": cat_id, "alloc": allocation}
        )
        db.session.commit()
