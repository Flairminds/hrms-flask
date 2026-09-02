from .. import db
from .base import BaseModel


class EmployeeTimelogReport(BaseModel):
    """
    One row PER EMPLOYEE PER CALENDAR MONTH, holding that employee's individual
    time-log entries (from the "Timesheet Analyser" Excel upload —
    frontend/src/pages/Projects/TimesheetAnalyser.jsx) as a JSON array in
    `timelog`, rather than one row per log entry.

    Employee identity is taken from the Excel's "Author" column (who actually
    logged the time), NOT "Primary Assignee" (who the task is assigned to —
    those can differ). `start_date`/`end_date` are always the first/last
    calendar day of the month, derived from each entry's own "Date" column
    (the day the time was logged), not the task's Start/End Date.

    Why JSON-per-employee-month instead of one-row-per-entry: same rationale
    as EffortProjectReport (see app/models/effort.py) — the source Excel's
    columns are expected to change over time, and this keeps re-uploads a
    single row read + in-memory JSON diff instead of a table scan. Re-
    uploading a past sheet is expected and safe: entries are deduplicated by
    the Excel's own "Id" column, so re-importing the same rows updates them
    in place instead of duplicating them.

    Each element of `timelog` is expected to look like:
        {
            "id": "005a780168",               # Excel "Id" column; unique key within the array
            "author": "Ahiresh Gaik",
            "primaryAssignee": "Ahiresh Gaik",
            "workflowState": "Done",
            "title": "Internal meeting",
            "project": "FM Internal",
            "key": "FM-Project-6",             # task ticket key
            "description": "Bi-weekly leadership sync",
            "startDate": "2026-08-03",         # task start date
            "endDate": "2026-08-31",           # task end date
            "date": "2026-08-17",              # the day this time was actually logged
            "timeSeconds": 2400,
            "timeHours": 0.6667,
        }

    `employee_name` (not `employee_id`) is the natural/unique key together
    with `start_date`, since an Author whose Excel name has no HRMS match is
    still stored — just with `employee_id` left NULL.
    """
    __tablename__ = 'employee_timelog_report'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=True, index=True)
    employee_name = db.Column(db.String(255), nullable=False, index=True)

    timelog = db.Column(db.JSON, nullable=False, default=list)
    entry_count = db.Column(db.Integer, nullable=False, default=0)  # denormalized len(timelog)

    start_date = db.Column(db.Date, nullable=False)  # first day of the month
    end_date = db.Column(db.Date, nullable=False, index=True)  # last day of the month

    last_uploaded_at = db.Column(db.DateTime)
    last_uploaded_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=True)
    source_file = db.Column(db.String(255))
