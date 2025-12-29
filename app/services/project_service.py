from sqlalchemy import text
from .. import db

class ProjectService:
    @staticmethod
    def get_projects():
        """Retrieves all projects from ProjectList."""
        result = db.session.execute(text("SELECT ProjectID, ProjectName, EndDate, Required FROM ProjectList"))
        return [dict(row) for row in result.mappings()]

    @staticmethod
    def add_project(name, end_date, required):
        """Adds a new project to the ProjectList."""
        db.session.execute(
            text("INSERT INTO ProjectList (ProjectName, EndDate, Required) VALUES (:pname, :edate, :req)"),
            {"pname": name, "edate": end_date, "req": 1 if required else 0}
        )
        db.session.commit()

    @staticmethod
    def delete_project(project_id):
        """Deletes a project from ProjectList."""
        db.session.execute(text("DELETE FROM ProjectList WHERE ProjectID = :pid"), {"pid": project_id})
        db.session.commit()
