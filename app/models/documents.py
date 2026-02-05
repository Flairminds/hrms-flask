from .. import db
from .base import BaseModel
from datetime import datetime


class Document(BaseModel):
    __tablename__ = 'document'
    document_id = db.Column(db.Integer, primary_key=True)
    document_name = db.Column(db.String(100), nullable=False)
    document_type = db.Column(db.String(50), nullable=False)


class EmployeeDocument(BaseModel):
    """Model for Azure Blob Storage-based employee documents."""
    __tablename__ = 'employee_documents'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    emp_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id', ondelete='CASCADE'), nullable=False)
    doc_type = db.Column(db.String(50), nullable=False)  # tenth, twelve, pan, adhar, grad, resume
    
    # Azure Blob Storage information
    blob_name = db.Column(db.String(500), nullable=False, unique=True)
    container_name = db.Column(db.String(200), nullable=False)
    blob_url = db.Column(db.String(1000))
    
    # File metadata
    file_name = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer)  # Size in bytes
    content_type = db.Column(db.String(100))
    
    # Verification status
    is_verified = db.Column(db.Boolean, default=None, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    verified_by = db.Column(db.String(20), nullable=True)  # Employee ID of verifier
    
    # Timestamps
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint: one document per employee per type
    __table_args__ = (
        db.UniqueConstraint('emp_id', 'doc_type', name='uq_emp_doc_type'),
    )
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'emp_id': self.emp_id,
            'doc_type': self.doc_type,
            'blob_name': self.blob_name,
            'container_name': self.container_name,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'content_type': self.content_type,
            'is_verified': self.is_verified,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'verified_by': self.verified_by,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

