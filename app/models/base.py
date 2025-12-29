from .. import db


class AuditMixin:
    """Mixin to add audit columns to all models"""
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())
    created_by = db.Column(db.String(20))  # Employee ID
    modified_at = db.Column(db.DateTime, onupdate=db.func.now())
    modified_by = db.Column(db.String(20))  # Employee ID
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    deleted_at = db.Column(db.DateTime)


class BaseModel(db.Model, AuditMixin):
    """Base model class with audit fields for all models"""
    __abstract__ = True
