"""
Asset service module for managing organizational IT assets.

This module provides business logic for managing PCs, peripherals, maintenance records,
and asset assignments. Migrated from C# PCRepository, MaintenanceRepository, and
PeripheralRepository.
"""

from typing import Optional, List, Dict, Any
from datetime import date
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from ..models.assets import db, PC, Peripheral, PCAssignment, MaintenanceLog
from ..utils.logger import Logger


class AssetService:
    """
    Service layer for IT asset management operations.
    
    Handles CRUD operations for:
    - PCs/Computers
    - Peripherals (keyboards, mice, monitors, etc.)
    - Maintenance records
    - Asset assignments to employees
    
    All methods use SQLAlchemy ORM and centralized logging.
    
    Example Usage:
        >>> # Get all PCs
        >>> pcs = AssetService.get_all_pcs()
        >>>
        >>> # Add maintenance record
        >>> AssetService.add_maintenance_record({
        ...     'pcid': 'PC001',
        ...     'issue_description': 'Screen flickering',
        ...     'status': 'Pending'
        ... })
    
    Note:
        All database operations use transactions with automatic rollback on error.
        All methods log operations using Logger with appropriate context.
    """

    # ============= PC CRUD OPERATIONS =============

    @staticmethod
    def get_all_pcs() -> List[Dict[str, Any]]:
        """
        Retrieves all PC records from inventory.
        
        Returns all PCs ordered by PC ID, including purchase and warranty information.
        
        Returns:
            List of PC dictionaries, each containing:
            - pcid (int): PC identifier
            - pc_name (str): PC name/hostname
            - type (str): PC type (e.g., 'Laptop', 'Desktop')
            - purchase_date (str): Purchase date in YYYY-MM-DD format
            - warranty_till (str): Warranty expiry in YYYY-MM-DD format
            Empty list if no PCs found or error occurs.
        
        Example:
            >>> pcs = AssetService.get_all_pcs()
            >>> for pc in pcs:
            ...     print(f"{pc['pc_name']}: {pc['type']}")
        """
        Logger.info("Fetching all PC records")
        
        try:
            pcs = PC.query.order_by(PC.pc_id).all()
            
            pc_list = [
                {
                    'pcid': pc.pc_id,
                    'pc_name': pc.pc_name,
                    'type': pc.type,
                    'purchase_date': pc.purchase_date.strftime('%Y-%m-%d') if pc.purchase_date else None,
                    'warranty_till': pc.warranty_till.strftime('%Y-%m-%d') if pc.warranty_till else None
                }
                for pc in pcs
            ]
            
            Logger.info("PC records fetched successfully", count=len(pc_list))
            return pc_list
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching PCs", error=str(e))
            return []
        except Exception as e:
            Logger.critical("Unexpected error fetching PCs", error=str(e))
            return []

    @staticmethod
    def get_pc_by_id(pc_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieves a specific PC by its ID.
        
        Args:
            pc_id: PC identifier to retrieve
        
        Returns:
            PC dictionary if found, None otherwise
        
        Raises:
            ValueError: If pc_id is None or invalid
        
        Example:
            >>> pc = AssetService.get_pc_by_id(123)
            >>> if pc:
            ...     print(f"Found: {pc['pc_name']}")
        """
        if pc_id is None:
            raise ValueError("PC ID cannot be None")
        
        Logger.debug("Fetching PC by ID", pc_id=pc_id)
        
        try:
            pc = PC.query.get(pc_id)
            
            if pc:
                Logger.debug("PC found", pc_id=pc_id, pc_name=pc.pc_name)
                return {
                    'pcid': pc.pc_id,
                    'pc_name': pc.pc_name,
                    'type': pc.type,
                    'purchase_date': pc.purchase_date.strftime('%Y-%m-%d') if pc.purchase_date else None,
                    'warranty_till': pc.warranty_till.strftime('%Y-%m-%d') if pc.warranty_till else None
                }
            else:
                Logger.warning("PC not found", pc_id=pc_id)
                return None
                
        except SQLAlchemyError as e:
            Logger.error("Database error fetching PC", pc_id=pc_id, error=str(e))
            return None

    @staticmethod
    def insert_pc(pc_details: Dict[str, Any]) -> bool:
        """
        Creates a new PC record in inventory.
        
        Args:
            pc_details: Dictionary containing:
                - pc_name (str): PC name/hostname (required)
                - type (str): PC type (required)
                - purchase_date (date, optional): Purchase date
                - warranty_till (date, optional): Warranty expiry date
        
        Returns:
            True if successful, False otherwise
        
        Raises:
            ValueError: If required fields are missing
        
        Example:
            >>> AssetService.insert_pc({
            ...     'pc_name': 'LAPTOP-001',
            ...     'type': 'Laptop',
            ...     'purchase_date': '2024-01-15'
            ... })
            True
        """
        # Validate required fields
        if not pc_details.get('pc_name'):
            raise ValueError("PC name is required")
        if not pc_details.get('type'):
            raise ValueError("PC type is required")
        
        Logger.info("Creating new PC", pc_name=pc_details.get('pc_name'))
        
        try:
            new_pc = PC(
                pc_name=pc_details['pc_name'],
                type=pc_details['type'],
                purchase_date=pc_details.get('purchase_date'),
                warranty_till=pc_details.get('warranty_till')
            )
            
            db.session.add(new_pc)
            db.session.commit()
            
            Logger.info("PC created successfully", pc_name=pc_details['pc_name'])
            return True
            
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Integrity error creating PC", 
                        pc_name=pc_details.get('pc_name'),
                        error=str(e))
            return False
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error creating PC", 
                        pc_name=pc_details.get('pc_name'),
                        error=str(e))
            return False

    @staticmethod
    def update_pc(pc_details: Dict[str, Any]) -> bool:
        """
        Updates existing PC record.
        
        Args:
            pc_details: Dictionary containing:
                - pcid (int): PC ID (required)
                - pc_name (str): Updated PC name
                - type (str): Updated PC type
                - purchase_date (date): Updated purchase date
                - warranty_till (date): Updated warranty expiry
        
        Returns:
            True if successful, False if PC not found or error
        
        Raises:
            ValueError: If pcid is missing
        
        Example:
            >>> AssetService.update_pc({
            ...     'pcid': 123,
            ...     'pc_name': 'LAPTOP-001-UPDATED'
            ... })
            True
        """
        pc_id = pc_details.get('pcid')
        if pc_id is None:
            raise ValueError("PC ID is required for update")
        
        Logger.info("Updating PC", pc_id=pc_id)
        
        try:
            pc = PC.query.get(pc_id)
            
            if not pc:
                Logger.warning("PC not found for update", pc_id=pc_id)
                return False
            
            # Update fields
            pc.pc_name = pc_details.get('pc_name', pc.pc_name)
            pc.type = pc_details.get('type', pc.type)
            pc.purchase_date = pc_details.get('purchase_date', pc.purchase_date)
            pc.warranty_till = pc_details.get('warranty_till', pc.warranty_till)
            
            db.session.commit()
            
            Logger.info("PC updated successfully", pc_id=pc_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error updating PC", pc_id=pc_id, error=str(e))
            return False

    @staticmethod
    def delete_pc(pc_id: int) -> bool:
        """
        Deletes a PC from inventory.
        
        Args:
            pc_id: ID of PC to delete
        
        Returns:
            True if deleted, False if not found or error
        
        Raises:
            ValueError: If pc_id is None
        
        Example:
            >>> AssetService.delete_pc(123)
            True
        
        Note:
            Deletion may fail if PC has related records (assignments, maintenance).
            Consider soft delete for production use.
        """
        if pc_id is None:
            raise ValueError("PC ID cannot be None")
        
        Logger.info("Deleting PC", pc_id=pc_id)
        
        try:
            pc = PC.query.get(pc_id)
            
            if not pc:
                Logger.warning("PC not found for deletion", pc_id=pc_id)
                return False
            
            db.session.delete(pc)
            db.session.commit()
            
            Logger.info("PC deleted successfully", pc_id=pc_id)
            return True
            
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Cannot delete PC - has related records", 
                        pc_id=pc_id,
                        error=str(e))
            return False
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting PC", pc_id=pc_id, error=str(e))
            return False

    # ============= LEGACY/COMPATIBILITY METHODS =============

    @staticmethod
    def upsert_pc(data: Dict[str, Any]) -> bool:
        """
        Legacy upsert method - combines insert and update.
        
        Args:
            data: PC data with mixed case keys (PascalCase or snake_case)
        
        Returns:
            True if successful
        
        Note:
            Kept for backward compatibility with existing API consumers.
            New code should use insert_pc() or update_pc() explicitly.
        """
        Logger.debug("Legacy upsert_pc called")
        
        pc_id = data.get('PCID') or data.get('pcid')
        
        normalized_data = {
            'pcid': pc_id,
            'pc_name': data.get('PCName') or data.get('pc_name'),
            'type': data.get('Type') or data.get('type'),
            'purchase_date': data.get('PurchaseDate') or data.get('purchase_date'),
            'warranty_till': data.get('WarrantyTill') or data.get('warranty_till')
        }
        
        if pc_id:
            return AssetService.update_pc(normalized_data)
        else:
            return AssetService.insert_pc(normalized_data)

    @staticmethod
    def assign_asset(employee_id: str, pc_id: int) -> Optional[int]:
        """
        Assigns a PC to an employee.
        
        Args:
            employee_id: Employee ID to assign PC to
            pc_id: PC ID to assign
        
        Returns:
            Assignment ID if successful, None otherwise
        
        Raises:
            ValueError: If employee_id or pc_id is empty
        
        Example:
            >>> assignment_id = AssetService.assign_asset('EMP001', 123)
        """
        if not employee_id:
            raise ValueError("Employee ID is required")
        if pc_id is None:
            raise ValueError("PC ID is required")
        
        Logger.info("Assigning asset", employee_id=employee_id, pc_id=pc_id)
        
        try:
            assignment = PCAssignment(
                employee_id=employee_id,
                pc_id=pc_id
            )
            db.session.add(assignment)
            db.session.commit()
            
            Logger.info("Asset assigned successfully", 
                       employee_id=employee_id,
                       pc_id=pc_id,
                       assignment_id=assignment.assignment_id)
            return assignment.assignment_id
            
        except IntegrityError as e:
            db.session.rollback()
            Logger.error("Cannot assign asset - constraint violation", 
                        employee_id=employee_id,
                        pc_id=pc_id,
                        error=str(e))
            return None
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error assigning asset", 
                        employee_id=employee_id,
                        pc_id=pc_id,
                        error=str(e))
            return None

    # ============= MAINTENANCE CRUD OPERATIONS =============

    @staticmethod
    def get_all_maintenance_records() -> List[Dict[str, Any]]:
        """
        Retrieves all maintenance records.
        
        Returns maintenance logs ordered by date (most recent first).
        
        Returns:
            List of maintenance record dictionaries
        
        Example:
            >>> records = AssetService.get_all_maintenance_records()
            >>> for rec in records:
            ...     print(f"{rec['pcid']}: {rec['issue_description']}")
        """
        Logger.info("Fetching all maintenance records")
        
        try:
            records = MaintenanceLog.query.order_by(
                MaintenanceLog.maintenance_date.desc()
            ).all()
            
            maintenance_list = [
                {
                    'maintenance_id': rec.maintenance_id,
                    'pcid': rec.pc_id,
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
            Logger.error("Database error fetching maintenance records", error=str(e))
            return []

    @staticmethod
    def add_maintenance_record(maintenance_data: Dict[str, Any]) -> bool:
        """
        Creates a new maintenance record.
        
        Args:
            maintenance_data: Dictionary containing:
                - pcid (int): PC ID (required)
                - issue_description (str): Description of issue (required)
                - maintenance_date (date): Maintenance date (required)
                - status (str): Status (required, e.g., 'Pending', 'Completed')
                - notes (str): Additional notes (optional)
        
        Returns:
            True if successful
        
        Raises:
            ValueError: If required fields missing
        """
        # Validate required fields
        if not maintenance_data.get('pcid'):
            raise ValueError("PC ID is required")
        if not maintenance_data.get('issue_description'):
            raise ValueError("Issue description is required")
        if not maintenance_data.get('status'):
            raise ValueError("Status is required")
        
        Logger.info("Adding maintenance record", pc_id=maintenance_data.get('pcid'))
        
        try:
            new_record = MaintenanceLog(
                pc_id=maintenance_data['pcid'],
                issue_description=maintenance_data['issue_description'],
                maintenance_date=maintenance_data.get('maintenance_date'),
                status=maintenance_data['status'],
                notes=maintenance_data.get('notes')
            )
            
            db.session.add(new_record)
            db.session.commit()
            
            Logger.info("Maintenance record added", pc_id=maintenance_data['pcid'])
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error adding maintenance record", 
                        pc_id=maintenance_data.get('pcid'),
                        error=str(e))
            return False

    @staticmethod
    def update_maintenance_record(maintenance_data: Dict[str, Any]) -> bool:
        """Updates existing maintenance record."""
        maintenance_id = maintenance_data.get('maintenance_id')
        if not maintenance_id:
            raise ValueError("Maintenance ID is required")
        
        Logger.info("Updating maintenance record", maintenance_id=maintenance_id)
        
        try:
            record = MaintenanceLog.query.get(maintenance_id)
            
            if not record:
                Logger.warning("Maintenance record not found", maintenance_id=maintenance_id)
                return False
            
            record.pc_id = maintenance_data.get('pcid', record.pc_id)
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
    def delete_maintenance_record(maintenance_id: int) -> bool:
        """Deletes a maintenance record."""
        if not maintenance_id:
            raise ValueError("Maintenance ID is required")
        
        Logger.info("Deleting maintenance record", maintenance_id=maintenance_id)
        
        try:
            record = MaintenanceLog.query.get(maintenance_id)
            
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

    @staticmethod
    def get_maintenance_records() -> List[Dict[str, Any]]:
        """Legacy method - redirects to get_all_maintenance_records."""
        Logger.debug("Legacy get_maintenance_records called")
        return AssetService.get_all_maintenance_records()

    # ============= PERIPHERAL CRUD OPERATIONS =============

    @staticmethod
    def get_all_peripherals() -> List[Dict[str, Any]]:
        """Retrieves all peripheral devices."""
        Logger.info("Fetching all peripherals")
        
        try:
            peripherals = Peripheral.query.order_by(Peripheral.peripheral_id).all()
            
            peripheral_list = [
                {
                    'peripheral_id': p.peripheral_id,
                    'type': p.type,
                    'brand': p.brand,
                    'model': p.model,
                    'serial_number': p.serial_number,
                    'status': p.status
                }
                for p in peripherals
            ]
            
            Logger.info("Peripherals fetched", count=len(peripheral_list))
            return peripheral_list
            
        except SQLAlchemyError as e:
            Logger.error("Database error fetching peripherals", error=str(e))
            return []

    @staticmethod
    def add_peripheral(peripheral_data: Dict[str, Any]) -> bool:
        """Creates a new peripheral record."""
        if not peripheral_data.get('type'):
            raise ValueError("Peripheral type is required")
        
        Logger.info("Adding peripheral", type=peripheral_data.get('type'))
        
        try:
            new_peripheral = Peripheral(
                type=peripheral_data['type'],
                brand=peripheral_data.get('brand'),
                model=peripheral_data.get('model'),
                serial_number=peripheral_data.get('serial_number'),
                status=peripheral_data.get('status', 'Available')
            )
            
            db.session.add(new_peripheral)
            db.session.commit()
            
            Logger.info("Peripheral added", type=peripheral_data['type'])
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error adding peripheral", error=str(e))
            return False

    @staticmethod
    def update_peripheral(peripheral_data: Dict[str, Any]) -> bool:
        """Updates existing peripheral."""
        peripheral_id = peripheral_data.get('peripheral_id')
        if not peripheral_id:
            raise ValueError("Peripheral ID is required")
        
        Logger.info("Updating peripheral", peripheral_id=peripheral_id)
        
        try:
            peripheral = Peripheral.query.get(peripheral_id)
            
            if not peripheral:
                Logger.warning("Peripheral not found", peripheral_id=peripheral_id)
                return False
            
            peripheral.type = peripheral_data.get('type', peripheral.type)
            peripheral.brand = peripheral_data.get('brand', peripheral.brand)
            peripheral.model = peripheral_data.get('model', peripheral.model)
            peripheral.serial_number = peripheral_data.get('serial_number', peripheral.serial_number)
            peripheral.status = peripheral_data.get('status', peripheral.status)
            
            db.session.commit()
            Logger.info("Peripheral updated", peripheral_id=peripheral_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error updating peripheral", peripheral_id=peripheral_id, error=str(e))
            return False

    @staticmethod
    def delete_peripheral(peripheral_id: int) -> bool:
        """Deletes a peripheral record."""
        if not peripheral_id:
            raise ValueError("Peripheral ID is required")
        
        Logger.info("Deleting peripheral", peripheral_id=peripheral_id)
        
        try:
            peripheral = Peripheral.query.get(peripheral_id)
            
            if not peripheral:
                Logger.warning("Peripheral not found", peripheral_id=peripheral_id)
                return False
            
            db.session.delete(peripheral)
            db.session.commit()
            
            Logger.info("Peripheral deleted", peripheral_id=peripheral_id)
            return True
            
        except SQLAlchemyError as e:
            db.session.rollback()
            Logger.error("Database error deleting peripheral", peripheral_id=peripheral_id, error=str(e))
            return False
