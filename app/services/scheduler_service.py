from datetime import datetime, date, timedelta
from flask_apscheduler import APScheduler
from .email_service import process_leave_email, process_office_attendance_email, EmailService
from ..utils.logger import Logger
from .. import db
from ..models.hr import Employee
from ..models.leave import LeaveOpeningTransaction, LeaveTransaction
from ..utils.constants import LeaveTypeID, LeaveConfiguration, EmployeeStatus, LeaveStatus
from ..services.leave.leave_query_service import LeaveQueryService

scheduler = APScheduler()

def register_jobs(app):
    """Registers standard HRMS scheduled jobs."""
    
    @scheduler.task('cron', id='send_daily_leave_report', hour=9, minute=0, timezone='Asia/Kolkata')
    def daily_leave_report():
        with app.app_context():
            Logger.info("Running scheduled leave report job")
            try:
                process_leave_email()
                Logger.info("Daily leave report sent successfully")
            except Exception as e:
                Logger.error("Error in scheduled leave report job", error=str(e))

    @scheduler.task('cron', id='send_daily_attendance_report', hour=8, minute=0, timezone='Asia/Kolkata')
    def daily_attendance_report():
        with app.app_context():
            Logger.info("Running scheduled attendance report job")
            try:
                process_office_attendance_email()
                Logger.info("Daily attendance report sent successfully")
            except Exception as e:
                Logger.error("Error in scheduled attendance report job", error=str(e))

    @scheduler.task('cron', id='period_end_date_alert', hour=9, minute=0, timezone='Asia/Kolkata')
    def daily_period_end_alert():
        """Sends daily alert for interns/probationers with end date in next 5 days or past."""
        with app.app_context():
            Logger.info("Running period end date alert job")
            try:
                result = EmailService.send_period_end_alert()
                if result:
                    Logger.info("Period end date alert sent successfully")
                else:
                    Logger.info("Period end date alert skipped – no qualifying employees")
            except Exception as e:
                Logger.error("Error in period end date alert job", error=str(e))

    @scheduler.task('cron', id='daily_review_alert', hour=9, minute=0, timezone='Asia/Kolkata')
    def daily_review_alert():
        """Sends daily digest of employee review statuses requiring attention."""
        with app.app_context():
            Logger.info("Running daily review alert job")
            try:
                EmailService.send_review_status_alert()
            except Exception as e:
                Logger.error("Error in daily review alert job", error=str(e))
            
    @scheduler.task('cron', id='birthday_greetings', hour=0, minute=5, timezone='Asia/Kolkata')
    def birthday_greetings_job():
        """Daily job for sending birthday wishes at 12:05 AM IST."""
        with app.app_context():
            Logger.info("Running scheduled birthday greetings job")
            try:
                EmailService.send_birthday_wishes()
            except Exception as e:
                Logger.error("Error in birthday greetings job", error=str(e))

    @scheduler.task('cron', id='anniversary_greetings', hour=10, minute=0, timezone='Asia/Kolkata')
    def anniversary_greetings_job():
        """Daily job for sending work anniversary greetings at 10:00 AM IST."""
        with app.app_context():
            Logger.info("Running scheduled anniversary greetings job")
            try:
                EmailService.send_anniversary_wishes()
            except Exception as e:
                Logger.error("Error in anniversary greetings job", error=str(e))

    @scheduler.task('cron', id='monthly_leave_allocation', day=1, hour=0, minute=0, timezone='Asia/Kolkata')
    def monthly_leave_allocation():
        """Automatically allocates leaves on the 1st of every month."""
        with app.app_context():
            try:
                LeaveQueryService.scheduler_monthly_leave_allocation()
            except Exception as e:
                db.session.rollback()
                Logger.error("Error in monthly leave allocation job", error=str(e))

    @scheduler.task('cron', id='monthly_leave_deduction', day=1, hour=0, minute=5, timezone='Asia/Kolkata')
    def monthly_leave_deduction():
        """Automatically deducts monthly WFH leaves on the 1st of every month."""
        with app.app_context():
            now = datetime.now()
            Logger.info("Running monthly leave deduction job")
            
            try:
                # Get all active employees
                active_employees = Employee.query.filter(Employee.employment_status.notin_(['Relieved', 'Absconding'])).all()
                
                deduction_days = LeaveConfiguration.WFH['monthly_deduction']
                
                for emp in active_employees:
                    # Create a deduction record in LeaveTransaction
                    deduction_record = LeaveOpeningTransaction(
                        employee_id=emp.employee_id,
                        leave_type_id=LeaveTypeID.WFH,
                        no_of_days=-1 * deduction_days,
                        added_by='System',
                        transaction_date=now,
                        approved_by='System',
                        approved_date=now,
                        is_carry_forwarded=False,
                        comments="System: Monthly WFH Deduction",
                    )
                    db.session.add(deduction_record)
                
                db.session.commit()
                Logger.info("Monthly leave deduction completed successfully", 
                           employee_count=len(active_employees),
                           deduction_days=deduction_days)
                           
            except Exception as e:
                db.session.rollback()
                Logger.error("Error in monthly leave deduction job", error=str(e))
