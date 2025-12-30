"""
Allocation controller module for handling project allocation API endpoints.

This module provides HTTP request handlers for assigning employees to projects
and managing project allocations.
"""

from typing import Tuple
from flask import request, jsonify, Response
from sqlalchemy.exc import IntegrityError

from ..services.allocation_service import AllocationService
from ..utils.logger import Logger


class AllocationController:
    """
    Controller for handling allocation-related HTTP requests.
    
    Provides REST API endpoints for assigning employees to projects
    and querying project allocations.
    
    All endpoints return JSON responses with appropriate HTTP status codes.
    All operations are logged using centralized Logger.
    
    Example Routes:
        POST /api/allocations/assign - Assign employee to project
        GET /api/allocations/employee/<emp_id> - Get employee allocations
    
    Note:
        All methods are static and designed to be registered as Flask route handlers.
        Error responses hide internal details from users for security.
    """

    @staticmethod
    def assign_employee() -> Tuple[Response, int]:
        """
        Assigns an employee to a project with specified allocation.
        
        Creates a new allocation record associating employee with project
        and work category.
        
        Request Body (JSON):
            {
                "employee_id": "EMP001",
                "project_id": "PROJ123",
                "work_category_id": "DEVELOPER",
                "allocation": 0.8
            }
        
        Returns:
            Success (201):
            {
                "message": "Employee EMP001 assigned to project PROJ123 successfully",
                "allocation": {
                    "employee_id": "EMP001",
                    "project_id": "PROJ123",
                    "work_category_id": "DEVELOPER",
                    "allocation": 0.8
                }
            }
            
            Error (400): Missing required fields or invalid data
            Error (404): Employee or project not found
            Error (409): Employee already assigned to project
            Error (500): Server error
        
        Example:
            >>> # POST /api/allocations/assign
            >>> {
            ...   "employee_id": "EMP001",
            ...   "project_id": "PROJ123",
            ...   "work_category_id": "DEVELOPER",
            ...   "allocation": 0.8
            ... }
        
        Note:
            - allocation defaults to 1.0 if not provided
            - Duplicate assignments return 409 Conflict
            - Work category is not validated against master list
        """
        Logger.info("Employee assignment request received")
        
        try:
            # Validate request has JSON body
            data = request.get_json()
            if not data:
                Logger.warning("Assignment request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            # Extract parameters
            employee_id = data.get('employee_id', '').strip()
            project_id = data.get('project_id', '').strip()
            work_category_id = data.get('work_category_id', '').strip()
            allocation = data.get('allocation', 1.0)
            
            # Validate required fields
            if not employee_id or not project_id or not work_category_id:
                missing_fields = []
                if not employee_id:
                    missing_fields.append('employee_id')
                if not project_id:
                    missing_fields.append('project_id')
                if not work_category_id:
                    missing_fields.append('work_category_id')
                
                Logger.warning("Assignment request missing required fields", 
                              missing_fields=missing_fields)
                return jsonify({
                    "message": f"Missing required fields: {', '.join(missing_fields)}"
                }), 400
            
            # Validate allocation value type and range
            try:
                allocation = float(allocation)
                if allocation <= 0:
                    Logger.warning("Assignment request with invalid allocation", 
                                  employee_id=employee_id,
                                  allocation=allocation)
                    return jsonify({
                        "message": "Allocation must be greater than 0"
                    }), 400
            except (ValueError, TypeError):
                Logger.warning("Assignment request with non-numeric allocation", 
                              employee_id=employee_id,
                              allocation=allocation)
                return jsonify({
                    "message": "Allocation must be a number"
                }), 400
            
            Logger.debug("Assigning employee to project", 
                        employee_id=employee_id,
                        project_id=project_id,
                        work_category_id=work_category_id,
                        allocation=allocation)
            
            # Assign employee
            AllocationService.assign_employee(
                emp_id=employee_id,
                proj_id=project_id,
                cat_id=work_category_id,
                allocation=allocation
            )
            
            Logger.info("Employee assigned successfully", 
                       employee_id=employee_id,
                       project_id=project_id)
            
            return jsonify({
                "message": f"Employee {employee_id} assigned to project {project_id} successfully",
                "allocation": {
                    "employee_id": employee_id,
                    "project_id": project_id,
                    "work_category_id": work_category_id,
                    "allocation": allocation
                }
            }), 201
            
        except ValueError as ve:
            # Input validation error
            Logger.warning("Assignment validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except LookupError as le:
            # Employee or project not found
            Logger.warning("Assignment failed - resource not found", error=str(le))
            return jsonify({"message": str(le)}), 404
            
        except IntegrityError as ie:
            # Duplicate assignment or constraint violation
            Logger.warning("Assignment failed - integrity error", error=str(ie))
            
            # Provide user-friendly message
            if 'already assigned' in str(ie).lower():
                return jsonify({
                    "message": f"Employee {employee_id} is already assigned to project {project_id}"
                }), 409
            else:
                return jsonify({
                    "message": "Assignment failed due to data constraint violation"
                }), 409
            
        except Exception as e:
            # Unexpected error - log details but hide from user
            Logger.error("Unexpected error during employee assignment", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while assigning employee. Please try again."
            }), 500
    
    @staticmethod
    def get_employee_allocations(emp_id: str) -> Tuple[Response, int]:
        """
        Retrieves all project allocations for an employee.
        
        Args:
            emp_id: Employee ID from URL parameter
        
        Returns:
            Success (200):
            {
                "employee_id": "EMP001",
                "allocations": [
                    {
                        "project_id": "PROJ123",
                        "work_category_id": "DEVELOPER",
                        "allocation": 0.8
                    }
                ]
            }
            
            Error (400): Invalid employee ID
            Error (500): Server error
        
        Example:
            >>> # GET /api/allocations/employee/EMP001
        """
        Logger.info("Get employee allocations request", employee_id=emp_id)
        
        try:
            # Validate employee ID
            if not emp_id or not emp_id.strip():
                Logger.warning("Get allocations request with empty employee ID")
                return jsonify({"message": "Employee ID is required"}), 400
            
            # Get allocations
            allocations = AllocationService.get_employee_allocations(emp_id)
            
            Logger.info("Employee allocations retrieved", 
                       employee_id=emp_id,
                       count=len(allocations))
            
            return jsonify({
                "employee_id": emp_id,
                "allocations": allocations,
                "total_allocation": sum(a['allocation'] for a in allocations)
            }), 200
            
        except ValueError as ve:
            Logger.warning("Get allocations validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error fetching allocations", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while fetching allocations. Please try again."
            }), 500
