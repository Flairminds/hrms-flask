from typing import List, Dict

from sqlalchemy import text

from .. import db


class CapabilityService:
    """Service for Capability Development Leads and their assignments."""

    # Leads
    @staticmethod
    def get_leads() -> List[Dict]:
        result = db.session.execute(
            text("SELECT CapabilityDevelopmentLeadId, EmployeeId FROM CapabilityDevelopmentLead")
        )
        return [
            {"CapabilityDevelopmentLeadId": row[0], "EmployeeId": row[1]}
            for row in result.fetchall()
        ]

    @staticmethod
    def create_leads(employee_ids: List[str]) -> List[Dict]:
        if not employee_ids or not isinstance(employee_ids, list):
            raise ValueError("Please select at least one employee")

        new_leads: List[Dict] = []
        for emp_id in employee_ids:
            # Skip if already a lead
            existing = db.session.execute(
                text(
                    "SELECT CapabilityDevelopmentLeadId FROM CapabilityDevelopmentLead WHERE EmployeeId = :emp_id"
                ),
                {"emp_id": emp_id},
            ).fetchone()
            if existing:
                continue

            result = db.session.execute(
                text(
                    """INSERT INTO CapabilityDevelopmentLead (EmployeeId)
                    OUTPUT INSERTED.CapabilityDevelopmentLeadId
                    VALUES (:emp_id)"""
                ),
                {"emp_id": emp_id},
            )
            lead_row = result.fetchone()
            if lead_row:
                new_leads.append(
                    {"EmployeeId": emp_id, "CapabilityDevelopmentLeadId": lead_row[0]}
                )

        db.session.commit()
        return new_leads

    @staticmethod
    def delete_lead(lead_id: int) -> Dict:
        # Collect assignment IDs to report back
        assignments_to_delete = db.session.execute(
            text(
                """SELECT CapabilityDevelopmentLeadAssignmentId
                FROM CapabilityDevelopmentLeadAssignment
                WHERE CapabilityDevelopmentLeadId = :lead_id"""
            ),
            {"lead_id": lead_id},
        ).fetchall()
        assignment_ids = [row[0] for row in assignments_to_delete]

        db.session.execute(
            text(
                "DELETE FROM CapabilityDevelopmentLead WHERE CapabilityDevelopmentLeadId = :lead_id"
            ),
            {"lead_id": lead_id},
        )
        db.session.commit()

        return {
            "deletedAssignmentIds": assignment_ids,
            "deletedLeadId": lead_id,
        }

    # Assignments
    @staticmethod
    def get_assignments() -> List[Dict]:
        result = db.session.execute(
            text(
                "SELECT CapabilityDevelopmentLeadAssignmentId, AssignedEmployeeId, CapabilityDevelopmentLeadId FROM CapabilityDevelopmentLeadAssignment"
            )
        )
        return [
            {
                "CapabilityDevelopmentLeadAssignmentId": row[0],
                "AssignedEmployeeId": row[1],
                "CapabilityDevelopmentLeadId": row[2],
            }
            for row in result.fetchall()
        ]

    @staticmethod
    def create_assignment(employee_id: str, lead_id: int) -> int:
        if not employee_id or not lead_id:
            raise ValueError("EmployeeId and leadId are required")

        duplicate = db.session.execute(
            text(
                """SELECT 1 FROM CapabilityDevelopmentLeadAssignment
                WHERE AssignedEmployeeId = :emp_id AND CapabilityDevelopmentLeadId = :lead_id"""
            ),
            {"emp_id": employee_id, "lead_id": lead_id},
        ).fetchone()
        if duplicate:
            raise ValueError("This employee already has an assignment with this lead")

        result = db.session.execute(
            text(
                """INSERT INTO CapabilityDevelopmentLeadAssignment (AssignedEmployeeId, CapabilityDevelopmentLeadId)
                OUTPUT INSERTED.CapabilityDevelopmentLeadAssignmentId
                VALUES (:emp_id, :lead_id)"""
            ),
            {"emp_id": employee_id, "lead_id": lead_id},
        )
        assignment_id = result.scalar()
        db.session.commit()
        return assignment_id

    @staticmethod
    def update_assignment(assignment_id: int, employee_id: str, lead_id: int) -> None:
        if not employee_id or not lead_id:
            raise ValueError("EmployeeId and leadId are required")

        exists = db.session.execute(
            text(
                "SELECT 1 FROM CapabilityDevelopmentLeadAssignment WHERE CapabilityDevelopmentLeadAssignmentId = :id"
            ),
            {"id": assignment_id},
        ).fetchone()
        if not exists:
            raise LookupError("Assignment not found")

        duplicate = db.session.execute(
            text(
                """SELECT 1 FROM CapabilityDevelopmentLeadAssignment
                WHERE AssignedEmployeeId = :emp_id
                  AND CapabilityDevelopmentLeadId = :lead_id
                  AND CapabilityDevelopmentLeadAssignmentId != :id"""
            ),
            {"emp_id": employee_id, "lead_id": lead_id, "id": assignment_id},
        ).fetchone()
        if duplicate:
            raise ValueError("This employee already has an assignment with this lead")

        db.session.execute(
            text(
                """UPDATE CapabilityDevelopmentLeadAssignment
                SET AssignedEmployeeId = :emp_id,
                    CapabilityDevelopmentLeadId = :lead_id,
                    UpdatedDate = CURRENT_TIMESTAMP
                WHERE CapabilityDevelopmentLeadAssignmentId = :id"""
            ),
            {"emp_id": employee_id, "lead_id": lead_id, "id": assignment_id},
        )
        db.session.commit()

    @staticmethod
    def delete_assignment(assignment_id: int) -> None:
        db.session.execute(
            text(
                "DELETE FROM CapabilityDevelopmentLeadAssignment WHERE CapabilityDevelopmentLeadAssignmentId = :id"
            ),
            {"id": assignment_id},
        )
        db.session.commit()
