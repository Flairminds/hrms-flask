from functools import wraps
from flask import jsonify, request, g
from flask_jwt_extended import get_jwt, verify_jwt_in_request

def roles_required(*roles):
    """
    Decorator to restrict access to certain roles.
    Checks if the 'role' claim in the JWT matches one of the allowed roles.
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            # Verify JWT exists in request
            verify_jwt_in_request()
            claims = get_jwt()
            
            # Check if user role is in the allowed roles list
            user_role = claims.get("role")
            employee_id = claims.get('sub')
            
            # Store in flask.g for access in controllers/services
            g.user_role = user_role
            g.employee_id = employee_id
            
            if user_role not in roles:
                from ..utils.logger import Logger
                Logger.warning("ACCESS DENIED", 
                               user_role=user_role, 
                               allowed_roles=roles, 
                               endpoint=request.endpoint)
                return jsonify({"Message": "Access denied. Insufficient permissions."}), 403
            
            return fn(*args, **kwargs)
        return decorator
    return wrapper
