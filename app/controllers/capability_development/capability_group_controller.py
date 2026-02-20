from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ...services.capability_development.capability_group_service import CapabilityGroupService
import logging

logger = logging.getLogger(__name__)


def _serialize_group(g):
    return {
        'group_id': g.group_id,
        'group_name': g.group_name,
        'description': g.description,
        'is_active': g.is_active,
        'created_at': g.created_at.isoformat() if g.created_at else None,
    }


def _serialize_assignment(assignment, employee, group):
    return {
        'id': assignment.id,
        'employee_id': assignment.employee_id,
        'employee_name': f"{employee.first_name} {employee.last_name}" if hasattr(employee, 'first_name') else employee.employee_id,
        'group_id': assignment.group_id,
        'group_name': group.group_name,
        'assigned_by': assignment.assigned_by,
        'assigned_on': assignment.assigned_on.isoformat() if assignment.assigned_on else None,
        'notes': assignment.notes,
    }


def _serialize_history(h, employee, group):
    return {
        'id': h.id,
        'employee_id': h.employee_id,
        'employee_name': f"{employee.first_name} {employee.last_name}" if hasattr(employee, 'first_name') else employee.employee_id,
        'group_id': h.group_id,
        'group_name': group.group_name,
        'assigned_by': h.assigned_by,
        'assigned_on': h.assigned_on.isoformat() if h.assigned_on else None,
        'removed_on': h.removed_on.isoformat() if h.removed_on else None,
        'notes': h.notes,
    }


class CapabilityGroupController:

    # ── Master Groups ──────────────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def get_groups():
        try:
            groups = CapabilityGroupService.get_all_groups()
            return jsonify([_serialize_group(g) for g in groups]), 200
        except Exception as e:
            logger.error(f"get_groups error: {e}")
            return jsonify({'message': 'Error fetching groups'}), 500

    @staticmethod
    @jwt_required()
    def create_group():
        claims = get_jwt()
        if claims.get('role', '').lower() not in ['admin', 'hr']:
            return jsonify({'message': 'Unauthorized'}), 403
        data = request.json or {}
        if not data.get('group_name'):
            return jsonify({'message': 'group_name is required'}), 400
        try:
            group = CapabilityGroupService.create_group(data)
            return jsonify({'message': 'Group created', 'group_id': group.group_id}), 201
        except Exception as e:
            logger.error(f"create_group error: {e}")
            return jsonify({'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def update_group(group_id):
        claims = get_jwt()
        if claims.get('role', '').lower() not in ['admin', 'hr']:
            return jsonify({'message': 'Unauthorized'}), 403
        data = request.json or {}
        try:
            group = CapabilityGroupService.update_group(group_id, data)
            if not group:
                return jsonify({'message': 'Group not found'}), 404
            return jsonify({'message': 'Group updated'}), 200
        except Exception as e:
            logger.error(f"update_group error: {e}")
            return jsonify({'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def delete_group(group_id):
        claims = get_jwt()
        if claims.get('role', '').lower() not in ['admin', 'hr']:
            return jsonify({'message': 'Unauthorized'}), 403
        try:
            if CapabilityGroupService.delete_group(group_id):
                return jsonify({'message': 'Group deactivated'}), 200
            return jsonify({'message': 'Group not found'}), 404
        except Exception as e:
            logger.error(f"delete_group error: {e}")
            return jsonify({'message': str(e)}), 500

    # ── Assignments ────────────────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def get_assignments():
        """All roles can call this. Employees see only their own assignment."""
        claims = get_jwt()
        caller_role = claims.get('role', '').lower()
        caller_id = get_jwt_identity()
        # Scope to own employee_id if caller is an employee
        filter_id = caller_id if caller_role == 'employee' else None
        try:
            rows = CapabilityGroupService.get_all_assignments(employee_id=filter_id)
            return jsonify([_serialize_assignment(a, e, g) for a, e, g in rows]), 200
        except Exception as e:
            logger.error(f"get_assignments error: {e}")
            return jsonify({'message': 'Error fetching assignments'}), 500

    @staticmethod
    @jwt_required()
    def get_my_group():
        """Any authenticated employee can view their own capability group."""
        current_user_id = get_jwt_identity()
        try:
            result = CapabilityGroupService.get_my_assignment(current_user_id)
            if not result:
                return jsonify({'assignment': None}), 200
            assignment, group = result
            return jsonify({
                'assignment': {
                    'group_id': group.group_id,
                    'group_name': group.group_name,
                    'description': group.description,
                    'assigned_on': assignment.assigned_on.isoformat() if assignment.assigned_on else None,
                    'notes': assignment.notes,
                }
            }), 200
        except Exception as e:
            logger.error(f"get_my_group error: {e}")
            return jsonify({'message': 'Error fetching your capability group'}), 500

    @staticmethod
    @jwt_required()
    def assign_group():
        claims = get_jwt()
        if claims.get('role', '').lower() not in ['admin', 'hr']:
            return jsonify({'message': 'Unauthorized'}), 403
        data = request.json or {}
        if not data.get('employee_id') or not data.get('group_id'):
            return jsonify({'message': 'employee_id and group_id are required'}), 400
        try:
            assignment = CapabilityGroupService.assign_group(data, get_jwt_identity())
            return jsonify({'message': 'Group assigned', 'id': assignment.id}), 201
        except Exception as e:
            logger.error(f"assign_group error: {e}")
            return jsonify({'message': str(e)}), 500

    @staticmethod
    @jwt_required()
    def remove_assignment(employee_id):
        claims = get_jwt()
        if claims.get('role', '').lower() not in ['admin', 'hr']:
            return jsonify({'message': 'Unauthorized'}), 403
        try:
            if CapabilityGroupService.remove_assignment(employee_id, get_jwt_identity()):
                return jsonify({'message': 'Assignment removed'}), 200
            return jsonify({'message': 'Assignment not found'}), 404
        except Exception as e:
            logger.error(f"remove_assignment error: {e}")
            return jsonify({'message': str(e)}), 500

    # ── History ────────────────────────────────────────────────────────

    @staticmethod
    @jwt_required()
    def get_history():
        """All roles can call this. Employees see only their own history."""
        claims = get_jwt()
        caller_role = claims.get('role', '').lower()
        caller_id = get_jwt_identity()
        # HR/Admin can also filter by an arbitrary employee_id via query param
        if caller_role == 'employee':
            employee_id = caller_id
        else:
            employee_id = request.args.get('employee_id')
        try:
            rows = CapabilityGroupService.get_history(employee_id)
            return jsonify([_serialize_history(h, e, g) for h, e, g in rows]), 200
        except Exception as e:
            logger.error(f"get_history error: {e}")
            return jsonify({'message': 'Error fetching history'}), 500
