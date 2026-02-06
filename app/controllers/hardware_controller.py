"""
Hardware management controller module for handling API endpoints.

This module provides HTTP request handlers for managing hardware assets,
assignments, and maintenance records.
"""

from typing import Tuple
from flask import request, jsonify, Response

from ..services.asset_service import AssetService
from ..utils.logger import Logger


class HardwareController:
    """
    Controller for handling hardware management HTTP requests.
    
    Provides REST API endpoints for:
    - Hardware asset management
    - Hardware assignments
    - Maintenance record tracking
    
    All endpoints return JSON responses with appropriate HTTP status codes.
    """

    # ============= HARDWARE ASSETS ENDPOINTS =============

    @staticmethod
    def get_all_hardware() -> Tuple[Response, int]:
        """Lists all hardware assets in inventory."""
        Logger.info("Get all hardware assets request received")
        
        try:
            assets = AssetService.get_all_hardware_assets()
            
            Logger.info("Hardware assets retrieved successfully", count=len(assets))
            
            return jsonify(assets), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching hardware assets", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while fetching hardware assets. Please try again."
            }), 500

    @staticmethod
    def create_hardware() -> Tuple[Response, int]:
        """Creates a new hardware asset."""
        Logger.info("Create hardware asset request received")
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("Create hardware request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            # Validate required fields
            required_fields = ['type', 'status']
            missing = [f for f in required_fields if not data.get(f)]
            
            if missing:
                Logger.warning("Create hardware missing required fields", missing_fields=missing)
                return jsonify({
                    "message": f"Missing required fields: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Creating hardware asset", type=data.get('type'))
            
            success = AssetService.create_hardware_asset(data)
            
            if success:
                Logger.info("Hardware asset created successfully", type=data.get('type'))
                return jsonify({
                    "message": "Hardware asset created successfully"
                }), 201
            else:
                Logger.warning("Failed to create hardware asset", type=data.get('type'))
                return jsonify({
                    "message": "Failed to create hardware asset"
                }), 500
                
        except ValueError as ve:
            Logger.warning("Hardware creation validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error creating hardware asset", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while creating hardware asset. Please try again."
            }), 500

    @staticmethod
    def update_hardware(asset_id: int) -> Tuple[Response, int]:
        """Updates an existing hardware asset."""
        Logger.info("Update hardware asset request received", asset_id=asset_id)
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("Update hardware request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            # Add asset_id to data
            data['asset_id'] = asset_id
            
            Logger.debug("Updating hardware asset", asset_id=asset_id)
            
            success = AssetService.update_hardware_asset(data)
            
            if success:
                Logger.info("Hardware asset updated successfully", asset_id=asset_id)
                return jsonify({
                    "message": "Hardware asset updated successfully"
                }), 200
            else:
                Logger.warning("Failed to update hardware asset", asset_id=asset_id)
                return jsonify({
                    "message": "Hardware asset not found or update failed"
                }), 404
                
        except ValueError as ve:
            Logger.warning("Hardware update validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error updating hardware asset", 
                        asset_id=asset_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while updating hardware asset. Please try again."
            }), 500

    @staticmethod
    def delete_hardware(asset_id: int) -> Tuple[Response, int]:
        """Deletes a hardware asset."""
        Logger.info("Delete hardware asset request received", asset_id=asset_id)
        
        try:
            Logger.debug("Deleting hardware asset", asset_id=asset_id)
            
            success = AssetService.delete_hardware_asset(asset_id)
            
            if success:
                Logger.info("Hardware asset deleted successfully", asset_id=asset_id)
                return jsonify({
                    "message": "Hardware asset deleted successfully"
                }), 200
            else:
                Logger.warning("Failed to delete hardware asset", asset_id=asset_id)
                return jsonify({
                    "message": "Hardware asset not found or has related records"
                }), 404
                
        except ValueError as ve:
            Logger.warning("Hardware deletion validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error deleting hardware asset", 
                        asset_id=asset_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while deleting hardware asset. Please try again."
            }), 500

    # ============= HARDWARE ASSIGNMENTS ENDPOINTS =============

    @staticmethod
    def get_all_assignments() -> Tuple[Response, int]:
        """Lists all hardware assignments."""
        Logger.info("Get all hardware assignments request received")
        
        try:
            assignments = AssetService.get_all_hardware_assignments()
            
            Logger.info("Hardware assignments retrieved successfully", count=len(assignments))
            
            return jsonify(assignments), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching assignments", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while fetching assignments. Please try again."
            }), 500

    @staticmethod
    def create_assignment() -> Tuple[Response, int]:
        """Creates a new hardware assignment."""
        Logger.info("Create hardware assignment request received")
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("Create assignment request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            # Validate required fields
            required_fields = ['asset_id', 'employee_id', 'assigned_by']
            missing = [f for f in required_fields if not data.get(f)]
            
            if missing:
                Logger.warning("Create assignment missing required fields", missing_fields=missing)
                return jsonify({
                    "message": f"Missing required fields: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Creating hardware assignment", 
                        asset_id=data.get('asset_id'),
                        employee_id=data.get('employee_id'))
            
            success = AssetService.create_hardware_assignment(data)
            
            if success:
                Logger.info("Hardware assignment created successfully")
                return jsonify({
                    "message": "Hardware assignment created successfully"
                }), 201
            else:
                Logger.warning("Failed to create hardware assignment")
                return jsonify({
                    "message": "Failed to create hardware assignment"
                }), 500
                
        except ValueError as ve:
            Logger.warning("Assignment creation validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error creating assignment", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while creating assignment. Please try again."
            }), 500

    @staticmethod
    def update_assignment(assignment_id: int) -> Tuple[Response, int]:
        """Updates a hardware assignment."""
        Logger.info("Update hardware assignment request received", assignment_id=assignment_id)
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("Update assignment request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            # Add assignment_id to data
            data['assignment_id'] = assignment_id
            
            Logger.debug("Updating hardware assignment", assignment_id=assignment_id)
            
            success = AssetService.update_hardware_assignment(data)
            
            if success:
                Logger.info("Hardware assignment updated successfully", assignment_id=assignment_id)
                return jsonify({
                    "message": "Hardware assignment updated successfully"
                }), 200
            else:
                Logger.warning("Failed to update hardware assignment", assignment_id=assignment_id)
                return jsonify({
                    "message": "Hardware assignment not found or update failed"
                }), 404
                
        except ValueError as ve:
            Logger.warning("Assignment update validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error updating assignment", 
                        assignment_id=assignment_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while updating assignment. Please try again."
            }), 500

    @staticmethod
    def delete_assignment(assignment_id: int) -> Tuple[Response, int]:
        """Deletes a hardware assignment."""
        Logger.info("Delete hardware assignment request received", assignment_id=assignment_id)
        
        try:
            Logger.debug("Deleting hardware assignment", assignment_id=assignment_id)
            
            success = AssetService.delete_hardware_assignment(assignment_id)
            
            if success:
                Logger.info("Hardware assignment deleted successfully", assignment_id=assignment_id)
                return jsonify({
                    "message": "Hardware assignment deleted successfully"
                }), 200
            else:
                Logger.warning("Failed to delete hardware assignment", assignment_id=assignment_id)
                return jsonify({
                    "message": "Hardware assignment not found"
                }), 404
                
        except ValueError as ve:
            Logger.warning("Assignment deletion validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error deleting assignment", 
                        assignment_id=assignment_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while deleting assignment. Please try again."
            }), 500

    # ============= HARDWARE MAINTENANCE ENDPOINTS =============

    @staticmethod
    def get_all_maintenance() -> Tuple[Response, int]:
        """Lists all hardware maintenance records."""
        Logger.info("Get all hardware maintenance request received")
        
        try:
            maintenance = AssetService.get_all_hardware_maintenance()
            
            Logger.info("Hardware maintenance retrieved successfully", count=len(maintenance))
            
            return jsonify(maintenance), 200
            
        except Exception as e:
            Logger.error("Unexpected error fetching maintenance", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while fetching maintenance records. Please try again."
            }), 500

    @staticmethod
    def create_maintenance() -> Tuple[Response, int]:
        """Creates a new hardware maintenance record."""
        Logger.info("Create hardware maintenance request received")
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("Create maintenance request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            # Validate required fields
            required_fields = ['asset_id', 'issue_description', 'status']
            missing = [f for f in required_fields if not data.get(f)]
            
            if missing:
                Logger.warning("Create maintenance missing required fields", missing_fields=missing)
                return jsonify({
                    "message": f"Missing required fields: {', '.join(missing)}"
                }), 400
            
            Logger.debug("Creating maintenance record", asset_id=data.get('asset_id'))
            
            success = AssetService.create_hardware_maintenance(data)
            
            if success:
                Logger.info("Maintenance record created successfully")
                return jsonify({
                    "message": "Maintenance record created successfully"
                }), 201
            else:
                Logger.warning("Failed to create maintenance record")
                return jsonify({
                    "message": "Failed to create maintenance record"
                }), 500
                
        except ValueError as ve:
            Logger.warning("Maintenance creation validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error creating maintenance", 
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while creating maintenance record. Please try again."
            }), 500

    @staticmethod
    def update_maintenance(maintenance_id: int) -> Tuple[Response, int]:
        """Updates a hardware maintenance record."""
        Logger.info("Update hardware maintenance request received", maintenance_id=maintenance_id)
        
        try:
            data = request.get_json()
            
            if not data:
                Logger.warning("Update maintenance request missing JSON body")
                return jsonify({"message": "Request body must be JSON"}), 400
            
            # Add maintenance_id to data
            data['maintenance_id'] = maintenance_id
            
            Logger.debug("Updating maintenance record", maintenance_id=maintenance_id)
            
            success = AssetService.update_hardware_maintenance(data)
            
            if success:
                Logger.info("Maintenance record updated successfully", maintenance_id=maintenance_id)
                return jsonify({
                    "message": "Maintenance record updated successfully"
                }), 200
            else:
                Logger.warning("Failed to update maintenance record", maintenance_id=maintenance_id)
                return jsonify({
                    "message": "Maintenance record not found or update failed"
                }), 404
                
        except ValueError as ve:
            Logger.warning("Maintenance update validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error updating maintenance", 
                        maintenance_id=maintenance_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while updating maintenance record. Please try again."
            }), 500

    @staticmethod
    def delete_maintenance(maintenance_id: int) -> Tuple[Response, int]:
        """Deletes a hardware maintenance record."""
        Logger.info("Delete hardware maintenance request received", maintenance_id=maintenance_id)
        
        try:
            Logger.debug("Deleting maintenance record", maintenance_id=maintenance_id)
            
            success = AssetService.delete_hardware_maintenance(maintenance_id)
            
            if success:
                Logger.info("Maintenance record deleted successfully", maintenance_id=maintenance_id)
                return jsonify({
                    "message": "Maintenance record deleted successfully"
                }), 200
            else:
                Logger.warning("Failed to delete maintenance record", maintenance_id=maintenance_id)
                return jsonify({
                    "message": "Maintenance record not found"
                }), 404
                
        except ValueError as ve:
            Logger.warning("Maintenance deletion validation error", error=str(ve))
            return jsonify({"message": str(ve)}), 400
            
        except Exception as e:
            Logger.error("Unexpected error deleting maintenance", 
                        maintenance_id=maintenance_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return jsonify({
                "message": "An error occurred while deleting maintenance record. Please try again."
            }), 500
