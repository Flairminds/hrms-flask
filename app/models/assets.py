from .. import db
from datetime import datetime

class PC(db.Model):
    __tablename__ = 'PCDetails'
    PCID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    PCName = db.Column(db.String(100))
    Type = db.Column(db.String(50)) # Laptop/Desktop
    PurchaseDate = db.Column(db.DateTime)
    WarrantyTill = db.Column(db.DateTime)
    IsActive = db.Column(db.Boolean, default=True)

class Peripheral(db.Model):
    __tablename__ = 'Peripheral'
    PeripheralId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    PeripheralName = db.Column(db.String(100))
    Type = db.Column(db.String(50)) # Monitor/Mouse/Keyboard
    PurchaseDate = db.Column(db.DateTime)
    WarrantyTill = db.Column(db.DateTime)
    IsActive = db.Column(db.Boolean, default=True)

class AssetAssignment(db.Model):
    __tablename__ = 'AssetAssignment'
    AssignmentID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    EmployeeID = db.Column(db.String(50), db.ForeignKey('Employees.EmployeeId'))
    PCID = db.Column(db.Integer, db.ForeignKey('PCDetails.PCID'))
    AssignmentDate = db.Column(db.DateTime, default=datetime.utcnow)
    ReturnDate = db.Column(db.DateTime)

class MaintenanceLog(db.Model):
    __tablename__ = 'Maintenance'
    MaintenanceID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    AssetID = db.Column(db.Integer) # Could be PCID or PeripheralId
    AssetType = db.Column(db.String(50)) # PC/Peripheral
    ServiceDate = db.Column(db.DateTime)
    Description = db.Column(db.Text)
    Cost = db.Column(db.Numeric(18, 2))
    ServiceCenter = db.Column(db.String(255))
