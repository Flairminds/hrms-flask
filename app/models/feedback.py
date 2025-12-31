from .. import db
from datetime import datetime
from .base import BaseModel


class EmpFeedBackData(BaseModel):
    __tablename__ = 'emp_feedback_data'
    feedback_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    emp_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    goals = db.Column(db.Text)
    measures = db.Column(db.Text)
    comments = db.Column(db.Text)
    added_date = db.Column(db.DateTime, server_default=db.func.now())
    targeted_date = db.Column(db.DateTime)
