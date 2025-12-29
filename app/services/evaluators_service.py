import logging
import threading
from datetime import datetime
from typing import Dict, List

from sqlalchemy import text

from .. import db
from ..utils.mail_util import MailUtil


class EvaluatorsService:
    """Service for assigning evaluators and related HR evaluator operations."""

    # ------------------------------------------------------------------
    # Assign evaluators to an employee
    # ------------------------------------------------------------------

    @staticmethod
    def assign_evaluators(emp_id: str, evaluator_ids: List[str]) -> Dict:
        if not emp_id or not evaluator_ids:
            raise ValueError("Missing empId or evaluatorIds")

        email_failures: List[str] = []

        # Fetch employee details
        employee_result = db.session.execute(
            text(
                """
                SELECT FirstName, LastName, Email
                FROM Employee
                WHERE EmployeeId = :emp_id
                """
            ),
            {"emp_id": emp_id},
        ).fetchone()

        if not employee_result:
            raise ValueError("Employee not found")

        employee_name = f"{employee_result.FirstName} {employee_result.LastName}"

        if len(evaluator_ids) == 0:
            raise ValueError("No evaluators provided")

        # Fetch evaluator details
        placeholders = ",".join([f":id{i}" for i in range(len(evaluator_ids))])
        query = text(
            f"""
            SELECT EmployeeId, FirstName, LastName, Email
            FROM Employee
            WHERE EmployeeId IN ({placeholders})
            """
        )
        params = {f"id{i}": eid for i, eid in enumerate(evaluator_ids)}
        evaluator_details = db.session.execute(query, params).fetchall()

        if len(evaluator_details) != len(evaluator_ids):
            raise ValueError("One or more evaluators not found")

        # Assign evaluators in DB
        db.session.execute(
            text("DELETE FROM EmployeeEvaluators WHERE EmpId = :emp_id"),
            {"emp_id": emp_id},
        )

        for evaluator_id in evaluator_ids:
            db.session.execute(
                text(
                    """INSERT INTO EmployeeEvaluators (EmpId, EvaluatorId, AssignedOn)
                    VALUES (:emp_id, :evaluator_id, :assigned_on)"""
                ),
                {
                    "emp_id": emp_id,
                    "evaluator_id": evaluator_id,
                    "assigned_on": datetime.now(),
                },
            )

        db.session.commit()

        # Send emails asynchronously
        def send_evaluator_emails(failures: List[str]):
            for evaluator in evaluator_details:
                evaluator_name = f"{evaluator.FirstName} {evaluator.LastName}"
                body = f"""
                    <html>
                        <body>
                            <h3>Evaluator Assignment Notification</h3>
                            <p>Dear {evaluator_name},</p>
                            <p>You have been assigned as an evaluator for <strong>{employee_name}</strong>.</p>
                            <p>This evaluation process allows you to score <strong>{employee_name}</strong>'s skills in the HRMS system.
                               You are required to have an interview or give a test to support your scores
                               for each selected skill. Without supporting evidence, the scores may be discarded.</p>

                            <a href="https://hrms.flairminds.com/"
                               style="display: inline-block; background: #1890ff; color: white;
                                      padding: 10px 20px; margin: 15px 0; border-radius: 4px;
                                      text-decoration: none;">
                                Go to Evaluation
                            </a>

                            <p>Thank you for your cooperation.</p>
                            <p>Best regards,<br>HR Team</p>
                        </body>
                    </html>
                """
                ok = MailUtil.send_email(
                    evaluator.Email,
                    f"Evaluator Assignment for {employee_name}",
                    body,
                    is_html=True,
                )
                if not ok:
                    failures.append(evaluator_name)

        email_thread = threading.Thread(
            target=send_evaluator_emails, args=(email_failures,)
        )
        email_thread.start()
        email_thread.join(timeout=2)

        return {"emailFailures": email_failures}

    # ------------------------------------------------------------------
    # Send evaluator reminder
    # ------------------------------------------------------------------

    @staticmethod
    def send_evaluator_reminder(emp_id: str, evaluator_ids: List[str]) -> Dict:
        if not emp_id or not evaluator_ids:
            raise ValueError("Missing empId or evaluatorIds")

        email_failures: List[str] = []

        employee_result = db.session.execute(
            text(
                """
                SELECT FirstName, LastName, Email
                FROM Employee
                WHERE EmployeeId = :emp_id
                """
            ),
            {"emp_id": emp_id},
        ).fetchone()

        if not employee_result:
            raise ValueError("Employee not found")

        employee_name = f"{employee_result.FirstName} {employee_result.LastName}"

        placeholders = ",".join([f":id{i}" for i in range(len(evaluator_ids))])
        query = text(
            f"""
            SELECT e.EmployeeId, e.FirstName, e.LastName, e.Email, ee.AssignedOn
            FROM Employee e
            JOIN EmployeeEvaluators ee ON e.EmployeeId = ee.EvaluatorId
            WHERE e.EmployeeId IN ({placeholders}) AND ee.EmpId = :emp_id
            """
        )
        params = {f"id{i}": eid for i, eid in enumerate(evaluator_ids)}
        params["emp_id"] = emp_id
        evaluator_details = db.session.execute(query, params).fetchall()

        if len(evaluator_details) != len(evaluator_ids):
            raise ValueError(
                "One or more evaluators not found or not assigned to this employee"
            )

        def send_reminder_emails(failures: List[str]):
            for evaluator in evaluator_details:
                evaluator_name = f"{evaluator.FirstName} {evaluator.LastName}"
                assignment_date = (
                    evaluator.AssignedOn.strftime("%Y-%m-%d")
                    if evaluator.AssignedOn
                    else ""
                )
                body = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px;">
                        <h2 style="color: #1890ff;">Evaluation Reminder</h2>
                        <p>Dear {evaluator_name},</p>
                        <div style="background: #f5f5f5; padding: 16px; border-radius: 4px;">
                            <p>Please evaluate:</p>
                            <h3>{employee_name} (ID: {emp_id})</h3>
                            <p>Assigned since: {assignment_date}</p>
                        </div>
                        <p>This evaluation process allows you to score <strong>{employee_name}</strong>'s skills in the HRMS system.
                           You are required to have an interview or test to support each score; without it, scores may be discarded.</p>
                        <a href="https://hrms.flairminds.com/"
                           style="display: inline-block; background: #1890ff; color: white;
                                  padding: 10px 20px; margin: 15px 0; border-radius: 4px;
                                  text-decoration: none;">
                            Go to Evaluation
                        </a>
                        <p style="color: #999; font-size: 12px;">
                            This is an automated reminder. Contact HR if you believe this was sent in error.
                        </p>
                    </div>
                """
                ok = MailUtil.send_email(
                    evaluator.Email,
                    f"Evaluation Reminder for {employee_name}",
                    body,
                    is_html=True,
                )
                if not ok:
                    failures.append(evaluator_name)

        email_thread = threading.Thread(
            target=send_reminder_emails, args=(email_failures,)
        )
        email_thread.start()
        email_thread.join(timeout=2)

        return {"emailFailures": email_failures}

    # ------------------------------------------------------------------
    # Queries for evaluators overview
    # ------------------------------------------------------------------

    @staticmethod
    def get_all_employee_evaluators() -> List[Dict]:
        result = db.session.execute(
            text(
                """
                SELECT 
                    e1.EmployeeId as emp_id,
                    e1.FirstName + ' ' + e1.LastName as employee_name,
                    STRING_AGG(e2.FirstName + ' ' + e2.LastName, ', ') AS evaluator_names,
                    STRING_AGG(e2.EmployeeId, ',') AS evaluator_ids
                FROM EmployeeEvaluators ee
                JOIN Employee e1 ON ee.EmpId = e1.EmployeeId
                JOIN Employee e2 ON ee.EvaluatorId = e2.EmployeeId
                GROUP BY e1.EmployeeId, e1.FirstName, e1.LastName
                """
            )
        )

        return [
            {
                "empId": row.emp_id,
                "employeeName": row.employee_name,
                "evaluatorNames": row.evaluator_names or "",
                "evaluatorIds": row.evaluator_ids.split(",") if row.evaluator_ids else [],
            }
            for row in result
        ]

    @staticmethod
    def get_all_employees_for_evaluator(evaluator_id: str) -> List[Dict]:
        result = db.session.execute(
            text(
                """
                SELECT 
                    e1.EmployeeId AS employeeId,
                    e1.FirstName,
                    e1.LastName
                FROM EmployeeEvaluators ee
                JOIN Employee e1 ON ee.EmpId = e1.EmployeeId
                WHERE ee.EvaluatorId = :evaluator_id
                """
            ),
            {"evaluator_id": evaluator_id},
        )

        return [
            {
                "employeeId": row.employeeId,
                "firstName": row.FirstName,
                "lastName": row.LastName,
            }
            for row in result
        ]

    @staticmethod
    def delete_evaluators(emp_id: str, evaluator_ids: List[str]) -> None:
        if not emp_id or not evaluator_ids:
            raise ValueError("empId and evaluatorIds are required")

        placeholders = ",".join([f":id{i}" for i in range(len(evaluator_ids))])
        query = text(
            f"""
            DELETE FROM EmployeeEvaluators
            WHERE EmpId = :emp_id AND EvaluatorId IN ({placeholders})
            """
        )
        params = {f"id{i}": eid for i, eid in enumerate(evaluator_ids)}
        params["emp_id"] = emp_id

        db.session.execute(query, params)
        db.session.commit()
        logging.info(
            "Deleted evaluators %s for employee %s", ",".join(evaluator_ids), emp_id
        )
