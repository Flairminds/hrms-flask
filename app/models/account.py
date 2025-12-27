from .. import db
from datetime import datetime

class Employee(db.Model):
    __tablename__ = 'Employees' # Adjust if the actual table name is different
    EmployeeId = db.Column(db.String(50), primary_key=True)
    FirstName = db.Column(db.String(100))
    MiddleName = db.Column(db.String(100))
    LastName = db.Column(db.String(100))
    Email = db.Column(db.String(100))
    Password = db.Column(db.String(100))
    ContactNumber = db.Column(db.String(20))
    EmploymentStatus = db.Column(db.String(50))
    DateOfJoining = db.Column(db.DateTime)
    RoleName = db.Column(db.String(50)) # This might come from a join or be a column
    # ... other columns as needed

class OTPRequest(db.Model):
    __tablename__ = 'OTPRequests'
    Id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Username = db.Column(db.String(100), nullable=False)
    OTP = db.Column(db.String(10), nullable=False)
    ExpiryTime = db.Column(db.DateTime, nullable=False)
    IsVerified = db.Column(db.Boolean, default=False)
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)
