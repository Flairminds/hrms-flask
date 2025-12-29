from .. import db
from .base import BaseModel


class Document(BaseModel):
    __tablename__ = 'document'
    document_id = db.Column(db.Integer, primary_key=True)
    document_name = db.Column(db.String(100), nullable=False)
    document_type = db.Column(db.String(50), nullable=False)


class EmployeeDocumentsBinary(BaseModel):
    __tablename__ = 'emp_documents'
    doc_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    emp_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id', ondelete='CASCADE'), nullable=False, unique=True)
    tenth = db.Column(db.LargeBinary)
    twelve = db.Column(db.LargeBinary)
    pan = db.Column(db.LargeBinary)
    adhar = db.Column(db.LargeBinary)
    grad = db.Column(db.LargeBinary)
    resume = db.Column(db.LargeBinary)
    tenth_verified = db.Column(db.Boolean)
    twelve_verified = db.Column(db.Boolean)
    pan_verified = db.Column(db.Boolean)
    adhar_verified = db.Column(db.Boolean)
    grad_verified = db.Column(db.Boolean)
    resume_verified = db.Column(db.Boolean)
