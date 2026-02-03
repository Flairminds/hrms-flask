"""
Email service module for HRMS email notifications and reports.

This module provides email functionality for:
- Daily leave reports
- Office attendance reports  
- Leave approval notifications
- Leave status notifications

All email operations use SMTP with configured credentials.
"""

import smtplib
from typing import Dict, Any, List, Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta

from flask import current_app
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .. import db
from ..models.hr import Employee, MasterSubRole
from ..models.leave import LeaveTransaction, MasterLeaveTypes
from ..utils.logger import Logger
from ..utils.constants import LeaveStatus, LeaveTypeID, EmailConfig


class EmailService:
    """
    Unified email service for all HRMS email notifications.
    
    Handles:
    - Daily leave reports for management
    - Daily office attendance summaries
    - Leave approval request notifications
    - Leave status change notifications (approved/rejected/partial)
    
    All methods use centralized logging and proper error handling.
    All emails sent via configured SMTP server (default: Gmail).
    
    Example Usage:
        >>> # Send daily leave report
        >>> EmailService.send_leave_report()
        >>>
        >>> # Send leave notification
        >>> EmailService.send_leave_notification_email('John Doe', 'lead@example.com')
    
    Note:
        Requires Flask app configuration for:
        - MAIL_USERNAME: SMTP username
        - MAIL_PASSWORD: SMTP password
        - MAIL_SERVER: SMTP server (default: smtp.gmail.com)
        - MAIL_PORT: SMTP port (default: 587)
        - REPORT_TO_ADDRESSES: Comma-separated recipient list for reports
    """

    # ==================================================================
    # EMAIL REPORTS (Daily/Scheduled Reports)
    # ==================================================================

    @staticmethod
    def send_leave_report() -> bool:
        """
        Sends daily leave report for current/next business day.
        
        Generates HTML table of leaves active on report date (today or next
        business day if weekend). Skips Saturdays and Sundays automatically.
        
        Returns:
            True if email sent successfully, False otherwise
        
        Example:
            >>> if EmailService.send_leave_report():
            ...     print("Leave report sent")
        
        Note:
            - Report date: Today if weekday, Monday if Saturday/Sunday
            - Excludes cancelled leaves
            - Recipient list from REPORT_TO_ADDRESSES config
            - Requires MAIL_USERNAME and MAIL_PASSWORD in config
        """
        Logger.info("Generating daily leave report")
        
        # Determine report date (skip weekends)
        current_date = datetime.today()
        if current_date.weekday() == 5:  # Saturday
            current_date += timedelta(days=2)
            Logger.debug("Report date adjusted - Saturday detected", adjusted_to="Monday")
        elif current_date.weekday() == 6:  # Sunday
            current_date += timedelta(days=1)
            Logger.debug("Report date adjusted - Sunday detected", adjusted_to="Monday")
        
        current_date_str = current_date.strftime('%Y-%m-%d')
        
        # Get email configuration
        from_address = current_app.config.get('MAIL_USERNAME')
        from_password = current_app.config.get('MAIL_PASSWORD')
        to_addresses_str = current_app.config.get('REPORT_TO_ADDRESSES', '')
        to_addresses = [email.strip() for email in to_addresses_str.split(',') if email.strip()]
        
        if not to_addresses:
            Logger.warning("No recipient addresses configured for leave report")
            return False
        
        if not from_address or not from_password:
            Logger.error("SMTP credentials not configured")
            return False
        
        Logger.debug("Fetching leaves for report", report_date=current_date_str)
        
        try:
            # Query leaves using ORM
            leaves = db.session.query(
                LeaveTransaction.from_date,
                LeaveTransaction.to_date,
                Employee.first_name,
                Employee.last_name,
                LeaveTransaction.leave_status,
                MasterLeaveTypes.leave_name
            ).join(
                Employee,
                LeaveTransaction.applied_by == Employee.employee_id
            ).join(
                MasterLeaveTypes,
                LeaveTransaction.leave_type == MasterLeaveTypes.leave_type_id
            ).filter(
                LeaveTransaction.from_date <= current_date_str,
                LeaveTransaction.to_date >= current_date_str,
                LeaveTransaction.leave_status != LeaveStatus.CANCEL
            ).all()
            
            Logger.debug("Leaves retrieved for report", count=len(leaves))
            
            # Build HTML table
            leave_table = """
                <table border='1' style='border-collapse: collapse; text-align: left;'>
                    <tr>
                        <th>From Date</th><th>To Date</th><th>Applied By</th><th>Status</th><th>Leave Type</th>
                    </tr>
            """
            
            for leave in leaves:
                leave_table += f"""
                    <tr>
                        <td>{leave.from_date}</td>
                        <td>{leave.to_date}</td>
                        <td>{leave.first_name} {leave.last_name}</td>
                        <td>{leave.leave_status}</td>
                        <td>{leave.leave_name}</td>
                    </tr>
                """
            
            leave_table += "</table>"
            
            # Prepare email
            msg = MIMEMultipart()
            msg['From'] = from_address
            msg['To'] = ", ".join(to_addresses)
            msg['Subject'] = f"Leave Report - {current_date_str}"
            msg.attach(MIMEText(f"<html><body>{leave_table}</body></html>", 'html'))
            
            # Send email
            Logger.info("Sending leave report email", 
                       recipients=len(to_addresses),
                       leaves_count=len(leaves))
            
            server = smtplib.SMTP(
                current_app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
                current_app.config.get('MAIL_PORT', 587)
            )
            server.starttls()
            server.login(from_address, from_password)
            server.sendmail(from_address, to_addresses, msg.as_string())
            server.quit()
            
            Logger.info("Leave report sent successfully", 
                       report_date=current_date_str,
                       recipients=len(to_addresses))
            return True
            
        except smtplib.SMTPException as e:
            Logger.error("SMTP error sending leave report", 
                        error=str(e),
                        error_type=type(e).__name__)
            return False
        except SQLAlchemyError as e:
            Logger.error("Database error generating leave report", 
                        error=str(e))
            return False
        except Exception as e:
            Logger.critical("Unexpected error sending leave report", 
                           error=str(e),
                           error_type=type(e).__name__)
            return False

    @staticmethod
    def send_office_attendance_report() -> bool:
        """
        Sends daily office attendance report (in-office vs on-leave).
        
        Generates summary showing total employees in office vs on leave
        for report date. Excludes specific employee IDs and relieved employees.
        
        Returns:
            True if email sent successfully, False otherwise
        
        Example:
            >>> if EmailService.send_office_attendance_report():
            ...     print("Attendance report sent")
        
        Note:
            - Excludes: Relieved, Absconding employees
            - Excludes hardcoded IDs: EMP101, EMP54, EMP46, EMP47, EMP330
            - Report shows counts only (not detailed lists)
        """
        Logger.info("Generating office attendance report")
        
        # Determine report date (skip weekends)
        current_date = datetime.today()
        if current_date.weekday() == 5:
            current_date += timedelta(days=2)
        elif current_date.weekday() == 6:
            current_date += timedelta(days=1)
        
        current_date_str = current_date.strftime('%Y-%m-%d')
        
        # Get email configuration
        from_address = current_app.config.get('MAIL_USERNAME')
        from_password = current_app.config.get('MAIL_PASSWORD')
        to_addresses_str = current_app.config.get('REPORT_TO_ADDRESSES', '')
        to_addresses = [email.strip() for email in to_addresses_str.split(',') if email.strip()]
        
        if not to_addresses:
            Logger.warning("No recipient addresses configured for attendance report")
            return False
        
        if not from_address or not from_password:
            Logger.error("SMTP credentials not configured")
            return False
        
        try:
            # Get all active employees (excluding specific statuses and IDs)
            excluded_ids = EmailConfig.EXCLUDED_EMPLOYEE_IDS
            all_employees = Employee.query.filter(
                Employee.employment_status.in_([
                    'Confirmed', 'Probation', 'Trainee', 'Intern', 'Active', 'Resigned'
                ]),
                ~Employee.employee_id.in_(excluded_ids)
            ).all()
            
            Logger.debug("Active employees retrieved", count=len(all_employees))
            
            # Get employees on leave
            on_leave = db.session.query(
                Employee.employee_id,
                Employee.first_name,
                Employee.last_name,
                LeaveTransaction.from_date,
                LeaveTransaction.to_date,
                LeaveTransaction.leave_status,
                MasterLeaveTypes.leave_name
            ).join(
                LeaveTransaction,
                Employee.employee_id == LeaveTransaction.applied_by
            ).join(
                MasterLeaveTypes,
                LeaveTransaction.leave_type == MasterLeaveTypes.leave_type_id
            ).filter(
                LeaveTransaction.from_date <= current_date_str,
                LeaveTransaction.to_date >= current_date_str,
                LeaveTransaction.leave_status != LeaveStatus.CANCEL
            ).all()
            
            # Calculate in-office employees
            leave_ids = {emp.employee_id for emp in on_leave}
            in_office = [emp for emp in all_employees if emp.employee_id not in leave_ids]
            
            Logger.debug("Attendance calculated", 
                        in_office=len(in_office),
                        on_leave=len(on_leave))
            
            # Build email HTML
            html = f"<h3>Office Attendance Report - {current_date_str}</h3>"
            html += f"<p>Total In Office: {len(in_office)} | Total On Leave: {len(on_leave)}</p>"
            
            # Prepare email
            msg = MIMEMultipart()
            msg['From'] = from_address
            msg['To'] = ", ".join(to_addresses)
            msg['Subject'] = f"In Office Report - {current_date_str}"
            msg.attach(MIMEText(f"<html><body>{html}</body></html>", 'html'))
            
            # Send email
            Logger.info("Sending attendance report email", recipients=len(to_addresses))
            
            server = smtplib.SMTP(
                current_app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
                current_app.config.get('MAIL_PORT', 587)
            )
            server.starttls()
            server.login(from_address, from_password)
            server.sendmail(from_address, to_addresses, msg.as_string())
            server.quit()
            
            Logger.info("Attendance report sent successfully", 
                       report_date=current_date_str,
                       in_office=len(in_office),
                       on_leave=len(on_leave))
            return True
            
        except smtplib.SMTPException as e:
            Logger.error("SMTP error sending attendance report", 
                        error=str(e),
                        error_type=type(e).__name__)
            return False
        except SQLAlchemyError as e:
            Logger.error("Database error generating attendance report", 
                        error=str(e))
            return False
        except Exception as e:
            Logger.critical("Unexpected error sending attendance report", 
                           error=str(e),
                           error_type=type(e).__name__)
            return False

    # ==================================================================
    # LEAVE NOTIFICATIONS (Individual Leave Approval/Status Emails)
    # ==================================================================

    @staticmethod
    def send_leave_notification_email(employee_name: str, recipients: str, leave_details: Dict[str, Any] = None) -> bool:
        """
        Sends leave approval request notification to team lead.
        
        Sends detailed notification that employee has requested leave approval.
        
        Args:
            employee_name: Name of employee requesting leave
            recipients: Comma-separated email addresses of approvers
            leave_details: Dictionary containing leave request details:
                - from_date: Start date of leave
                - to_date: End date of leave
                - leave_type: Type of leave
                - description: Reason for leave
                - handover_comments: Handover comments
        
        Returns:
            True if email sent successfully
        
        Raises:
            ValueError: If employee_name or recipients is empty
            SMTPException: If email send fails
        """
        if not employee_name or not employee_name.strip():
            raise ValueError("Employee name is required")
        if not recipients or not recipients.strip():
            raise ValueError("Recipients are required")
        
        Logger.info("Sending leave notification email", employee_name=employee_name)
        
        try:
            subject = f"Leave Request by {employee_name}"
            
            # Default empty details if not provided
            if leave_details is None:
                leave_details = {}
                
            from_date = leave_details.get('from_date', 'N/A')
            to_date = leave_details.get('to_date', 'N/A')
            leave_type = leave_details.get('leave_type', 'N/A')
            description = leave_details.get('description', 'N/A')
            handover_comments = leave_details.get('handover_comments', 'N/A')
            approver_name = leave_details.get('approver_name', 'N/A')
            
            # Format dates if they are datetime/date objects
            if hasattr(from_date, 'strftime'):
                from_date = from_date.strftime('%d-%b-%Y')
            if hasattr(to_date, 'strftime'):
                to_date = to_date.strftime('%d-%b-%Y')
            
            body = f"""
                <html>
                <head>
                    <style>
                        table {{
                            border-collapse: collapse;
                            width: 100%;
                            max-width: 600px;
                        }}
                        th, td {{
                            text-align: left;
                            padding: 8px;
                            border: 1px solid #ddd;
                        }}
                        th {{
                            background-color: #f2f2f2;
                            width: 30%;
                        }}
                        .button {{
                            border: none;
                            background-color: #f2f2f2;
                            color: white;
                            padding: 10px 20px;
                            text-align: center;
                            text-decoration: none;
                            display: inline-block;
                            font-size: 16px;
                            margin: 4px 2px;
                            cursor: pointer;
                            border-radius: 4px;
                        }}
                    </style>
                </head>
                <body>
                    <p>Dear {approver_name},</p>
                    <p><b>{employee_name}</b> has requested your approval for leave.</p>
                    <br>
                    <table>
                        <tr>
                            <th>Leave Type</th>
                            <td>{leave_type}</td>
                        </tr>
                        <tr>
                            <th>From Date</th>
                            <td>{from_date}</td>
                        </tr>
                        <tr>
                            <th>To Date</th>
                            <td>{to_date}</td>
                        </tr>
                        <tr>
                            <th>Reason</th>
                            <td>{description}</td>
                        </tr>
                        <tr>
                            <th>Handover Comments</th>
                            <td>{handover_comments}</td>
                        </tr>
                    </table>
                    <br>
                    <p>Please log in to the HRMS portal to review and take action.</p>
                    <p><a href='https://hrms.flairminds.com/login' class='button'>View in HRMS</a></p>
                    <br>
                    <p>Regards,</p>
                    <p>HRMS Team</p>
                </body>
                </html>
            """
            
            # Parse recipients
            recipient_list = [r.strip() for r in recipients.split(',') if r.strip()]
            
            if not recipient_list:
                Logger.warning("No valid recipient emails after parsing", raw_recipients=recipients)
                raise ValueError("No valid recipient email addresses")
            
            # Get email config
            from_address = current_app.config.get('MAIL_USERNAME')
            from_password = current_app.config.get('MAIL_PASSWORD')
            
            if not from_address or not from_password:
                Logger.error("SMTP credentials not configured for leave notification")
                raise ValueError("Email configuration missing: MAIL_USERNAME and MAIL_PASSWORD required")
            from_name = "HRMS"
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{from_name} <{from_address}>"
            msg['To'] = ', '.join(recipient_list)
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            # Send email
            Logger.debug("Connecting to SMTP server")
            
            server = smtplib.SMTP(
                current_app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
                current_app.config.get('MAIL_PORT', 587)
            )
            server.starttls()
            server.login(from_address, from_password)
            server.sendmail(from_address, recipient_list, msg.as_string())
            server.quit()
            
            Logger.info("Leave notification email sent successfully", 
                       employee_name=employee_name,
                       recipients=len(recipient_list))
            return True
            
        except smtplib.SMTPException as e:
            Logger.error("SMTP error sending leave notification", 
                        employee_name=employee_name,
                        error=str(e),
                        error_type=type(e).__name__)
            raise
        except Exception as e:
            Logger.error("Error sending leave notification email", 
                        employee_name=employee_name,
                        error=str(e),
                        error_type=type(e).__name__)
            raise

    @staticmethod
    def send_leave_status_notification(details: Dict[str, Any]) -> bool:
        """
        Sends detailed leave status notification with complex conditional logic.
        
        Handles approved, rejected, and partial approval statuses with different
        email templates based on leave type and approver level.
        
        Args:
            details: Dictionary containing:
                - employee_name (str): Employee name (required)
                - employee_email (str): Employee email (required)
                - leave_status (str): 'Approved', 'Reject', or 'Partial Approved' (required)
                - leave_type (str): Leave type ID (required)
                - leave_type_name (str): Leave type name (required)
                - start_date (str): Start date (required)
                - end_date (str): End date (required)
                - leave_description (str): Leave description
                - description (str): Approver comment
                - approved_by (str): Approver name
                - approver_mail_id (str): Approver email
                - second_approver_mail_id (str): Second approver email
                - is_second_approver (bool): True if second level approval
                - is_cust_informed (str): 'Yes'/'No'
                - is_communicated_with_team (str): 'Yes'/'No'
                - is_handover_responsibilities (str): 'Yes'/'No'
                - is_com_off_approved (str): 'Yes'/'No' (comp-off approval)
                - is_work_from_approved (str): 'Yes'/'No' (WFH approval)
        
        Returns:
            True if email sent successfully
        
        Raises:
            ValueError: If required fields missing
            SMTPException: If email send fails
        
        Example:
            >>> EmailService.send_leave_status_notification({
            ...     'employee_name': 'John Doe',
            ...     'employee_email': 'john@example.com',
            ...     'leave_status': 'Approved',
            ...     'leave_type': '1',
            ...     'leave_type_name': 'Casual Leave',
            ...     'start_date': '2024-01-15',
            ...     'end_date': '2024-01-17',
            ...     ...
            ... })
            True
        
        Note:
            - Email recipient determined by business logic (second approver, special cases)
            - Email template varies by leave type (comp-off, WFH, standard)
            - Includes approver checklist for relevant leave types
        """
        # Validate required fields
        required_fields = [
            'employee_name', 'employee_email', 'leave_status',
            'leave_type', 'leave_type_name', 'start_date', 'end_date'
        ]
        missing = [f for f in required_fields if not details.get(f)]
        if missing:
            Logger.error("Missing required fields for leave status notification", 
                        missing_fields=missing)
            raise ValueError(f"Missing required fields: {', '.join(missing)}")
        
        Logger.info("Sending leave status notification", 
                   employee_name=details.get('employee_name'),
                   leave_status=details.get('leave_status'))
        
        try:
            # Determine recipient based on business logic
            to_address = details.get('employee_email')
            
            # Special case overrides
            if to_address in EmailConfig.SPECIAL_CASE_REDIRECTS:
                original_address = to_address
                to_address = EmailConfig.SPECIAL_CASE_REDIRECTS[to_address]
                Logger.debug("Email recipient overridden for special case", 
                           original=original_address,
                           redirected_to=to_address)
            
            # For second approver and not rejected, send to second approver
            if details.get('is_second_approver') and details.get('leave_status') != 'Reject':
                to_address = details.get('second_approver_mail_id')
                Logger.debug("Email sent to second approver", second_approver=to_address)
            
            subject = "Employee Leave Report"
            
            # Build email body using helper method
            body = EmailService._build_leave_email_body(details)
            
            # Get email config
            from_address = current_app.config.get('MAIL_USERNAME')
            from_password = current_app.config.get('MAIL_PASSWORD')
            
            if not from_address or not from_password:
                Logger.error("SMTP credentials not configured for leave status notification")
                raise ValueError("Email configuration missing: MAIL_USERNAME and MAIL_PASSWORD required")
            from_name = "Leave Management System"
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{from_name} <{from_address}>"
            msg['To'] = to_address
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            # Add approvers to recipients if not rejected or partially approved
            additional_recipients = []
            if details.get('leave_status') not in ['Reject', 'Partial Approved']:
                if details.get('approver_mail_id'):
                    additional_recipients.append(details.get('approver_mail_id'))
                if details.get('second_approver_mail_id'):
                    additional_recipients.append(details.get('second_approver_mail_id'))
            
            # Send email
            server = smtplib.SMTP(
                current_app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
                current_app.config.get('MAIL_PORT', 587)
            )
            server.starttls()
            server.login(from_address, from_password)
            
            all_recipients = [to_address] + additional_recipients
            server.sendmail(from_address, all_recipients, msg.as_string())
            server.quit()
            
            Logger.info("Leave status notification sent successfully", 
                       employee_name=details.get('employee_name'),
                       leave_status=details.get('leave_status'),
                       recipients=len(all_recipients))
            return True
            
        except smtplib.SMTPException as smtp_ex:
            Logger.error("SMTP error sending leave status notification", 
                        employee_name=details.get('employee_name'),
                        error=str(smtp_ex),
                        error_type=type(smtp_ex).__name__)
            raise
        except Exception as ex:
            Logger.error("Error sending leave status notification", 
                        employee_name=details.get('employee_name'),
                        error=str(ex),
                        error_type=type(ex).__name__)
            raise

    @staticmethod
    def _build_leave_email_body(details: Dict[str, Any]) -> str:
        """
        Builds leave notification email body with conditional logic.
        
        Internal helper method that constructs email HTML based on leave type,
        approval status, and approver level (first vs second approver).
        
        Args:
            details: Leave details dictionary (see send_leave_status_notification)
        
        Returns:
            HTML string for email body
        
        Note:
            - Different templates for standard leaves, comp-off, WFH
            - Includes approver checklists for certain leave types
            - Special handling for partial approvals and second approver
        """
        # CSS styles for email
        mail_body_styles = """
            <style>
                p, ul {
                    margin: 0;
                    padding: 0;
                }
                ul {
                    list-style-type: none;
                    padding-left: 0;
                }
                br {
                    margin: 0;
                    padding: 0;
                }
            </style>
        """
        
        # Leave approval details section
        mail_body_leave_approval_details = mail_body_styles + f"""
            <p>Leave request for {details.get('employee_name')} has been {details.get('leave_status')} for the following details.....</p>
            <p>Leave type: {details.get('leave_type_name')}</p>
            <p>Start date: {details.get('start_date')}</p>
            <p>End date: {details.get('end_date')}</p>
            <p>Leave Description: {details.get('leave_description')}</p>
            <p>Approver Comment: {details.get('description')}</p>
            <p>Approved By: {details.get('approved_by')}</p>
            <br />
        """
        
        # Approver checklist section
        mail_body_approver_checklist = f"""
            <p><b>Approver Checklist Response</b></p>
            <ul>
                <li>Informed customer?: {details.get('is_cust_informed')}</li>
                <li>Communicated within the team?: {details.get('is_communicated_with_team')}</li>
                <li>Handed over or planned responsibilities to others?: {details.get('is_handover_responsibilities')}</li>
        """
        
        # Customer approval checklist (for comp-off and WFH)
        mail_body_customer_approval_checklist = f"""
                <li>Received Customer Approval for Comp-off?: {details.get('is_com_off_approved')}</li>
                <li>Received Customer Approval for Work from home?: {details.get('is_work_from_approved')}</li>
            </ul>
            <br>
            <p>------ HRMS ------</p>
            <p>Leave Management System</p>
        """
        
        # Build body based on is_second_approver flag
        if details.get('is_second_approver'):
            # Leave type 4 or 5 (Comp-off or WFH with customer approval)
            if details.get('leave_type') in [str(LeaveTypeID.COMP_OFF), str(LeaveTypeID.WFH)]:
                if details.get('leave_status') != 'Partial Approved':
                    body = f"""
                        <p>Hi, </p>
                        <p>{details.get('employee_name')} your leave is get {details.get('leave_status')}. <br />
                        {details.get('approved_by')} comment is: {details.get('description')}</p>
                        <br />
                        <p>------ HRMS ------</p>
                        <p>Leave Management System</p>
                    """
                else:
                    body = f"""
                        <p>{details.get('employee_name')} has requested your approval for {details.get('leave_type_name')}. 
                        {details.get('approved_by')} already approved this leave. Team lead's comment is: {details.get('description')}</p>
                        <p><b>Approver Checklist response is as below:</b></p>
                        <ul>
                            <li>Informed customer?: {details.get('is_cust_informed')}</li>
                            <li>Communicated within the team?: {details.get('is_communicated_with_team')}</li>
                            <li>Handed over or planned responsibilities to others?: {details.get('is_handover_responsibilities')}</li>
                            <li>Received Customer Approval for Comp-off?: {details.get('is_com_off_approved')}</li>
                            <li>Received Customer Approval for Work from home?: {details.get('is_work_from_approved')}</li>
                        </ul>
                        <p><a href='https://hrms.flairminds.com/login'>Click here for details</a>.</p>
                        <p>Leave Management System</p>
                    """
            # Leave type 3 (WFH without customer approval checklist)
            elif details.get('leave_type') == str(LeaveTypeID.WFH):
                if details.get('leave_status') != 'Partial Approved':
                    body = f"""
                        <p>Hi, </p>
                        <p>{details.get('employee_name')} your leave is get {details.get('leave_status')}. <br />
                        {details.get('approved_by')} comment is: {details.get('description')}</p>
                        <br />
                        <p>------ HRMS ------</p>
                        <p>Leave Management System</p>
                    """
                else:
                    body = f"""
                        <p>{details.get('employee_name')} has requested your approval for {details.get('leave_type_name')}. 
                        {details.get('approved_by')} already approved this leave. Team lead's comment is: {details.get('description')}</p>
                        <p><a href='https://hrms.flairminds.com/login'>Click here for details</a>.</p>
                        <p>Leave Management System</p>
                    """
            else:
                body = ""
        else:
            # Not second approver - build body based on leave type
            body = mail_body_leave_approval_details
            
            if details.get('leave_status') == 'Reject':
                body = f"""
                    <p>Hi, </p>
                    <p>{details.get('employee_name')} your leave is get {details.get('leave_status')}. <br />
                    {details.get('approved_by')} comment is: {details.get('description')}</p>
                    <br />
                    <p>Leave Management System</p>
                """
            elif details.get('leave_type') in [str(LeaveTypeID.SICK), str(LeaveTypeID.PRIVILEGE), 
                                                   str(LeaveTypeID.LEAVE_WITHOUT_PAY), str(LeaveTypeID.UNPAID_LEAVE)]:
                # Standard leave types with approver checklist
                body += mail_body_approver_checklist
            elif details.get('leave_type') in [str(LeaveTypeID.COMP_OFF), str(LeaveTypeID.WFH)]:
                # Comp-off and WFH with full checklist
                body += mail_body_approver_checklist + mail_body_customer_approval_checklist
        
        return body


# ==================================================================
# LEGACY FUNCTIONS (Backward Compatibility)
# ==================================================================

def process_leave_email() -> bool:
    """
    Legacy function - redirects to EmailService.send_leave_report().
    
    Kept for backward compatibility with existing code.
    
    Returns:
        True if successful
    
    Note:
        Use EmailService.send_leave_report() directly in new code.
    """
    Logger.debug("Legacy process_leave_email() called - redirecting to EmailService")
    return EmailService.send_leave_report()


def process_office_attendance_email() -> bool:
    """
    Legacy function - redirects to EmailService.send_office_attendance_report().
    
    Kept for backward compatibility with existing code.
    
    Returns:
        True if successful
    
    Note:
        Use EmailService.send_office_attendance_report() directly in new code.
    """
    Logger.debug("Legacy process_office_attendance_email() called - redirecting to EmailService")
    return EmailService.send_office_attendance_report()
