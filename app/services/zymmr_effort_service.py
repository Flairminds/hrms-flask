"""
Fetches Effort Analyser rows from Zymmr's analytics generate_report API
(the Effort Analyser's QRY-97 report — Work Item level, no Time Log join).

Flow: login (sid, not stored) → generate_report `message.rows` →
convert_zymmr_report_to_effort_tasks → logout → EffortService.save_report.

Login/session/logout machinery lives in zymmr_client.py, shared with
zymmr_timelog_service.py (Timesheet Analyser's Zymmr sync).
"""
from datetime import date, datetime

from flask import current_app

from .zymmr_client import ZymmrRequestError, login_zymmr, logout_zymmr, post_report
from ..utils.dates import months_ago
from ..utils.logger import Logger

REPORT_LIMIT = 1000
# Generous blanket safety cap at the service layer — wide enough for the
# default sync window (2 months back + 2 months ahead = 4 months). The
# tighter "custom ranges can't exceed 2 months" rule from the UI is enforced
# one level up, in EffortController.sync_from_zymmr, only for user-supplied
# ranges (the default itself is allowed to exceed it).
MAX_RANGE_MONTHS = 4

# Zymmr generate_report columns (table + field name) → EffortService.save_report
# fields — the same shape the Excel upload in EffortsAnalyser produces.
ZYMMR_COLUMN_TO_TASK = {
    ('tabWork Item', 'project'): 'project',
    ('tabWork Item', 'title'): 'title',
    ('tabWork Item', 'workflow_state'): 'state',
    ('tabWork Item', 'passignee'): 'assigneeName',
    ('tabWork Item', 'start_date'): 'startDate',
    ('tabWork Item', 'end_date'): 'endDate',
    ('tabWork Item', 'estimate_effort'): 'estimateHours',
    ('tabWork Item', 'logged_time'): 'loggedHours',
    ('tabWork Item', 'remaining_time'): 'remainingHours',
    ('tabWork Item', 'key'): 'taskKey',
}

# Fallback when a row dict is already keyed by field name or Excel label
# (no columns metadata, or a slightly different export).
ZYMMR_KEY_TO_TASK = {
    'project': 'project',
    'title': 'title',
    'workflow_state': 'state',
    'passignee': 'assigneeName',
    'start_date': 'startDate',
    'end_date': 'endDate',
    'estimate_effort': 'estimateHours',
    'logged_time': 'loggedHours',
    'remaining_time': 'remainingHours',
    'key': 'taskKey',
    'Project': 'project',
    'Title': 'title',
    'Workflow State': 'state',
    'Primary Assignee': 'assigneeName',
    'Start Date': 'startDate',
    'End Date': 'endDate',
    'Estimate Effort': 'estimateHours',
    'Logged Time': 'loggedHours',
    'Remaining Time': 'remainingHours',
    'Key': 'taskKey',
}


def _parse_iso_date(value):
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _unwrap(cell):
    if cell is None:
        return None
    if isinstance(cell, dict):
        for key in ('label', 'value', 'name', 'title', 'date'):
            if cell.get(key) not in (None, ''):
                return _unwrap(cell[key])
        return None
    if isinstance(cell, (list, tuple)) and cell:
        return _unwrap(cell[0])
    return cell


def _cell_str(value):
    value = _unwrap(value)
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _parse_date_cell(value):
    value = _unwrap(value)
    if value in (None, ''):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    if not text:
        return None
    return text[:10] if len(text) >= 10 else None


def _parse_duration_hours(value):
    """Zymmr Duration fields arrive as seconds (e.g. 7200.0) — convert to hours."""
    value = _unwrap(value)
    if value in (None, ''):
        return None
    if isinstance(value, bool):
        return None
    try:
        seconds = float(value)
    except (TypeError, ValueError):
        return None
    return round(seconds / 3600, 4)


def _report_body(payload):
    """Return the inner `{ meta, columns, rows }` object from a Frappe method response."""
    if not isinstance(payload, dict):
        return {'columns': [], 'rows': payload if isinstance(payload, list) else [], 'meta': {}}

    msg = payload.get('message', payload)
    if isinstance(msg, str):
        raise ZymmrRequestError(msg)
    if isinstance(msg, list):
        return {'columns': [], 'rows': msg, 'meta': {}}
    if not isinstance(msg, dict):
        return {'columns': [], 'rows': [], 'meta': {}}

    rows = msg.get('rows')
    if not isinstance(rows, list):
        rows = msg.get('data') if isinstance(msg.get('data'), list) else []
    columns = msg.get('columns') if isinstance(msg.get('columns'), list) else []
    meta = msg.get('meta') if isinstance(msg.get('meta'), dict) else {}
    return {'columns': columns, 'rows': rows, 'meta': meta}


def _row_key_to_task_field(columns):
    mapping = dict(ZYMMR_KEY_TO_TASK)
    for col in columns or []:
        if not isinstance(col, dict):
            continue
        field = ZYMMR_COLUMN_TO_TASK.get((col.get('table'), col.get('name')))
        if not field:
            continue
        if col.get('name'):
            mapping[col['name']] = field
        if col.get('label'):
            mapping[col['label']] = field
    return mapping


def _flatten_zymmr_row(row, key_to_field):
    if not isinstance(row, dict):
        return {}
    mapped = {}
    for key, value in row.items():
        field = key_to_field.get(key) or key_to_field.get(str(key).strip())
        if field:
            mapped[field] = value
    return mapped


def normalize_effort_task(raw):
    """
    Coerce a mapped row into the Excel-upload task shape expected by
    EffortService.save_report. Returns None if project or taskKey is missing.
    """
    project = _cell_str(raw.get('project'))
    task_key = _cell_str(raw.get('taskKey'))
    if not project or not task_key:
        return None

    return {
        'taskKey': task_key,
        'project': project,
        'assigneeName': _cell_str(raw.get('assigneeName')),
        'title': _cell_str(raw.get('title')),
        'state': _cell_str(raw.get('state')),
        'startDate': _parse_date_cell(raw.get('startDate')),
        'endDate': _parse_date_cell(raw.get('endDate')),
        'estimateHours': _parse_duration_hours(raw.get('estimateHours')) or 0,
        'loggedHours': _parse_duration_hours(raw.get('loggedHours')) or 0,
        'remainingHours': _parse_duration_hours(raw.get('remainingHours')),
    }


def convert_zymmr_report_to_effort_tasks(payload):
    """
    Intermediate converter: Zymmr `generate_report` JSON → the same task
    dicts an Excel upload sends to POST /api/effort/save-report.
    """
    report = _report_body(payload)
    key_to_field = _row_key_to_task_field(report['columns'])
    tasks = []
    skipped = 0
    for row in report['rows']:
        task = normalize_effort_task(_flatten_zymmr_row(row, key_to_field))
        if task:
            tasks.append(task)
        else:
            skipped += 1

    if report['rows'] and not tasks:
        raise ZymmrRequestError(
            f"Received {len(report['rows'])} Zymmr rows but none had a Project and Key after conversion."
        )

    return tasks, {
        'rawRowCount': len(report['rows']),
        'convertedCount': len(tasks),
        'skipped': skipped,
        'truncated': bool((report['meta'] or {}).get('isCountLimited')),
        'queryRows': (report['meta'] or {}).get('queryRows'),
        'totalRows': (report['meta'] or {}).get('totalRows'),
    }


def _build_payload(from_date, to_date):
    from_s = from_date.isoformat()
    to_s = to_date.isoformat()
    return {
        'base_table': {'table': 'tabWork Item', 'label': 'Work Item'},
        'limit': REPORT_LIMIT,
        'joins': [
            {
                'type': 'inner',
                'left': {'table': 'tabWork Item', 'table_label': 'Work Item', 'column': 'project'},
                'right': {'table': 'tabProject', 'table_label': 'Project', 'column': 'name'},
            },
        ],
        'columns': [
            {
                'table': 'tabWork Item',
                'table_label': 'Work Item',
                'columns': [
                    {'label': 'Project', 'value': 'project', 'type': 'Link'},
                    {'label': 'Title', 'value': 'title', 'type': 'Data'},
                    {'label': 'Workflow State', 'value': 'workflow_state', 'type': 'Link'},
                    {'label': 'Primary Assignee', 'value': 'passignee', 'type': 'Link'},
                    {'label': 'Start Date', 'value': 'start_date', 'type': 'Date'},
                    {'label': 'End Date', 'value': 'end_date', 'type': 'Date'},
                    {'label': 'Estimate Effort', 'value': 'estimate_effort', 'type': 'Duration'},
                    {'label': 'Logged Time', 'value': 'logged_time', 'type': 'Duration'},
                    {'label': 'Remaining Time', 'value': 'remaining_time', 'type': 'Duration'},
                    {'label': 'Key', 'value': 'key', 'type': 'Data'},
                ],
            },
        ],
        'filters': [
            {
                'column': {
                    'label': 'End Date',
                    'value': 'end_date',
                    'type': 'Date',
                    'table': 'tabWork Item',
                    'table_label': 'Work Item',
                },
                'operator': 'between',
                'value': {
                    'label': f'{from_s} to {to_s}',
                    'value': [from_s, to_s],
                },
            },
        ],
    }


def _post_zymmr(session, sid, payload):
    """generate_report POST for the Effort Analyser's Zymmr report (QRY-97)."""
    base = current_app.config.get('ZYMMR_BASE_URL', 'https://flairminds.zymmr.com').rstrip('/')
    return post_report(session, sid, payload, f'{base}/frontend/analytics/reports/QRY-97')


def fetch_zymmr_effort_tasks(usr, pwd, from_date, to_date):
    """
    Login to Zymmr, pull generate_report for Work Items with an End Date in
    [from_date, to_date], return (tasks, meta) matching EffortService.save_report.

    usr/pwd/sid are request-scoped only — not logged or persisted.
    """
    start = _parse_iso_date(from_date)
    end = _parse_iso_date(to_date)
    if not start or not end:
        raise ValueError('from and to must be YYYY-MM-DD dates')
    if end < start:
        raise ValueError("'from' date must be on or before 'to' date")
    if start < months_ago(end, MAX_RANGE_MONTHS):
        raise ValueError(f'Date range cannot exceed {MAX_RANGE_MONTHS} months per sync.')

    session, sid = login_zymmr(usr, pwd)
    try:
        tasks, conv_meta = convert_zymmr_report_to_effort_tasks(
            _post_zymmr(session, sid, _build_payload(start, end))
        )
        truncated = bool(conv_meta.get('truncated')) or len(tasks) >= REPORT_LIMIT

        Logger.info(
            'Fetched Zymmr effort rows',
            raw=conv_meta.get('rawRowCount'),
            fetched=len(tasks),
            truncated=truncated,
            from_date=start.isoformat(),
            to_date=end.isoformat(),
        )
        return tasks, {
            'fetchedCount': len(tasks),
            'truncated': truncated,
            'from': start.isoformat(),
            'to': end.isoformat(),
        }
    finally:
        try:
            logout_zymmr(session, sid)
        except Exception:
            Logger.warning('Zymmr logout raised unexpectedly')
        session.close()
