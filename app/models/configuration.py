from .. import db
from .base import BaseModel

class EmailConfiguration(BaseModel):
    """Model for storing application-level configurations and settings."""
    __tablename__ = 'email_configuration'
    
    email_config_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    config_key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(200), nullable=False)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255))
    email_frequency = db.Column(db.String(50), nullable=False)
    email_time = db.Column(db.String(50), nullable=False)

    def __repr__(self):
        return f"<EmailConfiguration {self.config_key}: {self.value}>"
