from .. import db
from datetime import datetime
from .base import BaseModel


class OTPRequest(BaseModel):
    __tablename__ = 'otp_requests'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(100), nullable=False)
    otp = db.Column(db.String(10), nullable=False)
    expiry_time = db.Column(db.DateTime, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    attempt_count = db.Column(db.Integer, default=0, nullable=False)

