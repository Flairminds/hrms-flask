"""
Capability service module for managing capability development leads and assignments.

This module provides business logic for assigning capability development leads
to employees and managing their assignments.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from .. import db
from ..models.hr import CapabilityDevelopmentLead, CapabilityDevelopmentLeadAssignment, Employee
from ..utils.logger import Logger


class CapabilityService:
    """
    Service layer for capability development lead management.
    
    Handles:
    - Capability development lead creation and deletion
    - Lead-employee assignment management
    - Assignment tracking and updates
    
    All methods use SQLAlchemy ORM and centralized logging.
    
    Example Usage:
        >>> # Create capability leads
        >>> leads = CapabilityService.create_leads(['EMP001', 'EMP002'])
        >>>
        >>> # Assign employee to lead
        >>> assignment_id = CapabilityService.create_assignment('EMP003', lead_id=1)
    
    Note:
        All database operations use transactions with automatic rollback on error.
        All methods log operations using Logger with appropriate context.
    """

    # ============= CAPABILITY DEVELOPMENT LEADS =============

    @staticmethod
    def get_leads() -> List[Dict[str, Any]]:
        """
        Retrieves all capability development leads.
        
        Returns all employees designated as capability development leads.
        
        Returns:
            List of lead dictionaries, each containing:
            - CapabilityDevelopmentLeadId (int): Lead identifier
            - EmployeeId (str): Employee ID of the lead
            Empty list if no leads found or error occurs.
        
        Example:
            >>> leads = CapabilityService.get_leads()
            >>> for lead in leads:
            ...     print(f"Lead: {lead['EmployeeId']}")
        """
        Logger.info("Fetching all capability development leads")
        
        try:
            leads = CapabilityDevelopmentLead.query.all()
            
            result = [
                {
                    "CapabilityDevelopmentLeadId": lead.capability_development_lead_id,
                    "EmployeeId": lead.employee_id
                }
                for lead in leads
            ]
            
            Logger.info("Capability leads fetched successfully", count=len(result))
            return result
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching capability leads", error=str(e))
            return []
        except Exception as e:
            Logger.critical("Unexpected error fetching capability leads", error=str(e))
            return []

    @staticmethod
    def create_leads(employee_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Creates new capability development leads for specified employees.
        
        Creates lead records for each employee ID provided. Skips employees
        who are already designated as leads.
        
        Args:
            employee_ids: List of employee IDs to designate as leads. Must not be empty.
        
        Returns:
            List of newly created lead dictionaries, each containing:
            - EmployeeId (str): Employee ID
            - CapabilityDevelopmentLeadId (int): New lead identifier
        
        Raises:
            ValueError: If employee_ids is empty, None, or not a list
            SQLAlchemyError: If database operation fails
        
        Example:
            >>> new_leads = CapabilityService.create_leads(['EMP001', 'EMP002'])
            >>> print(f"Created {len(new_leads)} leads")
        
        Note:
            - Duplicate employees (already leads) are silently skipped
            - Transaction is atomic - all or nothing
            - Employee existence is not validated
        """
        # Validate input
        if not employee_ids or not isinstance(employee_ids, list):
            Logger.error("Invalid employee_ids for lead creation", 
                        employee_ids=employee_ids,
                        is_list=isinstance(employee_ids, list) if employee_ids else False)
            raise ValueError("Please select at least one employee")
        
        if not all(isinstance(e, str) and e.strip() for e in employee_ids):
            Logger.error("Invalid employee ID format in list")
            raise ValueError("All employee IDs must be non-empty strings")
        
        Logger.info("Creating capability development leads", 
                   employee_count=len(employee_ids),
                   employee_ids=employee_ids)
        
        try:
            new_leads: List[Dict[str, Any]] = []
            
            for emp_id in employee_ids:
                # Check if already a lead
                existing = CapabilityDevelopmentLead.query.filter_by(
                    employee_id=emp_id
                ).first()
                
                if existing:
                    Logger.debug("Skipping - employee already a lead", employee_id=emp_id)
                    continue
                
                # Create new lead
                new_lead = CapabilityDevelopmentLead(employee_id=emp_id)
                db.session.add(new_lead)
                db.session.flush()  # Get ID immediately
                
                new_leads.append({
                    "EmployeeId": emp_id,
                    "CapabilityDevelopmentLeadId": new_lead.capability_development_lead_id
                })
                
                Logger.debug("Lead created", 
                            employee_id=emp_id,
                            lead_id=new_lead.capability_development_lead_id)
            
            db.session.commit()
            
            Logger.info("Capability leads created successfully", 
                       requested=len(employee_ids),
                       created=len(new_leads),
                       skipped=len(employee_ids) - len(new_leads))
            return new_leads
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error creating capability leads", 
                        employee_ids=employee_ids,
                        error=str(e))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.critical("Unexpected error creating capability leads", 
                           employee_ids=employee_ids,
                           error=str(e))
            raise

    @staticmethod
    def delete_lead(lead_id: int) -> Dict[str, Any]:
        """
        Deletes a capability development lead and all associated assignments.
        
        Removes the lead record and cascades deletion to all employee assignments
        under this lead.
        
        Args:
            lead_id: Capability development lead ID to delete
        
        Returns:
            Dictionary containing:
            - deletedAssignmentIds (List[int]): IDs of deleted assignments
            - deletedLeadId (int): ID of deleted lead
        
        Raises:
            ValueError: If lead_id is None or invalid
            LookupError: If lead not found
            SQLAlchemyError: If database operation fails
        
        Example:
            >>> result = CapabilityService.delete_lead(123)
            >>> print(f"Deleted lead {result['deletedLeadId']}")
            >>> print(f"Deleted {len(result['deletedAssignmentIds'])} assignments")
        
        Note:
            Deletion cascades to all assignments automatically.
            This operation cannot be undone.
        """
        if lead_id is None:
            raise ValueError("Lead ID cannot be None")
        
        Logger.info("Deleting capability development lead", lead_id=lead_id)
        
        try:
            # Get lead
            lead = CapabilityDevelopmentLead.query.get(lead_id)
            if not lead:
                Logger.warning("Lead not found for deletion", lead_id=lead_id)
                raise LookupError(f"Lead {lead_id} not found")
            
            # Get associated assignments before deletion
            assignments = CapabilityDevelopmentLeadAssignment.query.filter_by(
                capability_development_lead_id=lead_id
            ).all()
            
            assignment_ids = [
                a.capability_development_lead_assignment_id 
                for a in assignments
            ]
            
            Logger.debug("Found assignments to delete", 
                        lead_id=lead_id,
                        assignment_count=len(assignment_ids))
            
            # Delete lead (assignments cascade if configured)
            db.session.delete(lead)
            db.session.commit()
            
            Logger.info("Lead deleted successfully", 
                       lead_id=lead_id,
                       employee_id=lead.employee_id,
                       assignments_deleted=len(assignment_ids))
            
            return {
                "deletedAssignmentIds": assignment_ids,
                "deletedLeadId": lead_id
            }
            
        except LookupError:
            raise  # Re-raise LookupError as-is
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting lead", lead_id=lead_id, error=str(e))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.critical("Unexpected error deleting lead", lead_id=lead_id, error=str(e))
            raise

    # ============= CAPABILITY LEAD ASSIGNMENTS =============

    @staticmethod
    def get_assignments() -> List[Dict[str, Any]]:
        """
        Retrieves all capability development lead assignments.
        
        Returns all assignments showing which employees are assigned to which leads.
        
        Returns:
            List of assignment dictionaries, each containing:
            - CapabilityDevelopmentLeadAssignmentId (int): Assignment identifier
            - AssignedEmployeeId (str): Employee assigned to lead
            - CapabilityDevelopmentLeadId (int): Lead they're assigned to
            Empty list if no assignments or error occurs.
        
        Example:
            >>> assignments = CapabilityService.get_assignments()
            >>> for assign in assignments:
            ...     print(f"{assign['AssignedEmployeeId']} -> Lead {assign['CapabilityDevelopmentLeadId']}")
        """
        Logger.info("Fetching all capability lead assignments")
        
        try:
            assignments = CapabilityDevelopmentLeadAssignment.query.all()
            
            result = [
                {
                    "CapabilityDevelopmentLeadAssignmentId": a.capability_development_lead_assignment_id,
                    "AssignedEmployeeId": a.assigned_employee_id,
                    "CapabilityDevelopmentLeadId": a.capability_development_lead_id
                }
                for a in assignments
            ]
            
            Logger.info("Assignments fetched successfully", count=len(result))
            return result
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching assignments", error=str(e))
            return []

    @staticmethod
    def create_assignment(employee_id: str, lead_id: int) -> int:
        """
        Creates a new capability lead assignment.
        
        Assigns an employee to a capability development lead.
        
        Args:
            employee_id: Employee ID to assign. Must be non-empty.
            lead_id: Capability development lead ID. Must be valid.
        
        Returns:
            int: New assignment ID
        
        Raises:
            ValueError: If employee_id or lead_id is missing, or duplicate assignment
            LookupError: If lead doesn't exist
            SQLAlchemyError: If database operation fails
        
        Example:
            >>> assignment_id = CapabilityService.create_assignment('EMP001', 123)
            >>> print(f"Created assignment: {assignment_id}")
        
        Note:
            Duplicate assignments (same employee + lead) are rejected.
        """
        # Validate inputs
        if not employee_id or not employee_id.strip():
            raise ValueError("EmployeeId is required")
        if not lead_id:
            raise ValueError("LeadId is required")
        
        employee_id = employee_id.strip()
        
        Logger.info("Creating capability lead assignment", 
                   employee_id=employee_id,
                   lead_id=lead_id)
        
        try:
            # Check if lead exists
            lead = CapabilityDevelopmentLead.query.get(lead_id)
            if not lead:
                Logger.warning("Assignment failed - lead not found", lead_id=lead_id)
                raise LookupError(f"Lead {lead_id} not found")
            
            # Check for duplicate assignment
            duplicate = CapabilityDevelopmentLeadAssignment.query.filter_by(
                assigned_employee_id=employee_id,
                capability_development_lead_id=lead_id
            ).first()
            
            if duplicate:
                Logger.warning("Duplicate assignment detected", 
                              employee_id=employee_id,
                              lead_id=lead_id,
                              existing_assignment_id=duplicate.capability_development_lead_assignment_id)
                raise ValueError("This employee already has an assignment with this lead")
            
            # Create assignment
            new_assignment = CapabilityDevelopmentLeadAssignment(
                assigned_employee_id=employee_id,
                capability_development_lead_id=lead_id
            )
            db.session.add(new_assignment)
            db.session.flush()  # Get ID
            
            assignment_id = new_assignment.capability_development_lead_assignment_id
            db.session.commit()
            
            Logger.info("Assignment created successfully", 
                       employee_id=employee_id,
                       lead_id=lead_id,
                       assignment_id=assignment_id)
            return assignment_id
            
        except (ValueError, LookupError):
            raise  # Re-raise validation errors as-is
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Integrity constraint violated creating assignment", 
                        employee_id=employee_id,
                        lead_id=lead_id,
                        error=str(e))
            raise ValueError("Database constraint violation - invalid employee or lead ID")
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error creating assignment", 
                        employee_id=employee_id,
                        lead_id=lead_id,
                        error=str(e))
            raise

    @staticmethod
    def update_assignment(assignment_id: int, employee_id: str, lead_id: int) -> bool:
        """
        Updates an existing capability lead assignment.
        
        Changes the employee or lead for an existing assignment.
        
        Args:
            assignment_id: Assignment ID to update
            employee_id: New employee ID
            lead_id: New lead ID
        
        Returns:
            True if successful
        
        Raises:
            ValueError: If required fields missing or duplicate assignment
            LookupError: If assignment not found
            SQLAlchemyError: If database operation fails
        
        Example:
            >>> CapabilityService.update_assignment(456, 'EMP002', 789)
            True
        """
        # Validate inputs
        if not employee_id or not employee_id.strip():
            raise ValueError("EmployeeId is required")
        if not lead_id:
            raise ValueError("LeadId is required")
        if not assignment_id:
            raise ValueError("Assignment ID is required")
        
        employee_id = employee_id.strip()
        
        Logger.info("Updating capability lead assignment", 
                   assignment_id=assignment_id,
                   employee_id=employee_id,
                   lead_id=lead_id)
        
        try:
            # Check if assignment exists
            assignment = CapabilityDevelopmentLeadAssignment.query.get(assignment_id)
            if not assignment:
                Logger.warning("Assignment not found for update", assignment_id=assignment_id)
                raise LookupError(f"Assignment {assignment_id} not found")
            
            # Check for duplicate (excluding current assignment)
            duplicate = CapabilityDevelopmentLeadAssignment.query.filter(
                CapabilityDevelopmentLeadAssignment.assigned_employee_id == employee_id,
                CapabilityDevelopmentLeadAssignment.capability_development_lead_id == lead_id,
                CapabilityDevelopmentLeadAssignment.capability_development_lead_assignment_id != assignment_id
            ).first()
            
            if duplicate:
                Logger.warning("Update would create duplicate assignment", 
                              assignment_id=assignment_id,
                              employee_id=employee_id,
                              lead_id=lead_id)
                raise ValueError("This employee already has an assignment with this lead")
            
            # Update assignment
            assignment.assigned_employee_id = employee_id
            assignment.capability_development_lead_id = lead_id
            
            db.session.commit()
            
            Logger.info("Assignment updated successfully", assignment_id=assignment_id)
            return True
            
        except (ValueError, LookupError):
            raise  # Re-raise validation errors
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error updating assignment", 
                        assignment_id=assignment_id,
                        error=str(e))
            raise

    @staticmethod
    def delete_assignment(assignment_id: int) -> bool:
        """
        Deletes a capability lead assignment.
        
        Args:
            assignment_id: Assignment ID to delete
        
        Returns:
            True if deleted, False if not found
        
        Raises:
            ValueError: If assignment_id is None
            SQLAlchemyError: If database operation fails
        
        Example:
            >>> if CapabilityService.delete_assignment(456):
            ...     print("Deleted successfully")
        """
        if assignment_id is None:
            raise ValueError("Assignment ID cannot be None")
        
        Logger.info("Deleting capability lead assignment", assignment_id=assignment_id)
        
        try:
            assignment = CapabilityDevelopmentLeadAssignment.query.get(assignment_id)
            
            if not assignment:
                Logger.warning("Assignment not found for deletion", assignment_id=assignment_id)
                return False
            
            db.session.delete(assignment)
            db.session.commit()
            
            Logger.info("Assignment deleted successfully", assignment_id=assignment_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting assignment", 
                        assignment_id=assignment_id,
                        error=str(e))
            raise
