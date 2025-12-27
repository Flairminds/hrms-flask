from .. import db
from datetime import datetime

class LeaveType(db.Model):
    __tablename__ = 'LeaveType'
    LeaveTypeId = db.Column(db.Integer, primary_key=True)
    LeaveTypeName = db.Column(db.String(50))

class LeaveTransaction(db.Model):
    __tablename__ = 'LeaveTransaction'
    LeaveTranId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    EmployeeId = db.Column(db.String(50), db.ForeignKey('Employees.EmployeeId'))
    LeaveType = db.Column(db.Integer)
    FromDate = db.Column(db.DateTime)
    ToDate = db.Column(db.DateTime)
    Duration = db.Column(db.String(20))
    NoOfDays = db.Column(db.Numeric(5, 2))
    Comments = db.Column(db.Text)
    LeaveStatus = db.Column(db.String(50), default='Pending')
    AppliedBy = db.Column(db.String(50))
    ApprovedBy = db.Column(db.String(50))
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)
    HandOverComments = db.Column(db.Text)

class CompOffTransaction(db.Model):
    __tablename__ = 'CompOffTransaction'
    CompOffId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    LeaveTranId = db.Column(db.Integer, db.ForeignKey('LeaveTransaction.LeaveTranId'))
    CompOffDate = db.Column(db.DateTime)
    Duration = db.Column(db.String(20))

class Holiday(db.Model):
    __tablename__ = 'Holiday'
    HolidayId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    HolidayDate = db.Column(db.DateTime)
    HolidayName = db.Column(db.String(100))
    IsActive = db.Column(db.Boolean, default=True)
