from .. import db
from .base import BaseModel


class EffortProjectReport(BaseModel):
    """
    One row PER PROJECT, holding all of that project's tasks (from the
    "Effort Analyser" Excel upload — frontend/src/pages/Projects/EffortsAnalyser.jsx)
    as a JSON array in `tasks`, rather than one row per task.

    Why JSON-per-project instead of one-row-per-task: the source Excel's
    columns/shape are expected to change over time, and this keeps that change
    contained to the JSON payload instead of requiring a schema migration each
    time. It also makes "did anything change since the last upload" a single
    row read + in-memory JSON diff, rather than a table scan.

    Each element of `tasks` is expected to look like:
        {
            "task_key": "TPAA-267",           # unique within the array; diff key on re-import
            "title": "...",
            "workflow_state": "Done",
            "assignee_name": "Lalit Jadhav",
            "employee_id": "EMP0123" | None,  # resolved HRMS employee_id, if matched
            "start_date": "2026-08-18",
            "end_date": "2026-08-18",
            "estimate_hours": 2.0,
            "logged_hours": 2.0,
            "remaining_hours": 0.0,
            "first_seen_at": "2026-08-27T10:00:00",
            "updated_at": "2026-08-27T10:00:00",  # bumped only when a field actually changes
        }

    `project_name` (not `project_id`) is the natural/unique key, since a
    project whose Excel name has no HRMS match is still stored — just with
    `project_id` left NULL.
    """
    __tablename__ = 'effort_project_report'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id'), nullable=True, index=True)
    project_name = db.Column(db.String(255), unique=True, nullable=False, index=True)

    tasks = db.Column(db.JSON, nullable=False, default=list)
    task_count = db.Column(db.Integer, nullable=False, default=0)  # denormalized len(tasks)

    start_date = db.Column(db.Date)  # MIN(start_date) across tasks
    end_date = db.Column(db.Date, index=True)  # MAX(end_date) across tasks

    last_uploaded_at = db.Column(db.DateTime)
    last_uploaded_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=True)
    source_file = db.Column(db.String(255))
