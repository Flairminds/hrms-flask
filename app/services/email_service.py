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
from datetime import datetime, timedelta, date

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
    # Helper Methods
    # ==================================================================

    @staticmethod
    def _get_common_styles() -> str:
        return """
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; }
                .header { background-color: #f8f9fa; padding: 15px; text-align: center; border-bottom: 1px solid #eee; border-radius: 8px 8px 0 0; }
                .header h2 { margin: 0; color: #2c3e50; font-size: 20px; }
                .status-approved { color: #28a745; font-weight: bold; }
                .status-rejected { color: #dc3545; font-weight: bold; }
                .status-partial { color: #fd7e14; font-weight: bold; }
                .content { padding: 20px 0; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
                th, td { padding: 10px; border-bottom: 1px solid #f0f0f0; text-align: left; }
                th { width: 35%; color: #666; font-weight: 600; background-color: #f9f9f9; }
                .checklist { background-color: #f8f9fa; padding: 15px; margin-top: 20px; border-radius: 6px; font-size: 14px; border: 1px solid #eee; }
                .checklist h4 { margin: 0 0 10px 0; color: #555; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
                .checklist ul { list-style: none; padding: 0; margin: 0; }
                .checklist li { padding: 5px 0; border-bottom: 1px dashed #eee; }
                .checklist li:last-child { border-bottom: none; }
                .button { display: inline-block; padding: 12px 24px; background-color: #f9f9f9; color: white; text-decoration: none; border-radius: 4px; margin-top: 25px; font-weight: 600; text-align: center; }
                .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        """

    @staticmethod
    def _get_email_header(title: str) -> str:
        return f"""
            <div class="header">
                <h2>{title}</h2>
            </div>
        """

    @staticmethod
    def _get_email_footer() -> str:
        year = datetime.now().year
        return f"""
            <div class="footer">
                <p>This is an automated message from HRMS. Please do not reply directly to this email.</p>
                <p>&copy; {year} Flairminds. All rights reserved.</p>
            </div>
        """

    @staticmethod
    def _format_date(date_val: Any) -> str:
        if not date_val or date_val == 'N/A':
            return 'N/A'
        if isinstance(date_val, (datetime, date)):
             return date_val.strftime('%d-%b-%Y')
        if isinstance(date_val, str):
             try:
                 # Check if string matches YYYY-MM-DD or other common formats
                 # Cleaning potential time parts
                 clean_date = date_val.split(' ')[0]
                 return datetime.strptime(clean_date, '%Y-%m-%d').strftime('%d-%b-%Y')
             except ValueError:
                 return date_val
        return str(date_val)


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
                
            # Fetch and format details
            from_date = EmailService._format_date(leave_details.get('from_date'))
            to_date = EmailService._format_date(leave_details.get('to_date'))
            leave_type = leave_details.get('leave_type', 'N/A')
            description = leave_details.get('description', 'N/A')
            handover_comments = leave_details.get('handover_comments', 'N/A')
            approver_name = leave_details.get('approver_name', 'Approver')
            
            # Build Email Content
            styles = EmailService._get_common_styles()
            header = EmailService._get_email_header(f"New Leave Request")
            footer = EmailService._get_email_footer()
            
            body_content = f"""
                <div class="content">
                    <p>Dear {approver_name},</p>
                    <p><b>{employee_name}</b> has requested your approval for leave.</p>
                    
                    <table>
                        <tr><th>Leave Type</th><td>{leave_type}</td></tr>
                        <tr><th>From Date</th><td>{from_date}</td></tr>
                        <tr><th>To Date</th><td>{to_date}</td></tr>
                        <tr><th>Reason</th><td>{description}</td></tr>
                        <tr><th>Handover Comments</th><td>{handover_comments}</td></tr>
                    </table>
                    
                    <div style="text-align: center;">
                        <a href='https://hrms.flairminds.com/login' class='button'>View in HRMS</a>
                    </div>
                </div>
            """
            
            body = f"<html><head>{styles}</head><body><div class='container'>{header}{body_content}{footer}</div></body></html>"
            
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
            # Determine recipients
            to_address = details.get('employee_email')
            
            # Special case overrides
            if to_address in EmailConfig.SPECIAL_CASE_REDIRECTS:
                to_address = EmailConfig.SPECIAL_CASE_REDIRECTS[to_address]
            
            cc_addresses = []
            
            # Add Approver to CC
            approver_email = details.get('approver_mail_id')
            if approver_email:
                cc_addresses.append(approver_email)
                
            # Add configured CCs
            if hasattr(EmailConfig, 'LEAVE_NOTIFICATION_CC'):
                cc_addresses.extend(EmailConfig.LEAVE_NOTIFICATION_CC)
                
            # Handle Second Approver
            if details.get('is_second_approver'):
                 second_approver_email = details.get('second_approver_mail_id')
                 if second_approver_email:
                     if details.get('leave_status') == LeaveStatus.PARTIAL_APPROVED:
                         # For Partial Approval, notify Second Approver
                         # Ideally they should be To or CC. User said "send email to the second approver"
                         # Let's add them to CC to ensure they see it, or To?
                         # "send email to the leave applier and the leave approver in cc... In case of partial approved also send email to the second approver"
                         # This implies Second Approver is ALSO a recipient.
                         cc_addresses.append(second_approver_email)
                     elif details.get('leave_status') == LeaveStatus.APPROVED:
                         # If finally approved by second approver, they are already the 'approver' context?
                         pass

            # Deduplicate CCs and remove To address if present
            cc_addresses = list(set(cc_addresses))
            if to_address in cc_addresses:
                cc_addresses.remove(to_address)
            
            # Filter empty
            cc_addresses = [email for email in cc_addresses if email]

            subject = f"Leave for {details.get('employee_name')} {details.get('leave_status')}"
            
            # Build email body using helper method
            body = EmailService._build_leave_email_body(details)
            
            # Get email config
            from_address = current_app.config.get('MAIL_USERNAME')
            from_password = current_app.config.get('MAIL_PASSWORD')
            
            if not from_address or not from_password:
                Logger.error("SMTP credentials not configured for leave status notification")
                raise ValueError("Email configuration missing: MAIL_USERNAME and MAIL_PASSWORD required")
            from_name = "HRMS"
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{from_name} <{from_address}>"
            msg['To'] = to_address
            if cc_addresses:
                msg['Cc'] = ', '.join(cc_addresses)
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            # Combine all recipients for SMTP transaction
            all_recipients = [to_address] + cc_addresses
            
            # Send email
            server = smtplib.SMTP(
                current_app.config.get('MAIL_SERVER', 'smtp.gmail.com'),
                current_app.config.get('MAIL_PORT', 587)
            )
            server.starttls()
            server.login(from_address, from_password)
            
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
        Builds leave notification email body with unified professional template.
        """
        # Status formatting
        status_raw = details.get('leave_status')
        status_display = status_raw
        status_class = "status-approved"
        if status_raw == 'Reject':
            status_display = 'Rejected'
            status_class = "status-rejected"
        elif status_raw == 'Partial Approved':
            status_display = 'Partially Approved'
            status_class = "status-partial"
        elif status_raw == 'Cancel':
            status_display = 'Cancelled'

        # Checklist Logic
        checklist_items = []
        leave_type_id = str(details.get('leave_type'))
        
        # Determine strict base checklist eligibility
        has_base_checklist = leave_type_id in [
            str(LeaveTypeID.SICK), str(LeaveTypeID.PRIVILEGE), 
            str(LeaveTypeID.LEAVE_WITHOUT_PAY), str(LeaveTypeID.UNPAID_LEAVE),
            str(LeaveTypeID.COMP_OFF), str(LeaveTypeID.WFH)
        ]
        
        has_extended_checklist = leave_type_id in [str(LeaveTypeID.COMP_OFF), str(LeaveTypeID.WFH)]

        if has_base_checklist:
            checklist_items.extend([
                ("Informed Customer", details.get('is_cust_informed')),
                ("Communicated with Team", details.get('is_communicated_with_team')),
                ("Handed over responsibilities", details.get('is_handover_responsibilities'))
            ])
            
        if has_extended_checklist:
             checklist_items.extend([
                ("Customer Approved Comp-off", details.get('is_com_off_approved')),
                ("Customer Approved WFH", details.get('is_work_from_approved'))
            ])

        # Generate Checklist HTML
        checklist_html = ""
        if checklist_items:
            checklist_html = f"""
                <div class="checklist">
                    <h4>Approver Checklist</h4>
                    <ul>
            """
            for label, val in checklist_items:
                # Format Yes/No with color
                val_display = f'<span style="color: {"green" if val == "Yes" else "red"}">{val}</span>'
                checklist_html += f"<li>{label}: <b>{val_display}</b></li>"
            checklist_html += """
                    </ul>
                </div>
            """

        # Supplemental Message for Partial Approval
        partial_msg = ""
        if status_raw == 'Partial Approved':
            partial_msg = """
                <div style="background-color: #fff7e6; border: 1px solid #ffd591; padding: 10px; margin: 15px 0; border-radius: 4px; color: #d46b08;">
                    <strong>Note:</strong> Second approval is required. Please await the final decision.
                </div>
            """

        # Format Dates
        start_date = EmailService._format_date(details.get('start_date'))
        end_date = EmailService._format_date(details.get('end_date'))

        # Main Body Construction
        styles = EmailService._get_common_styles()
        header = EmailService._get_email_header("Leave Status Update")
        footer = EmailService._get_email_footer()

        body_content = f"""
            <div class="content">
                <p>Dear {details.get('employee_name')},</p>
                
                <p>Your leave request has been <span class="{status_class}">{status_display}</span>.</p>
                
                {partial_msg}
                
                <table>
                    <tr><th>Leave Type</th><td>{details.get('leave_type_name')}</td></tr>
                    <tr><th>Duration</th><td>{start_date} to {end_date}</td></tr>
                    <tr><th>Reason</th><td>{details.get('leave_description') or 'N/A'}</td></tr>
                    <tr><th>Approver</th><td>{details.get('approved_by')}</td></tr>
                    <tr><th>Approver Comment</th><td>{details.get('description') or 'N/A'}</td></tr>
                </table>
                
                {checklist_html}
                
                <div style="text-align: center;">
                    <a href="https://hrms.flairminds.com/login" class="button">View in HRMS</a>
                </div>
            </div>
        """

        return f"<html><head>{styles}</head><body><div class='container'>{header}{body_content}{footer}</div></body></html>"


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
