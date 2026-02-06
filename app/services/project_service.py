from sqlalchemy import text, func, and_
from ..models.hr import db, Project, ProjectAllocation, Employee, ProjectHistory, ProjectAllocationHistory
from ..utils.logger import Logger
from datetime import datetime

class ProjectService:
    """Service class for project management operations."""
    
    @staticmethod
    def get_all_projects():
        """Retrieves all projects with lead information and details."""
        try:
            # Using ORM for cleaner queries
            projects = db.session.query(
                Project.project_id,
                Project.project_name,
                Project.description,
                Project.client,
                Project.start_date,
                Project.end_date,
                Project.lead_by,
                func.concat(Employee.first_name, ' ', func.coalesce(Employee.middle_name, ''), ' ', Employee.last_name).label('lead_name')
            ).outerjoin(
                Employee, Project.lead_by == Employee.employee_id
            ).all()
            
            return [
                {
                    'project_id': p.project_id,
                    'project_name': p.project_name,
                    'description': p.description,
                    'client': p.client,
                    'start_date': p.start_date.strftime('%Y-%m-%d') if p.start_date else None,
                    'end_date': p.end_date.strftime('%Y-%m-%d') if p.end_date else None,
                    'lead_by': p.lead_by,
                    'lead_name': ' '.join(p.lead_name.split()) if p.lead_name else ''
                } for p in projects
            ]
        except Exception as e:
            Logger.error("Error fetching all projects", error=str(e))
            return []

    @staticmethod
    def get_project_by_id(project_id):
        """Retrieves a single project by ID."""
        try:
            return Project.query.filter_by(project_id=project_id).first()
        except Exception as e:
            Logger.error("Error fetching project", project_id=project_id, error=str(e))
            return None

    @staticmethod
    def create_project(data):
        """Creates a new project."""
        try:
            new_project = Project(
                project_name=data.get('project_name'),
                description=data.get('description'),
                client=data.get('client'),
                lead_by=data.get('lead_by'),
                start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
                end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None
            )
            db.session.add(new_project)
            db.session.commit()
            return new_project.project_id
        except Exception as e:
            db.session.rollback()
            Logger.error("Error creating project", error=str(e))
            raise

    @staticmethod
    def update_project(project_id, data):
        """Updates an existing project."""
        try:
            project = Project.query.get(project_id)
            if not project:
                return False
            
            project.project_name = data.get('project_name', project.project_name)
            project.description = data.get('description', project.description)
            project.client = data.get('client', project.client)
            project.lead_by = data.get('lead_by', project.lead_by)
            
            if 'start_date' in data:
                project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data['start_date'] else None
            if 'end_date' in data:
                project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data['end_date'] else None

            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error updating project", project_id=project_id, error=str(e))
            raise

    @staticmethod
    def get_allocations(project_id):
        """Retrieves all allocations for a specific project."""
        try:
            allocations = db.session.query(
                ProjectAllocation,
                func.concat(Employee.first_name, ' ', func.coalesce(Employee.middle_name, ''), ' ', Employee.last_name).label('emp_name')
            ).join(
                Employee, ProjectAllocation.employee_id == Employee.employee_id
            ).filter(
                ProjectAllocation.project_id == project_id
            ).all()
            
            return [
                {
                    'employee_id': a.ProjectAllocation.employee_id,
                    'emp_name': ' '.join(a.emp_name.split()),
                    'project_id': a.ProjectAllocation.project_id,
                    'project_allocation': float(a.ProjectAllocation.project_allocation),
                    'project_billing': float(a.ProjectAllocation.project_billing),
                    'is_billing': a.ProjectAllocation.is_billing,
                    'employee_role': a.ProjectAllocation.employee_role,
                    'is_trainee': a.ProjectAllocation.is_trainee,
                    'comments': a.ProjectAllocation.comments,
                    'start_date': a.ProjectAllocation.start_date.strftime('%Y-%m-%d') if a.ProjectAllocation.start_date else None,
                    'end_date': a.ProjectAllocation.end_date.strftime('%Y-%m-%d') if a.ProjectAllocation.end_date else None,
                    'relevant_skills': a.ProjectAllocation.relevant_skills
                } for a in allocations
            ]
        except Exception as e:
            Logger.error("Error fetching allocations", project_id=project_id, error=str(e))
            return []

    @staticmethod
    def delete_allocation(project_id, employee_id):
         """Deletes a project allocation."""
         try:
            allocation = ProjectAllocation.query.filter_by(project_id=project_id, employee_id=employee_id).first()
            if allocation:
                db.session.delete(allocation)
                db.session.commit()
                return True
            return False
         except Exception as e:
            db.session.rollback()
            Logger.error("Error deleting allocation", project_id=project_id, employee_id=employee_id, error=str(e))
            raise

    @staticmethod
    def manage_allocation(data):
        """Creates or Updates an allocation."""
        try:
            project_id = data.get('project_id')
            employee_id = data.get('employee_id')
            
            # Check if allocation exists
            allocation = ProjectAllocation.query.filter_by(
                project_id=project_id, 
                employee_id=employee_id
            ).first()
            
            is_new = False
            if not allocation:
                is_new = True
                allocation = ProjectAllocation(
                    project_id=project_id, 
                    employee_id=employee_id
                )
            
            # Update fields
            allocation.project_allocation = data.get('project_allocation', 0)
            allocation.project_billing = data.get('project_billing', 0) # Legacy support
            allocation.is_billing = data.get('is_billing', False)
            allocation.employee_role = data.get('employee_role')
            allocation.is_trainee = data.get('is_trainee', False)
            allocation.comments = data.get('comments')
            allocation.relevant_skills = data.get('relevant_skills')
            
            if 'start_date' in data and data['start_date']:
                 allocation.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            if 'end_date' in data and data['end_date']:
                 allocation.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            else:
                 allocation.end_date = None

            if is_new:
                db.session.add(allocation)
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error("Error managing allocation", error=str(e))
            raise
    
    @staticmethod
    def get_projects():
        """Retrieves all projects from the ProjectList table."""
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
        """Adds a new project to the ProjectList table."""
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
        """Deletes a project from the ProjectList table."""
        Logger.info("Deleting project", project_id=project_id)
        try:
            db.session.execute(text("DELETE FROM ProjectList WHERE ProjectID = :pid"), {"pid": project_id})
            db.session.commit()
            Logger.info("Project deleted successfully", project_id=project_id)
        except Exception as e:
            db.session.rollback()
            Logger.error("Error deleting project", project_id=project_id, error=str(e))
            raise


