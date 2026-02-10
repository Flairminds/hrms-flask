from sqlalchemy import text, func, and_
from ..models.hr import db, Project, ProjectAllocation, Employee, ProjectHistory, ProjectAllocationHistory
from ..utils.logger import Logger
from datetime import datetime

class ProjectService:
    """Service class for project management operations."""
    
    @staticmethod
    def get_all_projects():
        """Retrieves all projects with lead information, details, and allocation aggregates."""
        try:
            # Subquery to aggregate total allocation per project
            total_alloc_subq = db.session.query(
                ProjectAllocation.project_id,
                func.sum(ProjectAllocation.project_allocation).label('total_allocation')
            ).group_by(
                ProjectAllocation.project_id
            ).subquery()
            
            # Subquery to aggregate billable allocation per project
            billable_alloc_subq = db.session.query(
                ProjectAllocation.project_id,
                func.sum(ProjectAllocation.project_allocation).label('billable_allocation')
            ).filter(
                ProjectAllocation.is_billing == True
            ).group_by(
                ProjectAllocation.project_id
            ).subquery()
            
            # Main query with joins to get project details and aggregated allocations
            projects = db.session.query(
                Project.project_id,
                Project.project_name,
                Project.description,
                Project.client,
                Project.start_date,
                Project.end_date,
                Project.project_status,
                Project.lead_by,
                Project.contractual_allocation,
                func.concat(Employee.first_name, ' ', func.coalesce(Employee.middle_name, ''), ' ', Employee.last_name).label('lead_name'),
                func.coalesce(total_alloc_subq.c.total_allocation, 0).label('total_allocation'),
                func.coalesce(billable_alloc_subq.c.billable_allocation, 0).label('billable_allocation')
            ).outerjoin(
                Employee, Project.lead_by == Employee.employee_id
            ).outerjoin(
                total_alloc_subq, Project.project_id == total_alloc_subq.c.project_id
            ).outerjoin(
                billable_alloc_subq, Project.project_id == billable_alloc_subq.c.project_id
            ).all()
            
            return [
                {
                    'project_id': p.project_id,
                    'project_name': p.project_name,
                    'description': p.description,
                    'client': p.client,
                    'start_date': p.start_date.strftime('%Y-%m-%d') if p.start_date else None,
                    'end_date': p.end_date.strftime('%Y-%m-%d') if p.end_date else None,
                    'project_status': p.project_status,
                    'lead_by': p.lead_by,
                    'contractual_allocation': float(p.contractual_allocation) if p.contractual_allocation else 0.0,
                    'lead_name': ' '.join(p.lead_name.split()) if p.lead_name else '',
                    'total_allocation': float(p.total_allocation),
                    'billable_allocation': float(p.billable_allocation)
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
                project_status=data.get('project_status', 'Active'),
                start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
                end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None
            )
            db.session.add(new_project)
            db.session.flush()  # Flush to generate the project_id before commit
            project_id = new_project.project_id
            db.session.commit()
            return project_id
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
            project.project_status = data.get('project_status', project.project_status)
            project.lead_by = data.get('lead_by', project.lead_by)
            project.contractual_allocation = data.get('contractual_allocation', project.contractual_allocation)
            
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
    def get_employee_allocations():
        """Retrieves all employees with their project allocations aggregated."""
        try:
            # Get all employees with their allocations
            employees_data = db.session.query(
                Employee.employee_id,
                func.concat(Employee.first_name, ' ', func.coalesce(Employee.middle_name, ''), ' ', Employee.last_name).label('employee_name'),
                Employee.email
            ).filter(
                Employee.employment_status.notin_(['Relieved', 'Absconding'])
            ).all()
            
            result = []
            for emp in employees_data:
                # Get all allocations for this employee
                allocations = db.session.query(
                    ProjectAllocation.project_id,
                    ProjectAllocation.project_allocation,
                    ProjectAllocation.employee_role,
                    ProjectAllocation.is_billing,
                    Project.project_name,
                    (Employee.first_name + ' ' + Employee.last_name).label('lead_name'),
                ).join(
                    Project, ProjectAllocation.project_id == Project.project_id
                ).outerjoin(
                    Employee, Project.lead_by == Employee.employee_id
                ).filter(
                    ProjectAllocation.employee_id == emp.employee_id
                ).all()

                print(allocations)
                
                # Calculate totals
                total_allocation = sum(alloc.project_allocation for alloc in allocations)
                billable_allocation = sum(alloc.project_allocation for alloc in allocations if alloc.is_billing)
                
                # Format projects
                projects = [
                    {
                        'project_id': alloc.project_id,
                        'project_name': alloc.project_name,
                        'role': alloc.employee_role,
                        'allocation': float(alloc.project_allocation),
                        'is_billing': alloc.is_billing,
                        'lead_name': alloc.lead_name
                    } for alloc in allocations
                ]

                result.append({
                    'employee_id': emp.employee_id,
                    'employee_name': ' '.join(emp.employee_name.split()),
                    'email': emp.email,
                    'total_allocation': float(total_allocation / 100) if total_allocation else 0.0,  # Convert to 0-1 scale
                    'billable_allocation': float(billable_allocation / 100) if billable_allocation else 0.0,  # Convert to 0-1 scale
                    'projects': projects
                })
            
            return result
        except Exception as e:
            Logger.error("Error fetching employee allocations", error=str(e))
            return []

    @staticmethod
    def get_my_projects_team(employee_id):
        """Retrieves projects for a specific employee with all team members."""
        try:
            # Get projects the employee is allocated to
            my_projects = db.session.query(
                Project.project_id,
                Project.project_name,
                Project.client,
                (Employee.first_name + ' ' + Employee.last_name).label('lead_name'),
                ProjectAllocation.employee_role.label('my_role'),
                ProjectAllocation.project_allocation.label('my_allocation')
            ).join(
                ProjectAllocation, Project.project_id == ProjectAllocation.project_id
            ).outerjoin(
                Employee, Project.lead_by == Employee.employee_id
            ).filter(
                ProjectAllocation.employee_id == employee_id
            ).all()
            
            result = []
            for proj in my_projects:
                # Get all team members for this project
                team_members = db.session.query(
                    ProjectAllocation.employee_id,
                    func.concat(Employee.first_name, ' ', func.coalesce(Employee.middle_name, ''), ' ', Employee.last_name).label('employee_name'),
                    Employee.email,
                    ProjectAllocation.employee_role,
                    ProjectAllocation.project_allocation
                ).join(
                    Employee, ProjectAllocation.employee_id == Employee.employee_id
                ).filter(
                    ProjectAllocation.project_id == proj.project_id
                ).all()

                result.append({
                    'project_id': proj.project_id,
                    'project_name': proj.project_name,
                    'client': proj.client,
                    'my_role': proj.my_role,
                    'my_allocation': float(proj.my_allocation),
                    'lead_name': proj.lead_name,
                    'team_members': [
                        {
                            'employee_id': tm.employee_id,
                            'employee_name': ' '.join(tm.employee_name.split()),
                            'email': tm.email,
                            'role': tm.employee_role,
                            'allocation': float(tm.project_allocation)
                        } for tm in team_members
                    ]
                })
            
            return result
        except Exception as e:
            Logger.error("Error fetching my projects team", employee_id=employee_id, error=str(e))
            return []

    @staticmethod
    def get_dashboard_stats():
        """Aggregates project dashboard statistics."""
        try:
            # Project Counts
            active_projects = Project.query.filter_by(project_status='Active').count()
            prospective_projects = Project.query.filter_by(project_status='Future Prospect').count()
            
            # Allocation Stats (converting percentage to FTE by dividing by 100)
            allocations = ProjectAllocation.query.all()
            total_allocation = sum(float(a.project_allocation) for a in allocations) / 100.0 if allocations else 0
            # Assuming billable allocation logic: sum of allocation where is_billing is true
            billable_allocation = sum(float(a.project_allocation) for a in allocations if a.is_billing) / 100.0 if allocations else 0
            
            # Total Employees (Capacity)
            total_employees = Employee.query.filter(Employee.employment_status.notin_(['Relieved', 'Absconding'])).count()

            return {
                'active_projects': active_projects,
                'prospective_projects': prospective_projects,
                'total_allocation': total_allocation,
                'billable_allocation': billable_allocation,
                'total_employees': total_employees
            }
        except Exception as e:
            Logger.error("Error fetching dashboard stats", error=str(e))
            return {
                'active_projects': 0,
                'prospective_projects': 0,
                'total_allocation': 0,
                'billable_allocation': 0,
                'total_employees': 0
            }

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


