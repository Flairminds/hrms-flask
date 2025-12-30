import threading
from datetime import datetime
from typing import Dict, List

from sqlalchemy import text, func
from sqlalchemy.exc import SQLAlchemyError

from .. import db
from ..models.hr import Employee, EmployeeEvaluators
from ..utils.mail_util import MailUtil
from ..utils.logger import Logger


class EvaluatorsService:
    """Service for assigning evaluators and related HR evaluator operations."""

    # ------------------------------------------------------------------
    # Assign evaluators to an employee
    # ------------------------------------------------------------------

    @staticmethod
    def assign_evaluators(emp_id: str, evaluator_ids: List[str]) -> Dict:
        """Assigns evaluators to an employee.
        
        Args:
            emp_id: Employee ID
            evaluator_ids: List of evaluator employee IDs
            
        Returns:
            Dictionary with emailFailures list
            
        Raises:
            ValueError: If validation fails
            SQLAlchemyError: If database operation fails
        """
        Logger.info("Assigning evaluators", employee_id=emp_id, evaluator_count=len(evaluator_ids) if evaluator_ids else 0)
        
        try:
            if not emp_id or not evaluator_ids:
                Logger.warning("Missing parameters for assign_evaluators", 
                             emp_id_present=bool(emp_id),
                             evaluator_ids_present=bool(evaluator_ids))
                raise ValueError("Missing empId or evaluatorIds")

            email_failures: List[str] = []

            # Fetch employee details using ORM
            employee = Employee.query.filter_by(employee_id=emp_id).first()

            if not employee:
                Logger.warning("Employee not found for evaluator assignment", employee_id=emp_id)
                raise ValueError("Employee not found")

            employee_name = f"{employee.first_name} {employee.last_name}"

            if len(evaluator_ids) == 0:
                Logger.warning("No evaluators provided", employee_id=emp_id)
                raise ValueError("No evaluators provided")

            # Fetch evaluator details using ORM
            evaluators = Employee.query.filter(Employee.employee_id.in_(evaluator_ids)).all()

            if len(evaluators) != len(evaluator_ids):
                Logger.warning("One or more evaluators not found", 
                             requested_count=len(evaluator_ids),
                             found_count=len(evaluators))
                raise ValueError("One or more evaluators not found")

            # Assign evaluators in DB using ORM
            # Delete existing assignments
            EmployeeEvaluators.query.filter_by(emp_id=emp_id).delete()

            # Add new assignments
            for evaluator_id in evaluator_ids:
                new_assignment = EmployeeEvaluators(
                    emp_id=emp_id,
                    evaluator_id=evaluator_id,
                    assigned_on=datetime.now()
                )
                db.session.add(new_assignment)

            db.session.commit()
            
            Logger.info("Evaluators assigned successfully", 
                       employee_id=emp_id,
                       employee_name=employee_name,
                       evaluator_count=len(evaluators))

            # Send emails asynchronously
            def send_evaluator_emails(failures: List[str]):
                for evaluator in evaluators:
                    evaluator_name = f"{evaluator.first_name} {evaluator.last_name}"
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
                        evaluator.email,
                        f"Evaluator Assignment for {employee_name}",
                        body,
                        is_html=True,
                    )
                    if not ok:
                        Logger.warning("Failed to send evaluator assignment email", 
                                     evaluator_name=evaluator_name,
                                     evaluator_email=evaluator.email)
                        failures.append(evaluator_name)

            email_thread = threading.Thread(
                target=send_evaluator_emails, args=(email_failures,)
            )
            email_thread.start()
            email_thread.join(timeout=2)

            return {"emailFailures": email_failures}
            
        except ValueError as ve:
            db.session.rollback()
            Logger.warning("Validation error assigning evaluators", 
                          employee_id=emp_id,
                          error=str(ve))
            raise
        except SQLAlchemyError as se:
            db.session.rollback()
            Logger.error("Database error assigning evaluators", 
                        employee_id=emp_id,
                        error=str(se))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Unexpected error assigning evaluators", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            raise

    # ------------------------------------------------------------------
    # Send evaluator reminder
    # ------------------------------------------------------------------

    @staticmethod
    def send_evaluator_reminder(emp_id: str, evaluator_ids: List[str]) -> Dict:
        """Sends reminder emails to evaluators.
        
        Args:
            emp_id: Employee ID
            evaluator_ids: List of evaluator employee IDs
            
        Returns:
            Dictionary with emailFailures list
            
        Raises:
            ValueError: If validation fails
            SQLAlchemyError: If database operation fails
        """
        Logger.info("Sending evaluator reminders", employee_id=emp_id, evaluator_count=len(evaluator_ids) if evaluator_ids else 0)
        
        try:
            if not emp_id or not evaluator_ids:
                Logger.warning("Missing parameters for send_evaluator_reminder", 
                             emp_id_present=bool(emp_id),
                             evaluator_ids_present=bool(evaluator_ids))
                raise ValueError("Missing empId or evaluatorIds")

            email_failures: List[str] = []

            # Fetch employee details using ORM
            employee = Employee.query.filter_by(employee_id=emp_id).first()

            if not employee:
                Logger.warning("Employee not found for reminder", employee_id=emp_id)
                raise ValueError("Employee not found")

            employee_name = f"{employee.first_name} {employee.last_name}"

            # Fetch evaluator details with assignment dates using ORM
            evaluators_with_dates = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.last_name,
                Employee.email,
                EmployeeEvaluators.assigned_on
            ).join(
                EmployeeEvaluators,
                Employee.employee_id == EmployeeEvaluators.evaluator_id
            ).filter(
                Employee.employee_id.in_(evaluator_ids),
                EmployeeEvaluators.emp_id == emp_id
            ).all()

            if len(evaluators_with_dates) != len(evaluator_ids):
                Logger.warning("One or more evaluators not found or not assigned", 
                             requested_count=len(evaluator_ids),
                             found_count=len(evaluators_with_dates))
                raise ValueError(
                    "One or more evaluators not found or not assigned to this employee"
                )

            def send_reminder_emails(failures: List[str]):
                for evaluator in evaluators_with_dates:
                    evaluator_name = f"{evaluator.first_name} {evaluator.last_name}"
                    assignment_date = (
                        evaluator.assigned_on.strftime("%Y-%m-%d")
                        if evaluator.assigned_on
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
                        evaluator.email,
                        f"Evaluation Reminder for {employee_name}",
                        body,
                        is_html=True,
                    )
                    if not ok:
                        Logger.warning("Failed to send evaluator reminder email", 
                                     evaluator_name=evaluator_name,
                                     evaluator_email=evaluator.email)
                        failures.append(evaluator_name)

            email_thread = threading.Thread(
                target=send_reminder_emails, args=(email_failures,)
            )
            email_thread.start()
            email_thread.join(timeout=2)
            
            Logger.info("Evaluator reminders sent", 
                       employee_id=emp_id,
                       reminder_count=len(evaluators_with_dates),
                       failed_count=len(email_failures))

            return {"emailFailures": email_failures}
            
        except ValueError as ve:
            Logger.warning("Validation error sending evaluator reminders", 
                          employee_id=emp_id,
                          error=str(ve))
            raise
        except SQLAlchemyError as se:
            Logger.error("Database error sending evaluator reminders", 
                        employee_id=emp_id,
                        error=str(se))
            raise
        except Exception as e:
            Logger.error("Unexpected error sending evaluator reminders", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            raise

    # ------------------------------------------------------------------
    # Queries for evaluators overview
    # ------------------------------------------------------------------

    @staticmethod
    def get_all_employee_evaluators() -> List[Dict]:
        """Gets all employees with their assigned evaluators using ORM with aggregation."""
        # Use SQLAlchemy ORM with func for aggregation
        # Note: STRING_AGG is SQL Server specific, using func.group_concat for compatibility
        # For SQL Server, you might need to use func.string_agg instead
        results = db.session.query(
            Employee.employee_id.label('emp_id'),
            (Employee.first_name + ' ' + Employee.last_name).label('employee_name'),
            func.group_concat(EmployeeEvaluators.evaluator_id).label('evaluator_ids')
        ).join(
            EmployeeEvaluators,
            Employee.employee_id == EmployeeEvaluators.emp_id
        ).group_by(
            Employee.employee_id,
            Employee.first_name,
            Employee.last_name
        ).all()

        # Build list with evaluator names
        output = []
        for row in results:
            evaluator_ids_list = row.evaluator_ids.split(',') if row.evaluator_ids else []
            
            # Fetch evaluator names for this employee
            if evaluator_ids_list:
                evaluator_names_query = Employee.query.filter(
                    Employee.employee_id.in_(evaluator_ids_list)
                ).all()
                evaluator_names = ', '.join([f"{e.first_name} {e.last_name}" for e in evaluator_names_query])
            else:
                evaluator_names = ""
            
            output.append({
                "empId": row.emp_id,
                "employeeName": row.employee_name,
                "evaluatorNames": evaluator_names,
                "evaluatorIds": evaluator_ids_list,
            })
        
        return output

    @staticmethod
    def get_all_employees_for_evaluator(evaluator_id: str) -> List[Dict]:
        """Gets all employees assigned to a specific evaluator using ORM."""
        # Use SQLAlchemy ORM with JOIN
        results = db.session.query(
            Employee.employee_id,
            Employee.first_name,
            Employee.last_name
        ).join(
            EmployeeEvaluators,
            Employee.employee_id == EmployeeEvaluators.emp_id
        ).filter(
            EmployeeEvaluators.evaluator_id == evaluator_id
        ).all()

        return [
            {
                "employeeId": row.employee_id,
                "firstName": row.first_name,
                "lastName": row.last_name,
            }
            for row in results
        ]

    @staticmethod
    def delete_evaluators(emp_id: str, evaluator_ids: List[str]) -> None:
        """Deletes specific evaluator assignments using ORM.
        
        Args:
            emp_id: Employee ID
            evaluator_ids: List of evaluator IDs to remove
            
        Raises:
            ValueError: If parameters are missing
            SQLAlchemyError: If database operation fails
        """
        Logger.info("Deleting evaluator assignments", employee_id=emp_id, evaluator_count=len(evaluator_ids) if evaluator_ids else 0)
        
        try:
            if not emp_id or not evaluator_ids:
                Logger.warning("Missing parameters for delete_evaluators", 
                             emp_id_present=bool(emp_id),
                             evaluator_ids_present=bool(evaluator_ids))
                raise ValueError("empId and evaluatorIds are required")

            # Use SQLAlchemy ORM for bulk delete
            deleted_count = EmployeeEvaluators.query.filter(
                EmployeeEvaluators.emp_id == emp_id,
                EmployeeEvaluators.evaluator_id.in_(evaluator_ids)
            ).delete(synchronize_session=False)

            db.session.commit()
            
            Logger.info("Evaluator assignments deleted successfully",
                       employee_id=emp_id,
                       deleted_count=deleted_count)
                       
        except ValueError as ve:
            db.session.rollback()
            Logger.warning("Validation error deleting evaluators", 
                          employee_id=emp_id,
                          error=str(ve))
            raise
        except SQLAlchemyError as se:
            db.session.rollback()
            Logger.error("Database error deleting evaluators", 
                        employee_id=emp_id,
                        error=str(se))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Unexpected error deleting evaluators", 
                        employee_id=emp_id,
                        error=str(e),
                        error_type=type(e).__name__)
            raise
