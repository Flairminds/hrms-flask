from flask import request, jsonify
from ...services.configuration.email_configuration_service import EmailConfigurationService
from ...utils.logger import Logger

class EmailConfigurationController:
    """Controller for handling EmailConfiguration CRUD requests."""

    @staticmethod
    def get_all_configurations():
        """Returns all email configurations."""
        try:
            configs = EmailConfigurationService.get_all_configurations()
            return jsonify([EmailConfigurationController._to_dict(c) for c in configs]), 200
        except Exception as e:
            Logger.error("Error in get_all_configurations controller", error=str(e))
            return jsonify({"message": "Error fetching configurations"}), 500

    @staticmethod
    def get_configuration_by_key(key):
        """Returns a configuration by its key."""
        try:
            config = EmailConfigurationService.get_configuration_by_key(key)
            if not config:
                return jsonify({"message": "Configuration not found"}), 404
            return jsonify(EmailConfigurationController._to_dict(config)), 200
        except Exception as e:
            Logger.error(f"Error in get_configuration_by_key controller for key: {key}", error=str(e))
            return jsonify({"message": "Error fetching configuration"}), 500

    @staticmethod
    def create_configuration():
        """Creates a new email configuration."""
        data = request.get_json()
        if not data or not data.get('config_key') or not data.get('display_name'):
             return jsonify({"message": "config_key and display_name are required"}), 400
        
        try:
            config = EmailConfigurationService.create_configuration(data)
            return jsonify(EmailConfigurationController._to_dict(config)), 201
        except ValueError as ve:
            return jsonify({"message": str(ve)}), 400
        except Exception as e:
            Logger.error("Error in create_configuration controller", error=str(e))
            return jsonify({"message": "Error creating configuration"}), 500

    @staticmethod
    def update_configuration(config_id):
        """Updates an existing email configuration."""
        data = request.get_json()
        try:
            config = EmailConfigurationService.update_configuration(config_id, data)
            if not config:
                return jsonify({"message": "Configuration not found"}), 404
            return jsonify(EmailConfigurationController._to_dict(config)), 200
        except Exception as e:
            Logger.error(f"Error in update_configuration controller for ID: {config_id}", error=str(e))
            return jsonify({"message": "Error updating configuration"}), 500

    @staticmethod
    def delete_configuration(config_id):
        """Soft deletes an email configuration."""
        try:
            success = EmailConfigurationService.delete_configuration(config_id)
            if not success:
                return jsonify({"message": "Configuration not found"}), 404
            return jsonify({"message": "Configuration deleted successfully"}), 200
        except Exception as e:
            Logger.error(f"Error in delete_configuration controller for ID: {config_id}", error=str(e))
            return jsonify({"message": "Error deleting configuration"}), 500

    @staticmethod
    def _to_dict(config):
        """Helper to convert EmailConfiguration model to dictionary."""
        return {
            "email_config_id": config.email_config_id,
            "config_key": config.config_key,
            "display_name": config.display_name,
            "value": config.value,
            "description": config.description,
            "email_frequency": config.email_frequency,
            "email_time": config.email_time,
            "is_deleted": config.is_deleted
        }
