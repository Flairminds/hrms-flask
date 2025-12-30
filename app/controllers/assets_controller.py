"""
Assets controller module for handling IT asset management API endpoints.

This module provides HTTP request handlers for managing PCs, peripherals,
maintenance records, and asset assignments.
"""

from typing import Tuple
from flask import request, jsonify, Response

from ..services.asset_service import AssetService
from ..utils.logger import Logger


class AssetsController:
    """
    Controller for handling asset management HTTP requests.
    
    Provides REST API endpoints for:
    - PC inventory management
    - Peripheral device tracking
    - Maintenance record keeping
    - Asset assignments
    
    All endpoints return JSON responses with appropriate HTTP status codes.
    All operations are logged using centralized Logger.
    
    Example Routes:
        GET /api/assets/pcs - List all PCs
        POST /api/assets/pc/upsert - Create or update PC
        POST /api/assets/assign - Assign PC to employee
        GET /api/assets/maintenance - Get maintenance records
    
    Note:
        All methods are static and designed to be registered as Flask route handlers.
        Error responses hide internal details from users for security.
    """

    @staticmethod
    def get_pcs() -> Tuple[Response, int]:
        """
        Lists all computer systems in inventory.
        
        Returns all PCs with purchase and warranty information.
        
        Returns:
            Success (200):
            [
                {
                    "pcid": 123,
                    "pc_name": "LAPTOP-001",
                    "type": "Laptop",
                    "purchase_date": "2024-01-15",
                    "warranty_till": "2026-01-15"
                }
            ]
            
            Error (500): Server error
        
        Example:
            >>> # GET /api/assets/pcs
        """
        Logger.info("Get all PCs request received")
        
        try:
            pcs = AssetService.get_all_pcs()
            
            Logger.info("PCs retrieved successfully", count=len(pcs))
            
            return jsonify(pcs), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching PCs", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while fetching PCs. Please try again."
            }), 500

    @staticmethod
    def upsert_pc() -> Tuple[Response, int]:
        """
        Creates or updates a PC record.
        
        If PCID is provided, updates existing PC. Otherwise, creates new PC.
        
        Request Body (JSON):
            {
                "PCID": 123,  // Optional - for update
                "PCName": "LAPTOP-001",  // Required for create
                "Type": "Laptop",  // Required for create
                "PurchaseDate": "2024-01-15",  // Optional
                "WarrantyTill": "2026-01-15"  // Optional
            }
        
        Returns:
            Success (200):
            {
                "message": "PC information saved successfully"
            }
            
            Error (400): Missing required fields
            Error (500): Server error
        
        Example:
            >>> # POST /api/assets/pc/upsert
            >>> {
            ...   "PCName": "LAPTOP-001",
            ...   "Type": "Laptop"
            ... }
        
        Note:
            Supports both PascalCase (legacy) and snake_case keys.
        """
        Logger.info("PC upsert request received")
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("PC upsert request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            pc_id = data.get('PCID') or data.get('pcid')
            pc_name = data.get('PCName') or data.get('pc_name')
            pc_type = data.get('Type') or data.get('type')
            
            # Validate required fields for new PC
            if not pc_id and (not pc_name or not pc_type):
                Logger.warning("PC upsert missing required fields", has_id=bool(pc_id))
                return jsonify({
                    "message": "PCName and Type are required for new PC"
                }), 400
            
            Logger.debug("Upserting PC", 
                        pc_id=pc_id,
                        pc_name=pc_name,
                        operation="update" if pc_id else "create")
            
            success = AssetService.upsert_pc(data)
            
            if success:
                Logger.info("PC upserted successfully", 
                           pc_id=pc_id,
                           pc_name=pc_name)
                return jsonify({
                    "message": "PC information saved successfully"
                }), 200
            else:
                Logger.warning("PC upsert failed", pc_id=pc_id)
                return jsonify({
                    "message": "Failed to save PC information"
                }), 500
                
        except ValueError as ve:
            Logger.warning("PC upsert validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error during PC upsert", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while saving PC. Please try again."
            }), 500

    @staticmethod
    def assign_pc() -> Tuple[Response, int]:
        """
        Assigns a PC to an employee.
        
        Creates an assignment record linking a PC to an employee.
        
        Request Body (JSON):
            {
                "EmployeeID": "EMP001",
                "PCID": 123
            }
        
        Returns:
            Success (201):
            {
                "message": "PC assigned successfully",
                "assignment_id": 456
            }
            
            Error (400): Missing required fields
            Error (500): Server error
        
        Example:
            >>> # POST /api/assets/assign
            >>> {
            ...   "EmployeeID": "EMP001",
            ...   "PCID": 123
            ... }
        
        Note:
            Assignment may fail if PC is already assigned to another employee.
        """
        Logger.info("PC assignment request received")
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("PC assignment request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            employee_id = data.get('EmployeeID') or data.get('employee_id')
            pc_id = data.get('PCID') or data.get('pcid')
            
            # Validate required fields
            if not employee_id or not pc_id:
                missing = []
                if not employee_id:
                    missing.append('EmployeeID')
                if not pc_id:
                    missing.append('PCID')
                
                Logger.warning("PC assignment missing required fields", missing_fields=missing)
                return jsonify({
                    "message": f"Missing required fields: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Assigning PC to employee", 
                        employee_id=employee_id,
                        pc_id=pc_id)
            
            assignment_id = AssetService.assign_asset(employee_id, pc_id)
            
            if assignment_id:
                Logger.info("PC assigned successfully", 
                           employee_id=employee_id,
                           pc_id=pc_id,
                           assignment_id=assignment_id)
                return jsonify({
                    "message": "PC assigned successfully",
                    "assignment_id": assignment_id
                }), 201
            else:
                Logger.warning("PC assignment failed", 
                              employee_id=employee_id,
                              pc_id=pc_id)
                return jsonify({
                    "message": "Failed to assign PC. PC may already be assigned."
                }), 500
                
        except ValueError as ve:
            Logger.warning("PC assignment validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error during PC assignment", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while assigning PC. Please try again."
            }), 500

    @staticmethod
    def get_maintenance() -> Tuple[Response, int]:
        """
        Retrieves all maintenance records.
        
        Returns maintenance logs for all assets, ordered by date (most recent first).
        
        Returns:
            Success (200):
            [
                {
                    "maintenance_id": 789,
                    "pcid": 123,
                    "issue_description": "Screen flickering",
                    "maintenance_date": "2024-01-20",
                    "status": "Completed",
                    "notes": "Replaced LCD cable"
                }
            ]
            
            Error (500): Server error
        
        Example:
            >>> # GET /api/assets/maintenance
        """
        Logger.info("Get maintenance records request received")
        
        try:
            records = AssetService.get_maintenance_records()
            
            Logger.info("Maintenance records retrieved", count=len(records))
            
            return jsonify(records), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching maintenance records", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while fetching maintenance records. Please try again."
            }), 500

    @staticmethod
    def add_maintenance() -> Tuple[Response, int]:
        """
        Creates a new maintenance record.
        
        Request Body (JSON):
            {
                "pcid": 123,
                "issue_description": "Screen flickering",
                "maintenance_date": "2024-01-20",
                "status": "Pending",
                "notes": "Ordered replacement parts"
            }
        
        Returns:
            Success (201):
            {
                "message": "Maintenance record created successfully"
            }
            
            Error (400): Missing required fields
            Error (500): Server error
        """
        Logger.info("Add maintenance record request received")
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("Add maintenance request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            # Validate required fields
            required_fields = ['pcid', 'issue_description', 'status']
            missing = [f for f in required_fields if not data.get(f)]
            
            if missing:
                Logger.warning("Add maintenance missing required fields", missing_fields=missing)
                return jsonify({
                    "message": f"Missing required fields: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Adding maintenance record", pc_id=data.get('pcid'))
            
            success = AssetService.add_maintenance_record(data)
            
            if success:
                Logger.info("Maintenance record created", pc_id=data.get('pcid'))
                return jsonify({
                    "message": "Maintenance record created successfully"
                }), 201
            else:
                Logger.warning("Failed to create maintenance record", pc_id=data.get('pcid'))
                return jsonify({
                    "message": "Failed to create maintenance record"
                }), 500
                
        except ValueError as ve:
            Logger.warning("Maintenance validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error adding maintenance record", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while adding maintenance record. Please try again."
            }), 500

    @staticmethod
    def get_peripherals() -> Tuple[Response, int]:
        """
        Lists all peripheral devices.
        
        Returns:
            Success (200): Array of peripheral objects
            Error (500): Server error
        """
        Logger.info("Get peripherals request received")
        
        try:
            peripherals = AssetService.get_all_peripherals()
            
            Logger.info("Peripherals retrieved", count=len(peripherals))
            
            return jsonify(peripherals), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching peripherals", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while fetching peripherals. Please try again."
            }), 500
