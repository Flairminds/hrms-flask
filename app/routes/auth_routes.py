"""
Auth routes for authentication and authorization endpoints.
"""
from flask import Blueprint, jsonify
from ..utils.auth import roles_required
from ..auth_config import FRONTEND_ROUTE_PERMISSIONS

bp = Blueprint('auth', __name__, url_prefix='/auth')

@bp.route('/route-permissions', methods=['GET'])
@roles_required("Admin", "HR", "Lead", "Employee")  # All authenticated users
def get_route_permissions():
    """
    Returns frontend route permissions configuration.
    
    Returns:
        JSON response with route permissions mapping
    """
    return jsonify({
        "status": "success",
        "data": FRONTEND_ROUTE_PERMISSIONS
    }), 200
