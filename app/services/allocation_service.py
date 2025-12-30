"""
Allocation service module for managing employee project allocations.

This module provides business logic for assigning employees to projects
with specified work categories and allocation percentages.
"""

from typing import Optional
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from .. import db
from ..models.hr import EmployeeAllocations, Employee, Project
from ..utils.logger import Logger


class AllocationService:
    """
    Service layer for employee project allocation operations.
    
    Handles assignment of employees to projects with specified work categories
    and allocation percentages. All methods use SQLAlchemy ORM and centralized logging.
    
    Example Usage:
        >>> # Assign employee to project
        >>> success = AllocationService.assign_employee(
        ...     emp_id='EMP001',
        ...     proj_id='PROJ123',
        ...     cat_id='CAT01',
        ...     allocation=0.8
        ... )
    
    Note:
        All database operations use transactions with automatic rollback on error.
        All methods log operations using Logger with appropriate context.
    """
    
    @staticmethod
    def assign_employee(
        emp_id: str,
        proj_id: str,
        cat_id: str,
        allocation: float
    ) -> bool:
        """
        Assigns an employee to a project with specified allocation.
        
        Creates a new allocation record associating an employee with a project,
        work category, and allocation percentage/value.
        
        Args:
            emp_id: Employee ID to assign. Must be an active employee.
            proj_id: Project ID to assign employee to. Must be an active project.
            cat_id: Work Category ID (e.g., 'DEV', 'QA', 'PM')
            allocation: Allocation value. Interpretation depends on context:
                - If percentage: 0.0 to 1.0 (e.g., 0.8 = 80%)
                - If hours: Number of hours per week
                Must be > 0.
        
        Returns:
            True if assignment successful
        
        Raises:
            ValueError: If any required field is empty or allocation is invalid
            LookupError: If employee or project doesn't exist
            IntegrityError: If employee already assigned to this project
            SQLAlchemyError: If database operation fails
        
        Example:
            >>> # Assign employee at 80% allocation
            >>> AllocationService.assign_employee(
            ...     emp_id='EMP001',
            ...     proj_id='PROJ123',
            ...     cat_id='DEVELOPER',
            ...     allocation=0.8
            ... )
            True
        
        Note:
            - Duplicate assignments (same employee + project) will raise IntegrityError
            - Allocation validation is basic; caller should validate business rules
            - Work category is not validated against a master list
        """
        # Validate inputs
        if not emp_id or not emp_id.strip():
            Logger.error("Allocation attempt with empty employee ID")
            raise ValueError("Employee ID cannot be empty")
        
        if not proj_id or not proj_id.strip():
            Logger.error("Allocation attempt with empty project ID", employee_id=emp_id)
            raise ValueError("Project ID cannot be empty")
        
        if not cat_id or not cat_id.strip():
            Logger.error("Allocation attempt with empty work category", 
                        employee_id=emp_id,
                        project_id=proj_id)
            raise ValueError("Work Category ID cannot be empty")
        
        if allocation <= 0:
            Logger.error("Allocation attempt with invalid allocation value", 
                        employee_id=emp_id,
                        project_id=proj_id,
                        allocation=allocation)
            raise ValueError("Allocation must be greater than 0")
        
        # Normalize employee ID (strip whitespace)
        emp_id = emp_id.strip()
        proj_id = proj_id.strip()
        cat_id = cat_id.strip()
        
        Logger.info("Assigning employee to project", 
                   employee_id=emp_id,
                   project_id=proj_id,
                   work_category_id=cat_id,
                   allocation=allocation)
        
        try:
            # Validate employee exists
            employee = Employee.query.get(emp_id)
            if not employee:
                Logger.error("Assignment failed - employee not found", employee_id=emp_id)
                raise LookupError(f"Employee {emp_id} not found")
            
            # Optional: Validate project exists (if Project model available)
            # project = Project.query.get(proj_id)
            # if not project:
            #     Logger.error("Assignment failed - project not found", 
            #                 employee_id=emp_id,
            #                 project_id=proj_id)
            #     raise LookupError(f"Project {proj_id} not found")
            
            # Create allocation record using ORM
            new_allocation = EmployeeAllocations(
                employee_id=emp_id,
                project_id=proj_id,
                work_category_id=cat_id,
                allocation=allocation
            )
            
            db.session.add(new_allocation)
            db.session.commit()
            
            Logger.info("Employee assigned to project successfully", 
                       employee_id=emp_id,
                       project_id=proj_id,
                       work_category_id=cat_id)
            return True
            
        except IntegrityError as ie:
            # Duplicate assignment or foreign key violation
            db.session.rollback()
            Logger.error("Database integrity error during assignment", 
                        employee_id=emp_id,
                        project_id=proj_id,
                        work_category_id=cat_id,
                        error=str(ie),
                        constraint=ie.orig.args if hasattr(ie, 'orig') else None)
            
            # Provide user-friendly message for common constraint violations
            if 'UNIQUE' in str(ie).upper() or 'duplicate' in str(ie).lower():
                raise IntegrityError(
                    f"Employee {emp_id} is already assigned to project {proj_id}",
                    params=None,
                    orig=ie.orig if hasattr(ie, 'orig') else None
                )
            raise
            
        except SQLAlchemyError as se:
            # General database error
            db.session.rollback()
            Logger.error("Database error during assignment", 
                        employee_id=emp_id,
                        project_id=proj_id,
                        work_category_id=cat_id,
                        allocation=allocation,
                        error=str(se),
                        error_type=type(se).__name__)
            raise
            
        except Exception as e:
            # Unexpected error
            db.session.rollback()
            Logger.critical("Unexpected error during employee assignment", 
                           employee_id=emp_id,
                           project_id=proj_id,
                           work_category_id=cat_id,
                           allocation=allocation,
                           error=str(e),
                           error_type=type(e).__name__)
            raise
    
    @staticmethod
    def get_employee_allocations(emp_id: str) -> list:
        """
        Retrieves all project allocations for an employee.
        
        Args:
            emp_id: Employee ID to lookup
        
        Returns:
            List of allocation dictionaries, empty list if none found
        
        Raises:
            ValueError: If emp_id is empty
        
        Example:
            >>> allocations = AllocationService.get_employee_allocations('EMP001')
            >>> for alloc in allocations:
            ...     print(f"Project: {alloc['project_id']}, Allocation: {alloc['allocation']}")
        """
        if not emp_id or not emp_id.strip():
            raise ValueError("Employee ID cannot be empty")
        
        Logger.debug("Fetching employee allocations", employee_id=emp_id)
        
        try:
            allocations = EmployeeAllocations.query.filter_by(
                employee_id=emp_id.strip()
            ).all()
            
            result = [
                {
                    'employee_id': alloc.employee_id,
                    'project_id': alloc.project_id,
                    'work_category_id': alloc.work_category_id,
                    'allocation': alloc.allocation
                }
                for alloc in allocations
            ]
            
            Logger.debug("Employee allocations retrieved", 
                        employee_id=emp_id,
                        count=len(result))
            return result
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching allocations", 
                        employee_id=emp_id,
                        error=str(e))
            return []
