from .. import db
from datetime import datetime

class EmployeeFeedback(db.Model):
    __tablename__ = 'EmpFeedBackData'
    FeedBackId = db.Column(db.Integer, primary_key=True, autoincrement=True)
    EmpID = db.Column(db.String(50), db.ForeignKey('Employees.EmployeeId'))
    Category = db.Column(db.String(100))
    Goals = db.Column(db.Text) # JSON string in DB
    Measures = db.Column(db.Text) # JSON string in DB
    Comments = db.Column(db.Text) # JSON string in DB
    TargetedDate = db.Column(db.DateTime)
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)
