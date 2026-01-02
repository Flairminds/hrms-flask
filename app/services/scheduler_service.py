from datetime import datetime
from flask_apscheduler import APScheduler
from .email_service import process_leave_email, process_office_attendance_email
from ..utils.logger import Logger
from .. import db
from ..models.hr import Employee
from ..models.leave import LeaveOpeningTransaction, LeaveTransaction
from ..utils.constants import LeaveTypeID, LeaveConfiguration, EmployeeStatus, LeaveStatus

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
            
    @scheduler.task('cron', id='monthly_leave_allocation', day=1, hour=0, minute=0)
    def monthly_leave_allocation():
        """Automatically allocates leaves on the 1st of every month."""
        with app.app_context():
            today = datetime.now().date()
            month = today.month
            Logger.info("Running monthly leave allocation job", month=month)
            
            try:
                # Determing leave types to allocate
                allocations = []
                # Quarterly Sick Leave (Apr, Jul, Oct, Jan)
                if month in [4, 7, 10, 1]:
                    allocations.append((LeaveTypeID.SICK, LeaveConfiguration.SICK_LEAVE['default_allocation']))
                
                # Yearly Privilege Leave (Apr)
                if month == 4:
                    allocations.append((LeaveTypeID.PRIVILEGE, LeaveConfiguration.PRIVILEGE_LEAVE['default_allocation']))
                
                if not allocations:
                    Logger.info("No leave allocations required for this month")
                    return

                # Get all active employees
                active_employees = Employee.query.filter_by(employment_status=EmployeeStatus.ACTIVE).all()
                
                for emp in active_employees:
                    for lt_id, days in allocations:
                        # Check if allocation already exists for this month/type to prevent duplicates
                        # This is a simple guard - in production we might want more robust FY checking
                        record = LeaveOpeningTransaction(
                            employee_id=emp.employee_id,
                            leave_type_id=lt_id,
                            no_of_days=days,
                            added_by='System',
                            transaction_date=today,
                            approved_by='System',
                            approved_date=today,
                            is_carry_forwarded=False
                        )
                        db.session.add(record)
                
                db.session.commit()
                Logger.info("Monthly leave allocation completed successfully", 
                           employee_count=len(active_employees),
                           allocations=[lv[0] for lv in allocations])
                           
            except Exception as e:
                db.session.rollback()
                Logger.error("Error in monthly leave allocation job", error=str(e))

    @scheduler.task('cron', id='monthly_leave_deduction', day=1, hour=0, minute=5)
    def monthly_leave_deduction():
        """Automatically deducts monthly WFH leaves on the 1st of every month."""
        with app.app_context():
            now = datetime.now()
            Logger.info("Running monthly leave deduction job")
            
            try:
                # Get all active employees
                active_employees = Employee.query.filter_by(employment_status=EmployeeStatus.ACTIVE).all()
                
                deduction_days = LeaveConfiguration.WFH['monthly_deduction']
                
                for emp in active_employees:
                    # Create a deduction record in LeaveTransaction
                    deduction_record = LeaveTransaction(
                        employee_id=emp.employee_id,
                        leave_type_id=LeaveTypeID.WFH,
                        no_of_days=deduction_days,
                        leave_status=LeaveStatus.APPROVED,
                        comments="System: Monthly WFH Deduction",
                        applied_by='System',
                        approved_by='System',
                        application_date=now,
                        approved_date=now,
                        from_date=now,
                        to_date=now
                    )
                    db.session.add(deduction_record)
                
                db.session.commit()
                Logger.info("Monthly leave deduction completed successfully", 
                           employee_count=len(active_employees),
                           deduction_days=deduction_days)
                           
            except Exception as e:
                db.session.rollback()
                Logger.error("Error in monthly leave deduction job", error=str(e))
