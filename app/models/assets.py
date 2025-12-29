from .. import db
from datetime import datetime
from .base import BaseModel


class PC(BaseModel):
    __tablename__ = 'pcs'
    pcid = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pc_name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(100), nullable=False)
    purchase_date = db.Column(db.Date)
    warranty_till = db.Column(db.Date)


class Peripheral(BaseModel):
    __tablename__ = 'peripherals'
    peripheral_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    type = db.Column(db.String(100), nullable=False)
    brand = db.Column(db.String(100))
    model = db.Column(db.String(100))
    serial_number = db.Column(db.String(100))
    status = db.Column(db.String(50), nullable=False)


class PCAssignment(BaseModel):
    __tablename__ = 'pc_assignments'
    assignment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(50), nullable=False)
    pc_name = db.Column(db.String(50), nullable=False)
    assignment_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date)


class MaintenanceLog(BaseModel):
    __tablename__ = 'maintenance'
    maintenance_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pcid = db.Column(db.Integer, db.ForeignKey('pcs.pcid'), nullable=False)
    issue_description = db.Column(db.String(500))
    maintenance_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.String(500))
