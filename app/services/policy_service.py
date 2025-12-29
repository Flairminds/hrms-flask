from typing import Dict

from sqlalchemy import text

from .. import db
from ..utils.mail_util import MailUtil


class PolicyService:
    """Service for policy acknowledgement, notification email, and warning counts."""

    # ---------------- Policy Acknowledgement -----------------

    @staticmethod
    def get_policy_acknowledgment(employee_id: str) -> Dict:
        result = db.session.execute(
            text(
                """
                SELECT 
                    EmployeeId,
                    LeavePolicyAcknowledged,
                    WorkFromHomePolicyAcknowledged,
                    ExitPolicyAndProcessAcknowledged,
                    SalaryAdvanceRecoveryPolicyAcknowledged,
                    ProbationToConfirmationPolicyAcknowledged,
                    SalaryAndAppraisalPolicyAcknowledged
                FROM EmployeePolicyAcknowledgementStatus
                WHERE EmployeeId = :employee_id
                """
            ),
            {"employee_id": employee_id},
        ).fetchone()

        if not result:
            raise ValueError("Employee not found")

        return {
            "EmployeeId": result.EmployeeId,
            "LeavePolicyAcknowledged": bool(result.LeavePolicyAcknowledged),
            "WorkFromHomePolicyAcknowledged": bool(
                result.WorkFromHomePolicyAcknowledged
            ),
            "ExitPolicyAndProcessAcknowledged": bool(
                result.ExitPolicyAndProcessAcknowledged
            ),
            "SalaryAdvanceRecoveryPolicyAcknowledged": bool(
                result.SalaryAdvanceRecoveryPolicyAcknowledged
            ),
            "ProbationToConfirmationPolicyAcknowledged": bool(
                result.ProbationToConfirmationPolicyAcknowledged
            ),
            "SalaryAndAppraisalPolicyAcknowledged": bool(
                result.SalaryAndAppraisalPolicyAcknowledged
            ),
        }

    @staticmethod
    def update_policy_acknowledgment(
        employee_id: str, policy_name: str, acknowledged: bool
    ) -> None:
        if not employee_id or not policy_name:
            raise ValueError("employeeId and policyName are required")

        policy_column_map = {
            "Leave Policy": "LeavePolicyAcknowledged",
            "Work From Home Policy": "WorkFromHomePolicyAcknowledged",
            "Exit Policy & Process": "ExitPolicyAndProcessAcknowledged",
            "Salary Advance & Recovery Policy": "SalaryAdvanceRecoveryPolicyAcknowledged",
            "Probation To Confirmation Policy": "ProbationToConfirmationPolicyAcknowledged",
            "Salary and appraisal process Policy": "SalaryAndAppraisalPolicyAcknowledged",
        }

        if policy_name not in policy_column_map:
            raise ValueError("Invalid policy name")

        column_name = policy_column_map[policy_name]

        with db.session.begin():
            count = db.session.execute(
                text(
                    """
                    SELECT COUNT(*)
                    FROM EmployeePolicyAcknowledgementStatus
                    WHERE EmployeeId = :employee_id
                    """
                ),
                {"employee_id": employee_id},
            ).scalar()

            if count == 0:
                db.session.execute(
                    text(
                        f"""
                        INSERT INTO EmployeePolicyAcknowledgementStatus
                        (EmployeeId, {column_name})
                        VALUES (:employee_id, :acknowledged)
                        """
                    ),
                    {"employee_id": employee_id, "acknowledged": acknowledged},
                )
            else:
                db.session.execute(
                    text(
                        f"""
                        UPDATE EmployeePolicyAcknowledgementStatus
                        SET {column_name} = :acknowledged
                        WHERE EmployeeId = :employee_id
                        """
                    ),
                    {"employee_id": employee_id, "acknowledged": acknowledged},
                )

    @staticmethod
    def send_policy_email(employee_id: str) -> Dict:
        if not employee_id:
            raise ValueError("Employee ID is required")

        # Employee details
        employee_result = db.session.execute(
            text(
                """
                SELECT FirstName, LastName, Email
                FROM Employee
                WHERE EmployeeId = :employee_id
                """
            ),
            {"employee_id": employee_id},
        ).fetchone()

        if not employee_result:
            raise ValueError("Employee not found")

        # Policy status
        policy_result = db.session.execute(
            text(
                """
                SELECT 
                    LeavePolicyAcknowledged,
                    WorkFromHomePolicyAcknowledged,
                    ExitPolicyAndProcessAcknowledged,
                    SalaryAdvanceRecoveryPolicyAcknowledged,
                    ProbationToConfirmationPolicyAcknowledged,
                    SalaryAndAppraisalPolicyAcknowledged
                FROM EmployeePolicyAcknowledgementStatus
                WHERE EmployeeId = :employee_id
                """
            ),
            {"employee_id": employee_id},
        ).fetchone()

        if not policy_result:
            raise ValueError("Policy acknowledgment status not found")

        all_acknowledged = all(
            [
                policy_result.LeavePolicyAcknowledged,
                policy_result.WorkFromHomePolicyAcknowledged,
                policy_result.ExitPolicyAndProcessAcknowledged,
                policy_result.SalaryAdvanceRecoveryPolicyAcknowledged,
                policy_result.ProbationToConfirmationPolicyAcknowledged,
                policy_result.SalaryAndAppraisalPolicyAcknowledged,
            ]
        )

        if not all_acknowledged:
            raise ValueError("Not all policies are acknowledged")

        employee_name = f"{employee_result.FirstName} {employee_result.LastName}"
        subject = f"Policy Acknowledgment - {employee_name}"
        body = f"""
            <html>
                <body>
                    <h3>Policy Acknowledgment Notification</h3>
                    <p>Employee {employee_name} (ID: {employee_id}) has acknowledged all company policies.</p>
                    <p>All policies have been read and acknowledged:</p>
                    <ul>
                        <li>Leave Policy</li>
                        <li>Work From Home Policy</li>
                        <li>Exit Policy & Process</li>
                        <li>Salary Advance & Recovery Policy</li>
                        <li>Probation To Confirmation Policy</li>
                        <li>Salary and Appraisal Process Policy</li>
                    </ul>
                </body>
            </html>
        """

        ok = MailUtil.send_email("hr@flairminds.com", subject, body, is_html=True)
        if not ok:
            raise RuntimeError("Failed to send policy email")

        return {"employeeId": employee_id, "employeeName": employee_name}

    # ---------------- Warning Count -----------------

    @staticmethod
    def update_warning_count(employee_id: str) -> int:
        if not employee_id:
            raise ValueError("Employee ID is required")

        with db.session.begin():
            result = db.session.execute(
                text(
                    """
                    SELECT COALESCE(WarningCount, 0) as WarningCount
                    FROM EmployeePolicyAcknowledgementStatus
                    WHERE EmployeeId = :employee_id
                    """
                ),
                {"employee_id": employee_id},
            ).fetchone()

            current_count = result.WarningCount if result else 0
            new_count = current_count + 1

            if not result:
                db.session.execute(
                    text(
                        """
                        INSERT INTO EmployeePolicyAcknowledgementStatus
                        (EmployeeId, WarningCount)
                        VALUES (:employee_id, :warning_count)
                        """
                    ),
                    {"employee_id": employee_id, "warning_count": new_count},
                )
            else:
                db.session.execute(
                    text(
                        """
                        UPDATE EmployeePolicyAcknowledgementStatus
                        SET WarningCount = :warning_count
                        WHERE EmployeeId = :employee_id
                        """
                    ),
                    {"employee_id": employee_id, "warning_count": new_count},
                )

        return new_count

    @staticmethod
    def get_warning_count(employee_id: str) -> int:
        result = db.session.execute(
            text(
                """
                SELECT COALESCE(WarningCount, 0) as WarningCount
                FROM EmployeePolicyAcknowledgementStatus
                WHERE EmployeeId = :employee_id
                """
            ),
            {"employee_id": employee_id},
        ).fetchone()

        if not result:
            return 0
        return result.WarningCount
