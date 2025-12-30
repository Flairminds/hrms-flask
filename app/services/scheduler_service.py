from flask_apscheduler import APScheduler
from .email_service import process_leave_email, process_office_attendance_email
from ..utils.logger import Logger

scheduler = APScheduler()

def register_jobs(app):
    """Registers standard HRMS scheduled jobs."""
    
    @scheduler.task('cron', id='send_daily_leave_report', hour=9, minute=0)
    def daily_leave_report():
        with app.app_context():
            Logger.info("Running scheduled leave report job")
            try:
                process_leave_email()
                Logger.info("Daily leave report sent successfully")
            except Exception as e:
                Logger.error("Error in scheduled leave report job", error=str(e))

    @scheduler.task('cron', id='send_daily_attendance_report', hour=8, minute=0)
    def daily_attendance_report():
        with app.app_context():
            Logger.info("Running scheduled attendance report job")
            try:
                process_office_attendance_email()
                Logger.info("Daily attendance report sent successfully")
            except Exception as e:
                Logger.error("Error in scheduled attendance report job", error=str(e))
            
    # Add other jobs from Phase 2 if any...
