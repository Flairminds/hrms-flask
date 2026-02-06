from .. import db
from datetime import datetime
from .base import BaseModel

class HardwareAssets(BaseModel):
    __tablename__ = 'hardware_assets'
    asset_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.String(100), nullable=False)
    brand = db.Column(db.String(100))
    model = db.Column(db.String(100))
    serial_number = db.Column(db.String(100))
    status = db.Column(db.String(50), nullable=False)
    purchase_date = db.Column(db.Date)
    warranty_till = db.Column(db.Date)
    notes = db.Column(db.String(500))

class HardwareAssignment(BaseModel):
    """
    Maintains complete history of hardware assignments.
    Each assignment is a separate record - never update, only create new records.
    Active assignments have status='Active' and return_date=NULL.
    """
    __tablename__ = 'hardware_assignments'
    assignment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('hardware_assets.asset_id'), nullable=False)
    employee_id = db.Column(db.String(50), db.ForeignKey('employee.employee_id'), nullable=False)
    
    # Assignment tracking
    assignment_date = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    assigned_by = db.Column(db.String(50), nullable=False)  # Employee ID of person who assigned
    
    # Return tracking
    return_date = db.Column(db.Date)
    returned_by = db.Column(db.String(50))  # Employee ID of person who recorded return
    
    # Status: 'Active', 'Returned', 'Lost', 'Damaged'
    status = db.Column(db.String(50), nullable=False, default='Active')
    
    # Condition tracking
    condition_at_assignment = db.Column(db.String(50))  # e.g., 'New', 'Good', 'Fair', 'Poor'
    condition_at_return = db.Column(db.String(50))
    
    # Additional info
    assignment_notes = db.Column(db.String(500))
    return_notes = db.Column(db.String(500))

class HardwareAssignmentHistory(BaseModel):
    """
    Audit table to track all changes to HardwareAssignment records.
    Automatically populated via SQLAlchemy event listeners.
    """
    __tablename__ = 'hardware_assignment_history'
    
    # History metadata
    history_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    operation_type = db.Column(db.String(10), nullable=False)  # INSERT, UPDATE, DELETE
    operation_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    changed_by = db.Column(db.String(20))  # Employee ID who made the change
    
    # Mirror all HardwareAssignment table columns
    assignment_id = db.Column(db.Integer)
    asset_id = db.Column(db.Integer)
    employee_id = db.Column(db.String(50))
    assignment_date = db.Column(db.Date)
    assigned_by = db.Column(db.String(50))
    return_date = db.Column(db.Date)
    returned_by = db.Column(db.String(50))
    status = db.Column(db.String(50))
    condition_at_assignment = db.Column(db.String(50))
    condition_at_return = db.Column(db.String(50))
    assignment_notes = db.Column(db.String(500))
    return_notes = db.Column(db.String(500))


# SQLAlchemy event listeners for automatic audit logging
from sqlalchemy import event

# Guard flag to prevent duplicate listener registration
_assignment_listeners_registered = False

def register_hardware_assignment_history_listeners():
    """Register event listeners for HardwareAssignment history tracking (only once)"""
    global _assignment_listeners_registered
    if _assignment_listeners_registered:
        return
    
    _assignment_listeners_registered = True
    
    @event.listens_for(HardwareAssignment, 'after_insert')
    def after_insert_listener(mapper, connection, target):
        """Capture INSERT operations"""
        connection.execute(
            HardwareAssignmentHistory.__table__.insert(),
            {
                'operation_type': 'INSERT',
                'operation_timestamp': datetime.utcnow(),
                'changed_by': target.assigned_by,
                'assignment_id': target.assignment_id,
                'asset_id': target.asset_id,
                'employee_id': target.employee_id,
                'assignment_date': target.assignment_date,
                'assigned_by': target.assigned_by,
                'return_date': target.return_date,
                'returned_by': target.returned_by,
                'status': target.status,
                'condition_at_assignment': target.condition_at_assignment,
                'condition_at_return': target.condition_at_return,
                'assignment_notes': target.assignment_notes,
                'return_notes': target.return_notes
            }
        )
    
    @event.listens_for(HardwareAssignment, 'after_update')
    def after_update_listener(mapper, connection, target):
        """Capture UPDATE operations"""
        connection.execute(
            HardwareAssignmentHistory.__table__.insert(),
            {
                'operation_type': 'UPDATE',
                'operation_timestamp': datetime.utcnow(),
                'changed_by': target.returned_by if target.return_date else target.assigned_by,
                'assignment_id': target.assignment_id,
                'asset_id': target.asset_id,
                'employee_id': target.employee_id,
                'assignment_date': target.assignment_date,
                'assigned_by': target.assigned_by,
                'return_date': target.return_date,
                'returned_by': target.returned_by,
                'status': target.status,
                'condition_at_assignment': target.condition_at_assignment,
                'condition_at_return': target.condition_at_return,
                'assignment_notes': target.assignment_notes,
                'return_notes': target.return_notes
            }
        )
    
    @event.listens_for(HardwareAssignment, 'after_delete')
    def after_delete_listener(mapper, connection, target):
        """Capture DELETE operations"""
        connection.execute(
            HardwareAssignmentHistory.__table__.insert(),
            {
                'operation_type': 'DELETE',
                'operation_timestamp': datetime.utcnow(),
                'changed_by': target.returned_by if target.return_date else target.assigned_by,
                'assignment_id': target.assignment_id,
                'asset_id': target.asset_id,
                'employee_id': target.employee_id,
                'assignment_date': target.assignment_date,
                'assigned_by': target.assigned_by,
                'return_date': target.return_date,
                'returned_by': target.returned_by,
                'status': target.status,
                'condition_at_assignment': target.condition_at_assignment,
                'condition_at_return': target.condition_at_return,
                'assignment_notes': target.assignment_notes,
                'return_notes': target.return_notes
            }
        )

# Register listeners on module load
register_hardware_assignment_history_listeners()

class HardwareMaintenance(BaseModel):
    __tablename__ = 'hardware_maintenance'
    maintenance_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('hardware_assets.asset_id'), nullable=False)
    issue_description = db.Column(db.String(500))
    maintenance_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.String(500))