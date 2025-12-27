from ..models.assets import db, PC, Peripheral, AssetAssignment, MaintenanceLog
from sqlalchemy import text

class AssetService:
    """Service class for managing organizational assets like PCs, peripherals, and their assignments."""

    @staticmethod
    def get_all_pcs():
        """Retrieves a list of all active computer systems."""
        try:
            return PC.query.filter_by(IsActive=True).all()
        except Exception as e:
            print(f"Error fetching PCs: {e}")
            return []

    @staticmethod
    def upsert_pc(data):
        """Creates a new PC record or updates an existing one."""
        try:
            pc_id = data.get('PCID')
            pc = PC.query.get(pc_id) if pc_id else None
            if not pc:
                pc = PC()
                db.session.add(pc)
            
            pc.PCName = data.get('PCName')
            pc.Type = data.get('Type')
            pc.PurchaseDate = data.get('PurchaseDate')
            pc.WarrantyTill = data.get('WarrantyTill')
            db.session.commit()
            return pc.PCID
        except Exception as e:
            db.session.rollback()
            print(f"Error in upsert_pc: {e}")
            return None

    @staticmethod
    def assign_asset(employee_id, pc_id):
        """Records the assignment of a PC to an employee."""
        try:
            assignment = AssetAssignment(EmployeeID=employee_id, PCID=pc_id)
            db.session.add(assignment)
            db.session.commit()
            return assignment.AssignmentID
        except Exception as e:
            db.session.rollback()
            print(f"Error assigning asset: {e}")
            return None

    @staticmethod
    def get_maintenance_records():
        """Retrieves history of all maintenance logs for hardware."""
        try:
            return MaintenanceLog.query.all()
        except Exception as e:
            print(f"Error fetching maintenance records: {e}")
            return []
        
    @staticmethod
    def add_maintenance_record(data):
        """Logs a new maintenance or service event for an asset."""
        try:
            log = MaintenanceLog(
                AssetID=data.get('AssetID'),
                AssetType=data.get('AssetType'),
                ServiceDate=data.get('ServiceDate'),
                Description=data.get('Description'),
                Cost=data.get('Cost'),
                ServiceCenter=data.get('ServiceCenter')
            )
            db.session.add(log)
            db.session.commit()
            return log.MaintenanceID
        except Exception as e:
            db.session.rollback()
            print(f"Error adding maintenance record: {e}")
            return None
