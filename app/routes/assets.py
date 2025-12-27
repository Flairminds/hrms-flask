from flask import Blueprint
from ..controllers.assets_controller import AssetsController
from ..utils.auth import roles_required
from ..auth_config import ROLE_PERMISSIONS

assets_bp = Blueprint('assets', __name__)

@assets_bp.route('/pcs', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['assets'])
def get_pcs():
    return AssetsController.get_pcs()

@assets_bp.route('/pcs', methods=['POST', 'PUT'])
@roles_required(*ROLE_PERMISSIONS['assets'])
def upsert_pc():
    return AssetsController.upsert_pc()

@assets_bp.route('/assignments', methods=['POST'])
@roles_required(*ROLE_PERMISSIONS['assets'])
def assign_pc():
    return AssetsController.assign_pc()

@assets_bp.route('/maintenance', methods=['GET'])
@roles_required(*ROLE_PERMISSIONS['assets'])
def get_maintenance():
    return AssetsController.get_maintenance()
