from typing import Dict

from sqlalchemy import text, func
from sqlalchemy.exc import SQLAlchemyError

from .. import db
from ..models.hr import Employee, EmployeePolicyAcknowledgementStatus
from ..utils.mail_util import MailUtil
from ..utils.logger import Logger


class PolicyService:
    """Service for policy acknowledgement, notification email, and warning counts."""

    # ---------------- Policy Acknowledgement -----------------

    @staticmethod
    def get_policy_acknowledgment(employee_id: str) -> Dict:
        """Retrieves policy acknowledgement status for an employee using ORM."""
        Logger.info("Retrieving policy acknowledgement status", employee_id=employee_id)
        
        try:
            # Use SQLAlchemy ORM
            policy_status = EmployeePolicyAcknowledgementStatus.query.filter_by(
                employee_id=employee_id
            ).first()

            if not policy_status:
                Logger.warning("Policy status not found for employee", employee_id=employee_id)
                raise ValueError("Employee not found")

            Logger.debug("Policy acknowledgement retrieved", employee_id=employee_id)
            return {
                "EmployeeId": policy_status.employee_id,
                "LeavePolicyAcknowledged": bool(policy_status.leave_policy_acknowledged),
                "WorkFromHomePolicyAcknowledged": bool(
                    policy_status.work_from_home_policy_acknowledged
                ),
                "ExitPolicyAndProcessAcknowledged": bool(
                    policy_status.exit_policy_and_process_acknowledged
                ),
                "SalaryAdvanceRecoveryPolicyAcknowledged": bool(
                    policy_status.salary_advance_recovery_policy_acknowledged
                ),
                "ProbationToConfirmationPolicyAcknowledged": bool(
                    policy_status.probation_to_confirmation_policy_acknowledged
                ),
                "SalaryAndAppraisalPolicyAcknowledged": bool(
                    policy_status.salary_and_appraisal_policy_acknowledged
                ),
            }
        except ValueError:
            raise
        except SQLAlchemyError as se:
            Logger.error("Database error retrieving policy acknowledgement",
                        employee_id=employee_id,
                        error=str(se))
            raise
        except Exception as e:
            Logger.error("Unexpected error retrieving policy acknowledgement",
                        employee_id=employee_id,
                        error=str(e))
            raise

    @staticmethod
    def update_policy_acknowledgment(
        employee_id: str, policy_name: str, acknowledged: bool
    ) -> None:
        """Updates policy acknowledgement status for an employee using ORM."""
        Logger.info("Updating policy acknowledgement",
                   employee_id=employee_id,
                   policy_name=policy_name,
                   acknowledged=acknowledged)
        
        try:
            if not employee_id or not policy_name:
                Logger.warning("Missing required parameters for policy update",
                             employee_id_present=bool(employee_id),
                             policy_name_present=bool(policy_name))
                raise ValueError("employeeId and policyName are required")

            policy_column_map = {
                "Leave Policy": "leave_policy_acknowledged",
                "Work From Home Policy": "work_from_home_policy_acknowledged",
                "Exit Policy & Process": "exit_policy_and_process_acknowledged",
                "Salary Advance & Recovery Policy": "salary_advance_recovery_policy_acknowledged",
                "Probation To Confirmation Policy": "probation_to_confirmation_policy_acknowledged",
                "Salary and appraisal process Policy": "salary_and_appraisal_policy_acknowledged",
            }

            if policy_name not in policy_column_map:
                Logger.warning("Invalid policy name", policy_name=policy_name)
                raise ValueError("Invalid policy name")

            column_name = policy_column_map[policy_name]

            # Use SQLAlchemy ORM for upsert
            policy_status = EmployeePolicyAcknowledgementStatus.query.filter_by(
                employee_id=employee_id
            ).first()

            if not policy_status:
                # Insert new record
                policy_status = EmployeePolicyAcknowledgementStatus(employee_id=employee_id)
                setattr(policy_status, column_name, acknowledged)
                db.session.add(policy_status)
                Logger.debug("Created new policy status record", employee_id=employee_id)
            else:
                # Update existing record
                setattr(policy_status, column_name, acknowledged)
                Logger.debug("Updated existing policy status", employee_id=employee_id)

            db.session.commit()
            Logger.info("Policy acknowledgement updated successfully",
                       employee_id=employee_id,
                       policy_name=policy_name)
                       
        except ValueError:
            db.session.rollback()
            raise
        except SQLAlchemyError as se:
            db.session.rollback()
            Logger.error("Database error updating policy acknowledgement",
                        employee_id=employee_id,
                        policy_name=policy_name,
                        error=str(se))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Unexpected error updating policy acknowledgement",
                        employee_id=employee_id,
                        policy_name=policy_name,
                        error=str(e))
            raise

    @staticmethod
    def send_policy_email(employee_id: str) -> Dict:
        """Sends policy acknowledgement notification email using ORM."""
        Logger.info("Sending policy acknowledgement email", employee_id=employee_id)
        
        try:
            if not employee_id:
                Logger.warning("Missing employee ID for policy email")
                raise ValueError("Employee ID is required")

            # Employee details using ORM
            employee = Employee.query.filter_by(employee_id=employee_id).first()

            if not employee:
                Logger.warning("Employee not found for policy email", employee_id=employee_id)
                raise ValueError("Employee not found")

            # Policy status using ORM
            policy_status = EmployeePolicyAcknowledgementStatus.query.filter_by(
                employee_id=employee_id
            ).first()

            if not policy_status:
                Logger.warning("Policy status not found", employee_id=employee_id)
                raise ValueError("Policy acknowledgment status not found")

            all_acknowledged = all(
                [
                    policy_status.leave_policy_acknowledged,
                    policy_status.work_from_home_policy_acknowledged,
                    policy_status.exit_policy_and_process_acknowledged,
                    policy_status.salary_advance_recovery_policy_acknowledged,
                    policy_status.probation_to_confirmation_policy_acknowledged,
                    policy_status.salary_and_appraisal_policy_acknowledged,
                ]
            )

            if not all_acknowledged:
                Logger.warning("Not all policies acknowledged", employee_id=employee_id)
                raise ValueError("Not all policies are acknowledged")

            employee_name = f"{employee.first_name} {employee.last_name}"
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

            # Use configuration for HR email (could be moved to config/constants)
            hr_email = "hr@flairminds.com"  # TODO: Move to configuration
            ok = MailUtil.send_email(hr_email, subject, body, is_html=True)
            if not ok:
                Logger.error("Failed to send policy acknowledgement email",
                           employee_id=employee_id,
                           employee_name=employee_name)
                raise RuntimeError("Failed to send policy email")

            Logger.info("Policy acknowledgement email sent successfully",
                       employee_id=employee_id,
                       employee_name=employee_name)
            return {"employeeId": employee_id, "employeeName": employee_name}
            
        except ValueError:
            raise
        except RuntimeError:
            raise
        except SQLAlchemyError as se:
            Logger.error("Database error sending policy email",
                        employee_id=employee_id,
                        error=str(se))
            raise
        except Exception as e:
            Logger.error("Unexpected error sending policy email",
                        employee_id=employee_id,
                        error=str(e))
            raise

    # ---------------- Warning Count -----------------

    @staticmethod
    def update_warning_count(employee_id: str) -> int:
        """Updates warning count for an employee using ORM."""
        Logger.info("Updating warning count", employee_id=employee_id)
        
        try:
            if not employee_id:
                Logger.warning("Missing employee ID for warning count update")
                raise ValueError("Employee ID is required")

            # Use SQLAlchemy ORM for upsert
            policy_status = EmployeePolicyAcknowledgementStatus.query.filter_by(
                employee_id=employee_id
            ).first()

            current_count = policy_status.warning_count if policy_status else 0
            new_count = current_count + 1

            if not policy_status:
                # Insert new record
                policy_status = EmployeePolicyAcknowledgementStatus(
                    employee_id=employee_id,
                    warning_count=new_count
                )
                db.session.add(policy_status)
                Logger.debug("Created new policy status for warning count", employee_ id=employee_id)
            else:
                # Update existing record
                policy_status.warning_count = new_count
                Logger.debug("Updated warning count", employee_id=employee_id)

            db.session.commit()
            Logger.info("Warning count updated",
                       employee_id=employee_id,
                       new_count=new_count)
            return new_count
            
        except ValueError:
            db.session.rollback()
            raise
        except SQLAlchemyError as se:
            db.session.rollback()
            Logger.error("Database error updating warning count",
                        employee_id=employee_id,
                        error=str(se))
            raise
        except Exception as e:
            db.session.rollback()
            Logger.error("Unexpected error updating warning count",
                        employee_id=employee_id,
                        error=str(e))
            raise

    @staticmethod
    def get_warning_count(employee_id: str) -> int:
        """Retrieves warning count for an employee using ORM."""
        policy_status = EmployeePolicyAcknowledgementStatus.query.filter_by(
            employee_id=employee_id
        ).first()

        if not policy_status:
            return 0
        return policy_status.warning_count or 0

