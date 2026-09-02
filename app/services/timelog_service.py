import calendar
from datetime import datetime, date
from decimal import Decimal
from .. import db
from ..models.timelog import EmployeeTimelogReport
from ..models.hr import Employee
from ..utils.logger import Logger

# Fields inside a log entry's JSON that are compared to detect a change on re-import.
_DIFF_FIELDS = (
    'primaryAssignee', 'workflowState', 'title', 'project', 'key', 'description',
    'startDate', 'endDate', 'date', 'timeSeconds',
)


def _normalize(value):
    """Best-effort normalization so equal values in different representations
    (e.g. 2400 vs 2400.0, or float rounding noise) don't register as a false diff."""
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


class TimelogService:
    """
    Service for persisting and reporting on Timesheet Analyser log-entry data.

    Storage model: one EmployeeTimelogReport row per employee PER CALENDAR
    MONTH, holding a JSON array of that employee's log entries for the month,
    keyed by each entry's own `id` (the Excel "Id" column). Employee identity
    is the "Author" column (who logged the time), not "Primary Assignee".
    Saving a fresh upload (which may span multiple months, or be a re-upload
    of a past month) upserts each entry by id against what's already stored,
    so a diff (added / changed / unchanged) can be reported back per
    employee+month group.
    """

    @staticmethod
    def save_report(entries, file_name, uploaded_by):
        """
        Upserts a batch of log-entry rows (grouped internally by Author name
        and the calendar month of each row's `date`) into per-employee-month
        EmployeeTimelogReport rows.

        `entries`: list of dicts, each with:
            id, author, primaryAssignee, workflowState, title, project, key,
            description, startDate ('YYYY-MM-DD'), endDate ('YYYY-MM-DD'),
            date ('YYYY-MM-DD'), timeSeconds, timeHours

        Returns a list of per-employee-month diff summaries:
            [{ employeeName, month, totalEntries, added, changed: [...], unchanged }]
        """
        if not entries:
            raise ValueError("No entries to save")

        grouped = {}
        for e in entries:
            author = (e.get('author') or '').strip()
            entry_id = (e.get('id') or '').strip()
            d = _parse_iso_date(e.get('date'))
            if not author or not entry_id or not d:
                continue
            group_key = (author, d.year, d.month)
            grouped.setdefault(group_key, []).append(e)

        if not grouped:
            raise ValueError("No entries with an Author, Id and Date to save")

        # Resolve employee_id for every distinct author name in one query.
        author_names = {k[0].strip().lower() for k in grouped.keys()}
        employees_by_name = {}
        if author_names:
            for emp_id, first, last in db.session.query(
                Employee.employee_id, Employee.first_name, Employee.last_name
            ).all():
                full_name = ' '.join(f"{first or ''} {last or ''}".split()).lower()
                if full_name in author_names:
                    employees_by_name[full_name] = emp_id

        now = datetime.utcnow()
        summary = []

        for (author, year, month), month_entries in grouped.items():
            start_date = date(year, month, 1)
            end_date = date(year, month, calendar.monthrange(year, month)[1])

            report = EmployeeTimelogReport.query.filter(
                db.func.lower(db.func.trim(EmployeeTimelogReport.employee_name)) == author.lower(),
                EmployeeTimelogReport.start_date == start_date,
            ).first()

            existing_by_id = {t['id']: t for t in (report.timelog or [])} if report else {}
            is_new_report = report is None

            if is_new_report:
                report = EmployeeTimelogReport(
                    employee_name=author,
                    employee_id=employees_by_name.get(author.lower()),
                    timelog=[],
                    start_date=start_date,
                    end_date=end_date,
                    created_by=uploaded_by,
                )
                db.session.add(report)

            merged = dict(existing_by_id)
            added_ids, changed = [], []

            for e in month_entries:
                entry_id = (e.get('id') or '').strip()
                new_entry = {
                    'id': entry_id,
                    'author': author,
                    'primaryAssignee': e.get('primaryAssignee'),
                    'workflowState': e.get('workflowState'),
                    'title': e.get('title'),
                    'project': e.get('project'),
                    'key': e.get('key'),
                    'description': e.get('description'),
                    'startDate': e.get('startDate'),
                    'endDate': e.get('endDate'),
                    'date': e.get('date'),
                    'timeSeconds': e.get('timeSeconds') or 0,
                    'timeHours': e.get('timeHours') if e.get('timeHours') is not None else round((e.get('timeSeconds') or 0) / 3600, 4),
                }

                existing = existing_by_id.get(entry_id)
                if existing is None:
                    new_entry['first_seen_at'] = now.isoformat()
                    new_entry['updated_at'] = now.isoformat()
                    merged[entry_id] = new_entry
                    added_ids.append(entry_id)
                else:
                    field_changes = [
                        {'field': field, 'old': existing.get(field), 'new': new_entry.get(field)}
                        for field in _DIFF_FIELDS
                        if _normalize(existing.get(field)) != _normalize(new_entry.get(field))
                    ]
                    if field_changes:
                        new_entry['first_seen_at'] = existing.get('first_seen_at', now.isoformat())
                        new_entry['updated_at'] = now.isoformat()
                        merged[entry_id] = new_entry
                        changed.append({
                            'entryId': entry_id,
                            'title': new_entry.get('title'),
                            'changes': field_changes,
                        })
                    else:
                        merged[entry_id] = existing  # unchanged — keep as-is, preserve original timestamps

            entries_list = list(merged.values())

            report.timelog = entries_list
            report.entry_count = len(entries_list)
            report.start_date = start_date
            report.end_date = end_date
            report.last_uploaded_at = now
            report.last_uploaded_by = uploaded_by
            report.source_file = file_name
            if not is_new_report:
                report.modified_by = uploaded_by  # modified_at is stamped automatically (onupdate)
            if report.employee_id is None:
                report.employee_id = employees_by_name.get(author.lower())

            summary.append({
                'employeeName': author,
                'month': f'{year:04d}-{month:02d}',
                'totalEntries': len(entries_list),
                'added': len(added_ids),
                'changed': changed,
                'unchanged': len(entries_list) - len(added_ids) - len(changed),
            })

        db.session.commit()
        Logger.info("Timelog report saved", groups=len(summary), file_name=file_name, uploaded_by=uploaded_by)
        return summary

    @staticmethod
    def get_entries(employee_name=None, employee_id=None, from_date=None, to_date=None):
        """
        Flattened list of all log entries across (optionally filtered)
        employee-month reports, in a shape the frontend can feed straight
        into its existing chart/table pipeline.
        """
        query = EmployeeTimelogReport.query.filter(EmployeeTimelogReport.is_deleted.is_(False))
        if employee_name:
            query = query.filter(
                db.func.lower(db.func.trim(EmployeeTimelogReport.employee_name)) == employee_name.strip().lower()
            )
        if employee_id:
            query = query.filter(EmployeeTimelogReport.employee_id == employee_id)
        if from_date:
            query = query.filter(EmployeeTimelogReport.end_date >= from_date)
        if to_date:
            query = query.filter(EmployeeTimelogReport.start_date <= to_date)
        reports = query.all()

        rows = []
        for report in reports:
            for t in (report.timelog or []):
                entry_date = t.get('date')
                if from_date and (not entry_date or entry_date < from_date):
                    continue
                if to_date and (not entry_date or entry_date > to_date):
                    continue
                rows.append({
                    'id': t.get('id'),
                    'employeeId': report.employee_id,
                    'author': report.employee_name,
                    'primaryAssignee': t.get('primaryAssignee'),
                    'workflowState': t.get('workflowState'),
                    'title': t.get('title'),
                    'project': t.get('project'),
                    'key': t.get('key'),
                    'description': t.get('description'),
                    'startDate': t.get('startDate'),
                    'endDate': t.get('endDate'),
                    'date': entry_date,
                    'timeSeconds': t.get('timeSeconds') or 0,
                    'timeHours': t.get('timeHours') if t.get('timeHours') is not None else round((t.get('timeSeconds') or 0) / 3600, 4),
                })
        return rows

    @staticmethod
    def get_reports_summary():
        """Lightweight per-employee-month listing (no entry payload) for a reports index."""
        reports = (
            EmployeeTimelogReport.query
            .filter(EmployeeTimelogReport.is_deleted.is_(False))
            .order_by(EmployeeTimelogReport.employee_name, EmployeeTimelogReport.start_date)
            .all()
        )
        return [{
            'id': r.id,
            'employeeId': r.employee_id,
            'employeeName': r.employee_name,
            'entryCount': r.entry_count,
            'startDate': r.start_date.isoformat() if r.start_date else None,
            'endDate': r.end_date.isoformat() if r.end_date else None,
            'lastUploadedAt': r.last_uploaded_at.isoformat() if r.last_uploaded_at else None,
            'lastUploadedBy': r.last_uploaded_by,
            'sourceFile': r.source_file,
        } for r in reports]
