from ... import db
from ...models.configuration import EmailConfiguration
from ...utils.logger import Logger
from typing import List, Dict, Any, Optional

class EmailConfigurationService:
    """Service to handle CRUD operations for EmailConfiguration."""

    @staticmethod
    def get_all_configurations() -> List[EmailConfiguration]:
        """Fetches all email configurations that are not deleted."""
        try:
            return EmailConfiguration.query.filter_by(is_deleted=False).all()
        except Exception as e:
            Logger.error("Error fetching all email configurations", error=str(e))
            return []

    @staticmethod
    def get_configuration_by_id(config_id: int) -> Optional[EmailConfiguration]:
        """Fetches a single email configuration by ID."""
        try:
            return EmailConfiguration.query.filter_by(email_config_id=config_id, is_deleted=False).first()
        except Exception as e:
            Logger.error(f"Error fetching email configuration by ID: {config_id}", error=str(e))
            return None

    @staticmethod
    def get_configuration_by_key(key: str) -> Optional[EmailConfiguration]:
        """Fetches a single email configuration by configuration key."""
        try:
            return EmailConfiguration.query.filter_by(config_key=key, is_deleted=False).first()
        except Exception as e:
            Logger.error(f"Error fetching email configuration by key: {key}", error=str(e))
            return None

    @staticmethod
    def create_configuration(data: Dict[str, Any]) -> Optional[EmailConfiguration]:
        """Creates a new email configuration."""
        try:
            # Check if key already exists
            existing = EmailConfiguration.query.filter_by(config_key=data.get('config_key')).first()
            if existing:
                if existing.is_deleted:
                    # Reactivate deleted config
                    existing.is_deleted = False
                    existing.display_name = data.get('display_name')
                    existing.value = data.get('value')
                    existing.description = data.get('description')
                    existing.email_frequency = data.get('email_frequency')
                    existing.email_time = data.get('email_time')
                    db.session.commit()
                    return existing
                else:
                    raise ValueError(f"Configuration key '{data.get('config_key')}' already exists.")

            new_config = EmailConfiguration(
                config_key=data.get('config_key'),
                display_name=data.get('display_name'),
                value=data.get('value'),
                description=data.get('description'),
                email_frequency=data.get('email_frequency'),
                email_time=data.get('email_time')
            )
            db.session.add(new_config)
            db.session.commit()
            return new_config
        except Exception as e:
            db.session.rollback()
            Logger.error("Error creating email configuration", error=str(e))
            raise e

    @staticmethod
    def update_configuration(config_id: int, data: Dict[str, Any]) -> Optional[EmailConfiguration]:
        """Updates an existing email configuration."""
        try:
            config = EmailConfiguration.query.filter_by(email_config_id=config_id, is_deleted=False).first()
            if not config:
                return None
            
            if 'display_name' in data: config.display_name = data['display_name']
            if 'value' in data: config.value = data['value']
            if 'description' in data: config.description = data['description']
            if 'email_frequency' in data: config.email_frequency = data['email_frequency']
            if 'email_time' in data: config.email_time = data['email_time']
            # config_key should generally not be updated as it's a programmatic identifier
            
            db.session.commit()
            return config
        except Exception as e:
            db.session.rollback()
            Logger.error(f"Error updating email configuration ID: {config_id}", error=str(e))
            raise e

    @staticmethod
    def delete_configuration(config_id: int) -> bool:
        """Soft deletes an email configuration."""
        try:
            config = EmailConfiguration.query.filter_by(email_config_id=config_id).first()
            if not config:
                return False
            
            config.is_deleted = True
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            Logger.error(f"Error deleting email configuration ID: {config_id}", error=str(e))
            return False
