from .. import db
from datetime import datetime

class Employee(db.Model):
    __tablename__ = 'Employees'
    EmployeeId = db.Column(db.String(50), primary_key=True)
    FirstName = db.Column(db.String(100), nullable=False)
    MiddleName = db.Column(db.String(100))
    LastName = db.Column(db.String(100), nullable=False)
    DateOfBirth = db.Column(db.DateTime)
    ContactNumber = db.Column(db.String(20))
    EmergencyContactNumber = db.Column(db.String(20))
    EmergencyContactPerson = db.Column(db.String(100))
    EmergencyContactRelation = db.Column(db.String(50))
    Email = db.Column(db.String(100), unique=True)
    PersonalEmail = db.Column(db.String(100))
    Gender = db.Column(db.String(10))
    BloodGroup = db.Column(db.String(10))
    Password = db.Column(db.String(100))
    DateOfJoining = db.Column(db.DateTime)
    EmploymentStatus = db.Column(db.String(50), default='Active')
    EmployeeRole = db.Column(db.Integer, db.ForeignKey('EmployeeRole.RoleId'))
    EmployeeSubRole = db.Column(db.Integer)
    Band = db.Column(db.Integer)
    HighestQualification = db.Column(db.String(100))
    LeaveApprover = db.Column(db.String(50))
    ResumeLink = db.Column(db.Text)
    InternshipEndDate = db.Column(db.DateTime)
    DateOfResignation = db.Column(db.DateTime)
    LWD = db.Column(db.DateTime)
    ProbationEndDate = db.Column(db.DateTime)
    CTC = db.Column(db.Numeric(18, 2))

class EmployeeAddress(db.Model):
    __tablename__ = 'EmployeeAddress'
    AddressId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    EmployeeId = db.Column(db.String(50), db.ForeignKey('Employees.EmployeeId'))
    AddressType = db.Column(db.String(20)) # Residential/Permanent
    State = db.Column(db.String(100))
    City = db.Column(db.String(100))
    Address1 = db.Column(db.Text)
    Address2 = db.Column(db.Text)
    ZipCode = db.Column(db.String(20))
    IsSamePermanent = db.Column(db.Boolean, default=False)

class Skill(db.Model):
    __tablename__ = 'Skill'
    SkillId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    SkillName = db.Column(db.String(100), unique=True)

class EmployeeSkill(db.Model):
    __tablename__ = 'EmployeeSkill'
    EmployeeSkillId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    EmployeeId = db.Column(db.String(50), db.ForeignKey('Employees.EmployeeId'))
    SkillId = db.Column(db.Integer, db.ForeignKey('Skill.SkillId'))
    SkillLevel = db.Column(db.String(50))

class Project(db.Model):
    __tablename__ = 'Project'
    ProjectId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ProjectName = db.Column(db.String(255))
    Description = db.Column(db.Text)
    IsActive = db.Column(db.Boolean, default=True)
