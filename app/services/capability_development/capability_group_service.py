from datetime import datetime
from ... import db
from ...models.capability_development import (
    MasterCapabilityGroup,
    EmployeeCapabilityGroup,
    EmployeeCapabilityGroupHistory,
)
from ...models.hr import Employee


class CapabilityGroupService:

    # ── Master group CRUD ──────────────────────────────────────────────

    @staticmethod
    def get_all_groups():
        return MasterCapabilityGroup.query.order_by(MasterCapabilityGroup.group_name).all()

    @staticmethod
    def create_group(data):
        group = MasterCapabilityGroup(
            group_name=data['group_name'].strip(),
            description=data.get('description', '').strip() or None,
            is_active=True,
        )
        db.session.add(group)
        db.session.commit()
        return group

    @staticmethod
    def update_group(group_id, data):
        group = MasterCapabilityGroup.query.get(group_id)
        if not group:
            return None
        if 'group_name' in data:
            group.group_name = data['group_name'].strip()
        if 'description' in data:
            group.description = data['description'].strip() or None
        if 'is_active' in data:
            group.is_active = bool(data['is_active'])
        db.session.commit()
        return group

    @staticmethod
    def delete_group(group_id):
        """Soft-delete: set is_active=False"""
        group = MasterCapabilityGroup.query.get(group_id)
        if not group:
            return False
        group.is_active = False
        db.session.commit()
        return True

    # ── Assignments ────────────────────────────────────────────────────

    @staticmethod
    def get_all_assignments(employee_id=None):
        """Return current assignments joined with employee and group names.
        If employee_id is provided, filter to that employee only."""
        query = (
            db.session.query(EmployeeCapabilityGroup, Employee, MasterCapabilityGroup)
            .join(Employee, Employee.employee_id == EmployeeCapabilityGroup.employee_id)
            .join(MasterCapabilityGroup, MasterCapabilityGroup.group_id == EmployeeCapabilityGroup.group_id)
        )
        if employee_id:
            query = query.filter(EmployeeCapabilityGroup.employee_id == employee_id)
        return query.all()

    @staticmethod
    def get_my_assignment(employee_id):
        """Return the current assignment for a specific employee (or None)."""
        return (
            db.session.query(EmployeeCapabilityGroup, MasterCapabilityGroup)
            .join(MasterCapabilityGroup, MasterCapabilityGroup.group_id == EmployeeCapabilityGroup.group_id)
            .filter(EmployeeCapabilityGroup.employee_id == employee_id)
            .first()
        )

    @staticmethod
    def assign_group(data, assigned_by):
        """
        Upsert: if employee already has an assignment, archive it to history first,
        then create the new assignment.
        """
        employee_id = data['employee_id']
        group_id = int(data['group_id'])
        notes = data.get('notes', '')

        # Archive existing assignment (if any)
        existing = EmployeeCapabilityGroup.query.filter_by(employee_id=employee_id).first()
        if existing:
            history = EmployeeCapabilityGroupHistory(
                employee_id=existing.employee_id,
                group_id=existing.group_id,
                assigned_by=existing.assigned_by,
                assigned_on=existing.assigned_on,
                removed_on=datetime.utcnow(),
                notes=existing.notes,
            )
            db.session.add(history)
            db.session.delete(existing)
            db.session.flush()

        # Create new assignment
        assignment = EmployeeCapabilityGroup(
            employee_id=employee_id,
            group_id=group_id,
            assigned_by=assigned_by,
            assigned_on=datetime.utcnow(),
            notes=notes or None,
        )
        db.session.add(assignment)
        db.session.commit()
        return assignment

    @staticmethod
    def remove_assignment(employee_id, removed_by):
        """Move current assignment to history and delete transaction row."""
        existing = EmployeeCapabilityGroup.query.filter_by(employee_id=employee_id).first()
        if not existing:
            return False

        history = EmployeeCapabilityGroupHistory(
            employee_id=existing.employee_id,
            group_id=existing.group_id,
            assigned_by=existing.assigned_by,
            assigned_on=existing.assigned_on,
            removed_on=datetime.utcnow(),
            notes=existing.notes,
        )
        db.session.add(history)
        db.session.delete(existing)
        db.session.commit()
        return True

    # ── History ────────────────────────────────────────────────────────

    @staticmethod
    def get_history(employee_id=None):
        query = (
            db.session.query(EmployeeCapabilityGroupHistory, Employee, MasterCapabilityGroup)
            .join(Employee, Employee.employee_id == EmployeeCapabilityGroupHistory.employee_id)
            .join(MasterCapabilityGroup, MasterCapabilityGroup.group_id == EmployeeCapabilityGroupHistory.group_id)
        )
        if employee_id:
            query = query.filter(EmployeeCapabilityGroupHistory.employee_id == employee_id)
        return query.order_by(EmployeeCapabilityGroupHistory.removed_on.desc()).all()
