"""
Asset service module for managing organizational IT assets.

This module provides business logic for managing PCs, peripherals, maintenance records,
and asset assignments. Migrated from C# PCRepository, MaintenanceRepository, and
PeripheralRepository.
"""

from typing import Optional, List, Dict, Any
from datetime import date
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from ..utils.logger import Logger
from ..models.assets import db, HardwareAssets, HardwareAssignment, HardwareAssignmentHistory, HardwareMaintenance


class AssetService:
    """
    Service layer for IT asset management operations.
    
    Handles CRUD operations for hardware assets, assignments, and maintenance.
    All methods use SQLAlchemy ORM and centralized logging.
    """

    # ============= HARDWARE ASSETS CRUD OPERATIONS =============

    @staticmethod
    def get_all_hardware_assets() -> List[Dict[str, Any]]:
        """Retrieves all hardware assets from inventory."""
        Logger.info("Fetching all hardware assets")
        
        try:
            assets = HardwareAssets.query.order_by(HardwareAssets.asset_id).all()
            
            asset_list = [
                {
                    'asset_id': asset.asset_id,
                    'type': asset.type,
                    'brand': asset.brand,
                    'model': asset.model,
                    'serial_number': asset.serial_number,
                    'status': asset.status,
                    'purchase_date': asset.purchase_date.strftime('%Y-%m-%d') if asset.purchase_date else None,
                    'warranty_till': asset.warranty_till.strftime('%Y-%m-%d') if asset.warranty_till else None,
                    'notes': asset.notes
                }
                for asset in assets
            ]
            
            Logger.info("Hardware assets fetched successfully", count=len(asset_list))
            return asset_list
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching hardware assets", error=str(e))
            return []

    @staticmethod
    def create_hardware_asset(asset_data: Dict[str, Any]) -> bool:
        """Creates a new hardware asset."""
        if not asset_data.get('type'):
            raise ValueError("Asset type is required")
        if not asset_data.get('status'):
            raise ValueError("Asset status is required")
        
        Logger.info("Creating new hardware asset", type=asset_data.get('type'))
        
        try:
            new_asset = HardwareAssets(
                type=asset_data['type'],
                brand=asset_data.get('brand'),
                model=asset_data.get('model'),
                serial_number=asset_data.get('serial_number'),
                status=asset_data['status'],
                purchase_date=asset_data.get('purchase_date'),
                warranty_till=asset_data.get('warranty_till'),
                notes=asset_data.get('notes')
            )
            
            db.session.add(new_asset)
            db.session.commit()
            
            Logger.info("Hardware asset created successfully", type=asset_data['type'])
            return True
            
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Integrity error creating hardware asset", error=str(e))
            return False
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error creating hardware asset", error=str(e))
            return False

    @staticmethod
    def update_hardware_asset(asset_data: Dict[str, Any]) -> bool:
        """Updates existing hardware asset."""
        asset_id = asset_data.get('asset_id')
        if asset_id is None:
            raise ValueError("Asset ID is required for update")
        
        Logger.info("Updating hardware asset", asset_id=asset_id)
        
        try:
            asset = HardwareAssets.query.get(asset_id)
            
            if not asset:
                Logger.warning("Hardware asset not found for update", asset_id=asset_id)
                return False
            
            asset.type = asset_data.get('type', asset.type)
            asset.brand = asset_data.get('brand', asset.brand)
            asset.model = asset_data.get('model', asset.model)
            asset.serial_number = asset_data.get('serial_number', asset.serial_number)
            asset.status = asset_data.get('status', asset.status)
            asset.purchase_date = asset_data.get('purchase_date', asset.purchase_date)
            asset.warranty_till = asset_data.get('warranty_till', asset.warranty_till)
            asset.notes = asset_data.get('notes', asset.notes)
            
            db.session.commit()
            
            Logger.info("Hardware asset updated successfully", asset_id=asset_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error updating hardware asset", asset_id=asset_id, error=str(e))
            return False

    @staticmethod
    def delete_hardware_asset(asset_id: int) -> bool:
        """Deletes a hardware asset."""
        if asset_id is None:
            raise ValueError("Asset ID cannot be None")
        
        Logger.info("Deleting hardware asset", asset_id=asset_id)
        
        try:
            asset = HardwareAssets.query.get(asset_id)
            
            if not asset:
                Logger.warning("Hardware asset not found for deletion", asset_id=asset_id)
                return False
            
            db.session.delete(asset)
            db.session.commit()
            
            Logger.info("Hardware asset deleted successfully", asset_id=asset_id)
            return True
            
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Cannot delete hardware asset - has related records", asset_id=asset_id, error=str(e))
            return False
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting hardware asset", asset_id=asset_id, error=str(e))
            return False

    # ============= HARDWARE ASSIGNMENTS CRUD OPERATIONS =============

    @staticmethod
    def get_all_hardware_assignments() -> List[Dict[str, Any]]:
        """Retrieves all hardware assignments including history."""
        Logger.info("Fetching all hardware assignments")
        
        try:
            assignments = HardwareAssignment.query.order_by(
                HardwareAssignment.assignment_date.desc()
            ).all()
            
            assignment_list = [
                {
                    'assignment_id': assignment.assignment_id,
                    'asset_id': assignment.asset_id,
                    'employee_id': assignment.employee_id,
                    'assignment_date': assignment.assignment_date.strftime('%Y-%m-%d') if assignment.assignment_date else None,
                    'assigned_by': assignment.assigned_by,
                    'return_date': assignment.return_date.strftime('%Y-%m-%d') if assignment.return_date else None,
                    'returned_by': assignment.returned_by,
                    'status': assignment.status,
                    'condition_at_assignment': assignment.condition_at_assignment,
                    'condition_at_return': assignment.condition_at_return,
                    'assignment_notes': assignment.assignment_notes,
                    'return_notes': assignment.return_notes
                }
                for assignment in assignments
            ]
            
            Logger.info("Hardware assignments fetched", count=len(assignment_list))
            return assignment_list
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching assignments", error=str(e))
            return []

    @staticmethod
    def create_hardware_assignment(assignment_data: Dict[str, Any]) -> bool:
        """Creates a new hardware assignment."""
        if not assignment_data.get('asset_id'):
            raise ValueError("Asset ID is required")
        if not assignment_data.get('employee_id'):
            raise ValueError("Employee ID is required")
        if not assignment_data.get('assigned_by'):
            raise ValueError("Assigned by is required")
        
        Logger.info("Creating hardware assignment", 
                   asset_id=assignment_data.get('asset_id'),
                   employee_id=assignment_data.get('employee_id'))
        
        try:
            new_assignment = HardwareAssignment(
                asset_id=assignment_data['asset_id'],
                employee_id=assignment_data['employee_id'],
                assignment_date=assignment_data.get('assignment_date', date.today()),
                assigned_by=assignment_data['assigned_by'],
                status=assignment_data.get('status', 'Active'),
                condition_at_assignment=assignment_data.get('condition_at_assignment'),
                assignment_notes=assignment_data.get('assignment_notes')
            )
            
            db.session.add(new_assignment)
            db.session.commit()
            
            Logger.info("Hardware assignment created", assignment_id=new_assignment.assignment_id)
            return True
            
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Integrity error creating assignment", error=str(e))
            return False
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error creating assignment", error=str(e))
            return False

    @staticmethod
    def update_hardware_assignment(assignment_data: Dict[str, Any]) -> bool:
        """Updates hardware assignment (typically for returns)."""
        assignment_id = assignment_data.get('assignment_id')
        if not assignment_id:
            raise ValueError("Assignment ID is required")
        
        Logger.info("Updating hardware assignment", assignment_id=assignment_id)
        
        try:
            assignment = HardwareAssignment.query.get(assignment_id)
            
            if not assignment:
                Logger.warning("Assignment not found", assignment_id=assignment_id)
                return False
            
            assignment.return_date = assignment_data.get('return_date', assignment.return_date)
            assignment.returned_by = assignment_data.get('returned_by', assignment.returned_by)
            assignment.status = assignment_data.get('status', assignment.status)
            assignment.condition_at_return = assignment_data.get('condition_at_return', assignment.condition_at_return)
            assignment.return_notes = assignment_data.get('return_notes', assignment.return_notes)
            
            db.session.commit()
            
            Logger.info("Hardware assignment updated", assignment_id=assignment_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error updating assignment", assignment_id=assignment_id, error=str(e))
            return False

    @staticmethod
    def delete_hardware_assignment(assignment_id: int) -> bool:
        """Deletes a hardware assignment."""
        if not assignment_id:
            raise ValueError("Assignment ID is required")
        
        Logger.info("Deleting hardware assignment", assignment_id=assignment_id)
        
        try:
            assignment = HardwareAssignment.query.get(assignment_id)
            
            if not assignment:
                Logger.warning("Assignment not found", assignment_id=assignment_id)
                return False
            
            db.session.delete(assignment)
            db.session.commit()
            
            Logger.info("Hardware assignment deleted", assignment_id=assignment_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting assignment", assignment_id=assignment_id, error=str(e))
            return False

    # ============= HARDWARE MAINTENANCE CRUD OPERATIONS =============

    @staticmethod
    def get_all_hardware_maintenance() -> List[Dict[str, Any]]:
        """Retrieves all hardware maintenance records."""
        Logger.info("Fetching all hardware maintenance records")
        
        try:
            records = HardwareMaintenance.query.order_by(
                HardwareMaintenance.maintenance_date.desc()
            ).all()
            
            maintenance_list = [
                {
                    'maintenance_id': rec.maintenance_id,
                    'asset_id': rec.asset_id,
                    'issue_description': rec.issue_description,
                    'maintenance_date': rec.maintenance_date.strftime('%Y-%m-%d') if rec.maintenance_date else None,
                    'status': rec.status,
                    'notes': rec.notes
                }
                for rec in records
            ]
            
            Logger.info("Maintenance records fetched", count=len(maintenance_list))
            return maintenance_list
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching maintenance", error=str(e))
            return []

    @staticmethod
    def create_hardware_maintenance(maintenance_data: Dict[str, Any]) -> bool:
        """Creates a new hardware maintenance record."""
        if not maintenance_data.get('asset_id'):
            raise ValueError("Asset ID is required")
        if not maintenance_data.get('issue_description'):
            raise ValueError("Issue description is required")
        if not maintenance_data.get('status'):
            raise ValueError("Status is required")
        
        Logger.info("Creating maintenance record", asset_id=maintenance_data.get('asset_id'))
        
        try:
            new_record = HardwareMaintenance(
                asset_id=maintenance_data['asset_id'],
                issue_description=maintenance_data['issue_description'],
                maintenance_date=maintenance_data.get('maintenance_date', date.today()),
                status=maintenance_data['status'],
                notes=maintenance_data.get('notes')
            )
            
            db.session.add(new_record)
            db.session.commit()
            
            Logger.info("Maintenance record created", maintenance_id=new_record.maintenance_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error creating maintenance", error=str(e))
            return False

    @staticmethod
    def update_hardware_maintenance(maintenance_data: Dict[str, Any]) -> bool:
        """Updates hardware maintenance record."""
        maintenance_id = maintenance_data.get('maintenance_id')
        if not maintenance_id:
            raise ValueError("Maintenance ID is required")
        
        Logger.info("Updating maintenance record", maintenance_id=maintenance_id)
        
        try:
            record = HardwareMaintenance.query.get(maintenance_id)
            
            if not record:
                Logger.warning("Maintenance record not found", maintenance_id=maintenance_id)
                return False
            
            record.asset_id = maintenance_data.get('asset_id', record.asset_id)
            record.issue_description = maintenance_data.get('issue_description', record.issue_description)
            record.maintenance_date = maintenance_data.get('maintenance_date', record.maintenance_date)
            record.status = maintenance_data.get('status', record.status)
            record.notes = maintenance_data.get('notes', record.notes)
            
            db.session.commit()
            
            Logger.info("Maintenance record updated", maintenance_id=maintenance_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error updating maintenance", maintenance_id=maintenance_id, error=str(e))
            return False

    @staticmethod
    def delete_hardware_maintenance(maintenance_id: int) -> bool:
        """Deletes a hardware maintenance record."""
        if not maintenance_id:
            raise ValueError("Maintenance ID is required")
        
        Logger.info("Deleting maintenance record", maintenance_id=maintenance_id)
        
        try:
            record = HardwareMaintenance.query.get(maintenance_id)
            
            if not record:
                Logger.warning("Maintenance record not found", maintenance_id=maintenance_id)
                return False
            
            db.session.delete(record)
            db.session.commit()
            
            Logger.info("Maintenance record deleted", maintenance_id=maintenance_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting maintenance", maintenance_id=maintenance_id, error=str(e))
            return False