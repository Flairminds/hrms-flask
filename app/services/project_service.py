from sqlalchemy import text
from ..models.hr import db, Project
from ..utils.logger import Logger

class ProjectService:
    """Service class for project management operations."""
    
    @staticmethod
    def get_projects():
        """Retrieves all projects from ProjectList."""
        Logger.info("Retrieving all projects from ProjectList")
        try:
            result = db.session.execute(text("SELECT ProjectID, ProjectName, EndDate, Required FROM ProjectList"))
            projects = [dict(row._mapping) for row in result]
            Logger.debug("Projects retrieved", count=len(projects))
            return projects
        except Exception as e:
            Logger.error("Error retrieving projects", error=str(e))
            raise

    @staticmethod
    def add_project(name, end_date, required):
        """Adds a new project to the ProjectList."""
        Logger.info("Adding new project", project_name=name)
        try:
            db.session.execute(
                text("INSERT INTO ProjectList (ProjectName, EndDate, Required) VALUES (:pname, :edate, :req)"),
                {"pname": name, "edate": end_date, "req": 1 if required else 0}
            )
            db.session.commit()
            Logger.info("Project added successfully", project_name=name)
        except Exception as e:
            db.session.rollback()
            Logger.error("Error adding project", project_name=name, error=str(e))
            raise

    @staticmethod
    def delete_project(project_id):
        """Deletes a project from ProjectList."""
        Logger.info("Deleting project", project_id=project_id)
        try:
            db.session.execute(text("DELETE FROM ProjectList WHERE ProjectID = :pid"), {"pid": project_id})
            db.session.commit()
            Logger.info("Project deleted successfully", project_id=project_id)
        except Exception as e:
            db.session.rollback()
            Logger.error("Error deleting project", project_id=project_id, error=str(e))
            raise

    # ============= NEW METHODS FROM C# MIGRATION =============

    @staticmethod
    def get_all_projects():
        """
        Retrieves all projects with their details including lead information.
        Returns project name, client, lead name, and lead ID.
        """
        try:
            query = text("""
                SELECT p.project_name, p.client, 
                e.first_name + ' ' + ISNULL(e.middle_name, '') + ' ' + e.last_name AS lead_name,
                p.lead_by
                FROM project p 
                JOIN employee e ON p.lead_by = e.employee_id
            """)
            result = db.session.execute(query).fetchall()
            return [
                {
                    'project_name': row[0],
                    'client': row[1],
                    'lead_name': row[2],
                    'lead_by': row[3]
                } for row in result
            ]
        except Exception as e:
            Logger.error("Error fetching all projects", error=str(e))
            return []

    @staticmethod
    def get_project_names():
        """
        Retrieves simple list of project IDs and names.
        Returns project ID and project name.
        """
        try:
            query = text("SELECT project_id, project_name FROM project")
            result = db.session.execute(query).fetchall()
            return [
                {
                    'project_id': row[0],
                    'project_name': row[1]
                } for row in result
            ]
        except Exception as e:
            Logger.error("Error fetching project names", error=str(e))
            return []

    @staticmethod
    def insert_project(project_name, client, lead_by):
        """
        Inserts a new project and returns the auto-generated project ID.
        
        Args:
            project_name: Name of the project
            client: Client name
            lead_by: Employee ID of the project lead
            
        Returns:
            The newly created project ID, or None if failed
        """
        try:
            query = text("""
                INSERT INTO project (project_name, client, lead_by)
                VALUES (:project_name, :client, :lead_by);
                SELECT CAST(SCOPE_IDENTITY() as int);
            """)
            result = db.session.execute(query, {
                'project_name': project_name,
                'client': client,
                'lead_by': lead_by
            })
            db.session.commit()
            # Get the inserted ID
            project_id = result.scalar()
            return project_id
        except Exception as e:
            db.session.rollback()
            Logger.error("Error inserting project", error=str(e), project_name=project_name)
            return None

    @staticmethod
    def update_project(project_id: int, project_name: str = None, client: str = None, lead_by: str = None) -> int:
        """
        Updates an existing project following stored procedure '[dbo].[UpdateProjectDetails]' logic.
        Implements selective updates: only updates if values are not null, not empty, and not 'string'.
        
        Args:
            project_id: ID of the project to update
            project_name: New project name (optional)
            client: New client name (optional)
            lead_by: New lead employee ID (optional)
            
        Returns:
            int: 1 for success, -1 if project not found
        """
        Logger.info("Executing UpdateProjectDetails logic", project_id=project_id)
        
        try:
            # 1. Fetch project and check existence
            project = Project.query.filter_by(project_id=project_id).first()
            if not project:
                Logger.warning("Project not found for update", project_id=project_id)
                return -1
            
            # 2. Selective Update Logic (replicates CASE in SP)
            # Conditions: IS NOT NULL AND != '' AND != 'string'
            def is_valid_update(val):
                return val is not None and str(val).strip() != '' and str(val).lower() != 'string'

            if is_valid_update(project_name):
                project.project_name = project_name
                
            if is_valid_update(client):
                project.client = client
                
            if is_valid_update(lead_by):
                project.lead_by = lead_by
            
            db.session.commit()
            Logger.info("Project details updated successfully", project_id=project_id)
            return 1
            
        except Exception as e:
            db.session.rollback()
            Logger.critical("Error updating project", project_id=project_id, error=str(e))
            raise e

