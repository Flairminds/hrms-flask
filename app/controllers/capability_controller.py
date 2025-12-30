"""
Capability controller module for capability development lead management API endpoints.

This module provides HTTP request handlers for managing capability development leads
and their employee assignments.
"""

from typing import Tuple
from flask import jsonify, request, Response

from ..services.capability_service import CapabilityService
from ..utils.logger import Logger


class CapabilityController:
    """
    Controller for capability development lead and assignment APIs.
    
    Provides REST API endpoints for:
    - Creating and managing capability development leads
    - Assigning employees to leads
    - Updating and deleting assignments
    
    All endpoints return JSON responses with appropriate HTTP status codes.
    All operations are logged using centralized Logger.
    
    Example Routes:
        GET /api/capability/leads - List all leads
        POST /api/capability/leads - Create new leads
        DELETE /api/capability/leads/<id> - Delete lead
        GET /api/capability/assignments - List assignments
        POST /api/capability/assignments - Create assignment
        PUT /api/capability/assignments/<id> - Update assignment
        DELETE /api/capability/assignments/<id> - Delete assignment
    
    Note:
        All methods are static and designed to be registered as Flask route handlers.
        Error responses hide internal details from users for security.
    """

    # ============= CAPABILITY DEVELOPMENT LEADS =============

    @staticmethod
    def get_leads() -> Tuple[Response, int]:
        """
        Retrieves all capability development leads.
        
        Returns:
            Success (200):
            {
                "status": "success",
                "data": [
                    {
                        "CapabilityDevelopmentLeadId": 123,
                        "EmployeeId": "EMP001"
                    }
                ],
                "message": "Capability Development Leads retrieved successfully"
            }
            
            Error (500): Server error
        
        Example:
            >>> # GET /api/capability/leads
        """
        Logger.info("Get capability leads request received")
        
        try:
            leads = CapabilityService.get_leads()
            
            Logger.info("Capability leads retrieved successfully", count=len(leads))
            
            return jsonify({
                "status": "success",
                "data": leads,
                "message": "Capability Development Leads retrieved successfully"
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching capability leads", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching leads. Please try again."
            }), 500

    @staticmethod
    def create_leads() -> Tuple[Response, int]:
        """
        Creates new capability development leads for specified employees.
        
        Request Body (JSON):
            {
                "employeeIds": ["EMP001", "EMP002", "EMP003"]
            }
        
        Returns:
            Success (201):
            {
                "status": "success",
                "data": [
                    {
                        "EmployeeId": "EMP001",
                        "CapabilityDevelopmentLeadId": 123
                    }
                ],
                "message": "Capability Development Leads added successfully"
            }
            
            Error (400): Missing or invalid employee IDs
            Error (500): Server error
        
        Example:
            >>> # POST /api/capability/leads
            >>> {"employeeIds": ["EMP001", "EMP002"]}
        
        Note:
            Employees already designated as leads are silently skipped.
        """
        Logger.info("Create capability leads request received")
        
        try:
            data = request.get_json() or {}
            employee_ids = data.get("employeeIds")
            
            # Validate request
            if not employee_ids:
                Logger.warning("Create leads request missing employeeIds")
                return jsonify({
                    "status": "error",
                    "message": "employeeIds is required"
                }), 400
            
            Logger.debug("Creating leads", employee_count=len(employee_ids) if isinstance(employee_ids, list) else 0)
            
            new_leads = CapabilityService.create_leads(employee_ids)
            
            Logger.info("Capability leads created successfully", 
                       requested=len(employee_ids),
                       created=len(new_leads))
            
            return jsonify({
                "status": "success",
                "data": new_leads,
                "message": "Capability Development Leads added successfully"
            }), 201
            
        except ValueError as ve:
            Logger.warning("Capability lead creation validation error", error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 400
            
        except Exception as e:
            Logger.error("Unexpected error creating capability leads", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while creating leads. Please try again."
            }), 500

    @staticmethod
    def delete_lead(lead_id: int) -> Tuple[Response, int]:
        """
        Deletes a capability development lead and all assignments.
        
        Args:
            lead_id: Lead ID from URL parameter
        
        Returns:
            Success (200):
            {
                "status": "success",
                "data": {
                    "deletedLeadId": 123,
                    "deletedAssignmentIds": [456, 789]
                },
                "message": "Capability Development Lead and related assignments deleted successfully"
            }
            
            Error (404): Lead not found
            Error (500): Server error
        
        Example:
            >>> # DELETE /api/capability/leads/123
        """
        Logger.info("Delete capability lead request received", lead_id=lead_id)
        
        try:
            payload = CapabilityService.delete_lead(lead_id)
            
            Logger.info("Capability lead deleted successfully", 
                       lead_id=lead_id,
                       assignments_deleted=len(payload.get('deletedAssignmentIds', [])))
            
            return jsonify({
                "status": "success",
                "data": payload,
                "message": "Capability Development Lead and related assignments deleted successfully"
            }), 200
            
        except LookupError as le:
            Logger.warning("Lead not found for deletion", lead_id=lead_id, error=str(le))
            return jsonify({
                "status": "error",
                "message": str(le)
            }), 404
            
        except ValueError as ve:
            Logger.warning("Invalid lead ID for deletion", lead_id=lead_id, error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 400
            
        except Exception as e:
            Logger.error("Unexpected error deleting capability lead", 
                        lead_id=lead_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while deleting lead. Please try again."
            }), 500

    # ============= CAPABILITY LEAD ASSIGNMENTS =============

    @staticmethod
    def get_assignments() -> Tuple[Response, int]:
        """
        Retrieves all capability lead assignments.
        
        Returns:
            Success (200): List of assignment objects
            Error (500): Server error
        
        Example:
            >>> # GET /api/capability/assignments
        """
        Logger.info("Get capability assignments request received")
        
        try:
            assignments = CapabilityService.get_assignments()
            
            Logger.info("Assignments retrieved successfully", count=len(assignments))
            
            return jsonify({
                "status": "success",
                "data": assignments,
                "message": "Assigned Capability Leads retrieved successfully"
            }), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching assignments", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while fetching assignments. Please try again."
            }), 500

    @staticmethod
    def create_assignment() -> Tuple[Response, int]:
        """
        Creates a new capability lead assignment.
        
        Request Body (JSON):
            {
                "employeeId": "EMP001",
                "leadId": 123
            }
        
        Returns:
            Success (201):
            {
                "status": "success",
                "data": {
                    "CapabilityDevelopmentLeadAssignmentId": 456
                },
                "message": "Assignment created successfully"
            }
            
            Error (400): Missing fields or duplicate assignment
            Error (404): Lead not found
            Error (500): Server error
        
        Example:
            >>> # POST /api/capability/assignments
            >>> {"employeeId": "EMP001", "leadId": 123}
        """
        Logger.info("Create capability assignment request received")
        
        try:
            data = request.get_json() or {}
            emp_id = data.get("employeeId")
            lead_id = data.get("leadId")
            
            # Validate request
            missing = []
            if not emp_id:
                missing.append("employeeId")
            if not lead_id:
                missing.append("leadId")
            
            if missing:
                Logger.warning("Create assignment missing required fields", missing_fields=missing)
                return jsonify({
                    "status": "error",
                    "message": f"Missing required fields: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Creating assignment", employee_id=emp_id, lead_id=lead_id)
            
            assignment_id = CapabilityService.create_assignment(emp_id, lead_id)
            
            Logger.info("Assignment created successfully", 
                       employee_id=emp_id,
                       lead_id=lead_id,
                       assignment_id=assignment_id)
            
            return jsonify({
                "status": "success",
                "data": {
                    "CapabilityDevelopmentLeadAssignmentId": assignment_id
                },
                "message": "Assignment created successfully"
            }), 201
            
        except ValueError as ve:
            Logger.warning("Assignment creation validation error", error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 400
            
        except LookupError as le:
            Logger.warning("Assignment creation failed - resource not found", error=str(le))
            return jsonify({
                "status": "error",
                "message": str(le)
            }), 404
            
        except Exception as e:
            Logger.error("Unexpected error creating assignment", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while creating assignment. Please try again."
            }), 500

    @staticmethod
    def update_assignment(assignment_id: int) -> Tuple[Response, int]:
        """
        Updates an existing capability lead assignment.
        
        Args:
            assignment_id: Assignment ID from URL parameter
        
        Request Body (JSON):
            {
                "employeeId": "EMP002",
                "leadId": 789
            }
        
        Returns:
            Success (200): Assignment updated
            Error (400): Missing fields or duplicate
            Error (404): Assignment not found
            Error (500): Server error
        
        Example:
            >>> # PUT /api/capability/assignments/456
            >>> {"employeeId": "EMP002", "leadId": 789}
        """
        Logger.info("Update capability assignment request received", assignment_id=assignment_id)
        
        try:
            data = request.get_json() or {}
            emp_id = data.get("employeeId")
            lead_id = data.get("leadId")
            
            # Validate request
            missing = []
            if not emp_id:
                missing.append("employeeId")
            if not lead_id:
                missing.append("leadId")
            
            if missing:
                Logger.warning("Update assignment missing required fields", 
                              assignment_id=assignment_id,
                              missing_fields=missing)
                return jsonify({
                    "status": "error",
                    "message": f"Missing required fields: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Updating assignment", 
                        assignment_id=assignment_id,
                        employee_id=emp_id,
                        lead_id=lead_id)
            
            CapabilityService.update_assignment(assignment_id, emp_id, lead_id)
            
            Logger.info("Assignment updated successfully", assignment_id=assignment_id)
            
            return jsonify({
                "status": "success",
                "data": {
                    "CapabilityDevelopmentLeadAssignmentId": assignment_id
                },
                "message": "Assignment updated successfully"
            }), 200
            
        except ValueError as ve:
            Logger.warning("Assignment update validation error", 
                          assignment_id=assignment_id,
                          error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 400
            
        except LookupError as le:
            Logger.warning("Assignment not found for update", 
                          assignment_id=assignment_id,
                          error=str(le))
            return jsonify({
                "status": "error",
                "message": str(le)
            }), 404
            
        except Exception as e:
            Logger.error("Unexpected error updating assignment", 
                        assignment_id=assignment_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while updating assignment. Please try again."
            }), 500

    @staticmethod
    def delete_assignment(assignment_id: int) -> Tuple[Response, int]:
        """
        Deletes a capability lead assignment.
        
        Args:
            assignment_id: Assignment ID from URL parameter
        
        Returns:
            Success (200): Assignment deleted
            Error (404): Assignment not found
            Error (500): Server error
        
        Example:
            >>> # DELETE /api/capability/assignments/456
        """
        Logger.info("Delete capability assignment request received", assignment_id=assignment_id)
        
        try:
            success = CapabilityService.delete_assignment(assignment_id)
            
            if success:
                Logger.info("Assignment deleted successfully", assignment_id=assignment_id)
                return jsonify({
                    "status": "success",
                    "data": {},
                    "message": "Assignment deleted successfully"
                }), 200
            else:
                Logger.warning("Assignment not found for deletion", assignment_id=assignment_id)
                return jsonify({
                    "status": "error",
                    "message": f"Assignment {assignment_id} not found"
                }), 404
                
        except ValueError as ve:
            Logger.warning("Invalid assignment ID for deletion", 
                          assignment_id=assignment_id,
                          error=str(ve))
            return jsonify({
                "status": "error",
                "message": str(ve)
            }), 400
            
        except Exception as e:
            Logger.error("Unexpected error deleting assignment", 
                        assignment_id=assignment_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "status": "error",
                "message": "An error occurred while deleting assignment. Please try again."
            }), 500
