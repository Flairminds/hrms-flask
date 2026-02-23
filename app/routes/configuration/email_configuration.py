from flask import Blueprint
from ...controllers.configuration.email_configuration_controller import EmailConfigurationController
from ...utils.auth import roles_required
from ...auth_config import ROLE_PERMISSIONS

email_config_bp = Blueprint('email_configuration', __name__)

@email_config_bp.route('/', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['email_configuration']['get_configs'])
def get_all_configurations():
    return EmailConfigurationController.get_all_configurations()

@email_config_bp.route('/<key>', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['email_configuration']['get_configs'])
def get_configuration_by_key(key):
    return EmailConfigurationController.get_configuration_by_key(key)

@email_config_bp.route('/', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['email_configuration']['manage_configs'])
def create_configuration():
    return EmailConfigurationController.create_configuration()

@email_config_bp.route('/<int:config_id>', methods=['PUT', 'PATCH'])
@roles_required(*ROLE_PERMISSIONS['email_configuration']['manage_configs'])
def update_configuration(config_id):
    return EmailConfigurationController.update_configuration(config_id)

@email_config_bp.route('/<int:config_id>', methods=['DELETE'])
@roles_required(*ROLE_PERMISSIONS['email_configuration']['manage_configs'])
def delete_configuration(config_id):
    return EmailConfigurationController.delete_configuration(config_id)
