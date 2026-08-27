from datetime import datetime, date
from decimal import Decimal
from .. import db
from ..models.effort import EffortProjectReport
from ..models.hr import Project, Employee
from ..utils.logger import Logger

# Fields inside a task's JSON entry that are compared to detect a change on re-import.
_DIFF_FIELDS = (
    'title', 'workflow_state', 'assignee_name', 'employee_id',
    'start_date', 'end_date', 'estimate_hours', 'logged_hours', 'remaining_hours',
)


def _normalize(value):
    """Best-effort normalization so equal values in different representations
    (e.g. 2 vs 2.0, or float rounding noise) don't register as a false diff."""
    if isinstance(value, (int, float, Decimal)):
        try:
            return round(float(value), 2)
        except (TypeError, ValueError):
            return value
    if isinstance(value, str):
        return value.strip()
    return value


def _parse_iso_date(value):
    """'YYYY-MM-DD' string -> date, or None. Already-a-date passes through."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


class EffortService:
    """
    Service for persisting and reporting on Effort Analyser task data.

    Storage model: one EffortProjectReport row per project, holding a JSON
    array of that project's tasks keyed by `task_key`. Saving a fresh upload
    upserts each task by key against what's already stored, so the diff
    (added / changed / unchanged) can be reported back to the caller.
    """

    @staticmethod
    def save_report(tasks, file_name, uploaded_by):
        """
        Upserts a batch of task rows (grouped internally by their `project`
        field) into per-project EffortProjectReport rows.

        `tasks`: list of dicts, each with:
            taskKey, project, employeeId (optional), assigneeName, title,
            state, startDate ('YYYY-MM-DD'), endDate ('YYYY-MM-DD'),
            estimateHours, loggedHours, remainingHours (optional)

        Returns a list of per-project diff summaries:
            [{ projectName, totalTasks, added, changed: [...], unchanged }]
        """
        if not tasks:
            raise ValueError("No tasks to save")

        grouped = {}
        for t in tasks:
            proj = (t.get('project') or '').strip()
            key = (t.get('taskKey') or '').strip()
            if not proj or not key:
                continue
            grouped.setdefault(proj, []).append(t)

        if not grouped:
            raise ValueError("No tasks with a project and a task key to save")

        # Resolve project_id for any project not already linked, in one query.
        project_names = list(grouped.keys())
        projects_by_name = {
            (p.project_name or '').strip().lower(): p.project_id
            for p in Project.query.filter(
                db.func.lower(db.func.trim(Project.project_name)).in_([n.lower() for n in project_names])
            ).all()
        }

        # Resolve employee_id for every distinct assignee name in one query.
        assignee_names = {
            (t.get('assigneeName') or '').strip().lower()
            for ts in grouped.values() for t in ts if t.get('assigneeName')
        }
        employees_by_name = {}
        if assignee_names:
            for emp_id, first, last in db.session.query(
                Employee.employee_id, Employee.first_name, Employee.last_name
            ).all():
                full_name = ' '.join(f"{first or ''} {last or ''}".split()).lower()
                if full_name in assignee_names:
                    employees_by_name[full_name] = emp_id

        now = datetime.utcnow()
        summary = []

        for project_name, project_tasks in grouped.items():
            report = EffortProjectReport.query.filter(
                db.func.lower(EffortProjectReport.project_name) == project_name.lower()
            ).first()

            existing_by_key = {t['task_key']: t for t in (report.tasks or [])} if report else {}

            if not report:
                report = EffortProjectReport(
                    project_name=project_name,
                    project_id=projects_by_name.get(project_name.lower()),
                    tasks=[],
                )
                db.session.add(report)

            merged = dict(existing_by_key)
            added_keys, changed = [], []

            for t in project_tasks:
                key = t['taskKey'].strip()
                assignee_name = (t.get('assigneeName') or '').strip()
                new_entry = {
                    'task_key': key,
                    'title': t.get('title'),
                    'workflow_state': t.get('state'),
                    'assignee_name': assignee_name or None,
                    'employee_id': t.get('employeeId') or employees_by_name.get(assignee_name.lower()),
                    'start_date': t.get('startDate'),
                    'end_date': t.get('endDate'),
                    'estimate_hours': t.get('estimateHours') or 0,
                    'logged_hours': t.get('loggedHours') or 0,
                    'remaining_hours': t.get('remainingHours'),
                }

                existing = existing_by_key.get(key)
                if existing is None:
                    new_entry['first_seen_at'] = now.isoformat()
                    new_entry['updated_at'] = now.isoformat()
                    merged[key] = new_entry
                    added_keys.append(key)
                else:
                    field_changes = [
                        {'field': field, 'old': existing.get(field), 'new': new_entry.get(field)}
                        for field in _DIFF_FIELDS
                        if _normalize(existing.get(field)) != _normalize(new_entry.get(field))
                    ]
                    if field_changes:
                        new_entry['first_seen_at'] = existing.get('first_seen_at', now.isoformat())
                        new_entry['updated_at'] = now.isoformat()
                        merged[key] = new_entry
                        changed.append({
                            'taskKey': key,
                            'title': new_entry.get('title'),
                            'changes': field_changes,
                        })
                    else:
                        merged[key] = existing  # unchanged — keep as-is, preserve original timestamps

            tasks_list = list(merged.values())
            starts = [_parse_iso_date(t.get('start_date')) for t in tasks_list]
            ends = [_parse_iso_date(t.get('end_date')) for t in tasks_list]
            starts = [d for d in starts if d]
            ends = [d for d in ends if d]

            report.tasks = tasks_list
            report.task_count = len(tasks_list)
            report.start_date = min(starts) if starts else None
            report.end_date = max(ends) if ends else None
            report.last_uploaded_at = now
            report.last_uploaded_by = uploaded_by
            report.source_file = file_name
            if report.project_id is None:
                report.project_id = projects_by_name.get(project_name.lower())

            summary.append({
                'projectName': project_name,
                'totalTasks': len(tasks_list),
                'added': len(added_keys),
                'changed': changed,
                'unchanged': len(tasks_list) - len(added_keys) - len(changed),
            })

        db.session.commit()
        Logger.info("Effort report saved", projects=len(summary), file_name=file_name, uploaded_by=uploaded_by)
        return summary

    @staticmethod
    def get_tasks(project_name=None, from_date=None, to_date=None):
        """
        Flattened list of all tasks across (optionally filtered) projects, in
        the shape the frontend's Excel-parsed rows already use, so it can
        feed the existing chart/table pipeline unchanged.
        """
        query = EffortProjectReport.query.filter(EffortProjectReport.is_deleted.is_(False))
        if project_name:
            query = query.filter(db.func.lower(EffortProjectReport.project_name) == project_name.strip().lower())
        reports = query.all()

        rows = []
        for report in reports:
            for t in (report.tasks or []):
                end = t.get('end_date')
                if from_date and (not end or end < from_date):
                    continue
                if to_date and (not end or end > to_date):
                    continue
                rows.append({
                    'taskKey': t.get('task_key'),
                    'project': report.project_name,
                    'assignee': t.get('assignee_name'),
                    'employeeId': t.get('employee_id'),
                    'title': t.get('title'),
                    'state': t.get('workflow_state'),
                    'startDate': t.get('start_date'),
                    'endDate': t.get('end_date'),
                    'estimateHours': float(t.get('estimate_hours') or 0),
                    'loggedHours': float(t.get('logged_hours') or 0),
                    'remainingHours': (
                        float(t['remaining_hours']) if t.get('remaining_hours') is not None else None
                    ),
                })
        return rows

    @staticmethod
    def get_reports_summary():
        """Lightweight per-project listing (no task payload) for a reports index."""
        reports = (
            EffortProjectReport.query
            .filter(EffortProjectReport.is_deleted.is_(False))
            .order_by(EffortProjectReport.project_name)
            .all()
        )
        return [{
            'id': r.id,
            'projectId': r.project_id,
            'projectName': r.project_name,
            'taskCount': r.task_count,
            'startDate': r.start_date.isoformat() if r.start_date else None,
            'endDate': r.end_date.isoformat() if r.end_date else None,
            'lastUploadedAt': r.last_uploaded_at.isoformat() if r.last_uploaded_at else None,
            'lastUploadedBy': r.last_uploaded_by,
            'sourceFile': r.source_file,
        } for r in reports]
