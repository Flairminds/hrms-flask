from flask_apscheduler import APScheduler
from .email_service import process_leave_email, process_office_attendance_email

scheduler = APScheduler()

def register_jobs(app):
    """Registers standard HRMS scheduled jobs."""
    
    @scheduler.task('cron', id='send_daily_leave_report', hour=9, minute=0)
    def daily_leave_report():
        with app.app_context():
            print("Running scheduled leave report...")
            process_leave_email()

    @scheduler.task('cron', id='send_daily_attendance_report', hour=8, minute=0)
    def daily_attendance_report():
        with app.app_context():
            print("Running scheduled attendance report...")
            process_office_attendance_email()
            
    # Add other jobs from Phase 2 if any...
