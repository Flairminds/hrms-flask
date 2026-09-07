"""
Fetches Timesheet Analyser rows from Zymmr's analytics generate_report API.

Flow: encrypted usr/pwd → Frappe login (sid, not stored) → generate_report
`message.rows` → convert_zymmr_report_to_timelog_entries → logout → TimelogService.save_report.
"""
from datetime import date, datetime, timedelta
import json

import requests
from flask import current_app

from ..utils.logger import Logger

ZYMMR_LOGIN_PATH = '/api/method/login'
ZYMMR_LOGOUT_PATH = '/api/method/logout'
ZYMMR_REPORT_PATH = '/api/method/everest.everest.modules.analytics.api.generate_report'
# Same client identity as the working browser generate_report call.
ZYMMR_USER_AGENT = (
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36'
)
REPORT_LIMIT = 1000
MAX_RANGE_DAYS = 10
WINDOW_DAYS = 10

# Zymmr generate_report columns (table + field name) → TimelogService.save_report
# fields — the same shape the Excel upload in TimesheetAnalyser produces.
ZYMMR_COLUMN_TO_ENTRY = {
    ('tabWork Item', 'passignee'): 'primaryAssignee',
    ('tabWork Item', 'workflow_state'): 'workflowState',
    ('tabWork Item', 'title'): 'title',
    ('tabWork Item', 'project'): 'project',
    ('tabWork Item', 'start_date'): 'startDate',
    ('tabWork Item', 'end_date'): 'endDate',
    ('tabWork Item', 'key'): 'key',
    ('tabTime Log', 'description'): 'description',
    ('tabTime Log', 'time'): 'timeSeconds',
    ('tabTime Log', 'date'): 'date',
    ('tabTime Log', 'name'): 'id',
    ('tabTime Log', 'author'): 'author',
}

# Fallback when a row dict is already keyed by field name or Excel label
# (no columns metadata, or a slightly different export).
ZYMMR_KEY_TO_ENTRY = {
    'passignee': 'primaryAssignee',
    'workflow_state': 'workflowState',
    'title': 'title',
    'project': 'project',
    'start_date': 'startDate',
    'end_date': 'endDate',
    'key': 'key',
    'description': 'description',
    'time': 'timeSeconds',
    'date': 'date',
    'name': 'id',
    'author': 'author',
    'Primary Assignee': 'primaryAssignee',
    'Workflow State': 'workflowState',
    'Title': 'title',
    'Project': 'project',
    'Start Date': 'startDate',
    'End Date': 'endDate',
    'Key': 'key',
    'Description': 'description',
    'Time': 'timeSeconds',
    'Date': 'date',
    'Id': 'id',
    'Author': 'author',
}


class ZymmrAuthError(PermissionError):
    """Zymmr login failed or session rejected."""


class ZymmrRequestError(RuntimeError):
    """Zymmr was unreachable or returned an unexpected payload."""



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
    # '2026-08-17', '2026-08-17 00:00:00', ISO timestamps
    return text[:10] if len(text) >= 10 else None


def _parse_duration_seconds(value):
    """Zymmr Duration fields arrive as seconds (e.g. 2400.0)."""
    value = _unwrap(value)
    if value in (None, ''):
        return 0
    if isinstance(value, bool):
        return 0
    if isinstance(value, (int, float)):
        return int(round(float(value)))
    text = str(value).strip()
    if not text:
        return 0
    try:
        return int(round(float(text)))
    except ValueError:
        pass
    parts = text.split(':')
    if len(parts) in (2, 3):
        try:
            hours = float(parts[0])
            minutes = float(parts[1])
            seconds = float(parts[2]) if len(parts) == 3 else 0
            return int(hours * 3600 + minutes * 60 + seconds)
        except ValueError:
            return 0
    return 0


def _raise_if_auth_failure(payload):
    if not isinstance(payload, dict):
        return
    if payload.get('exc_type') or payload.get('exc'):
        raise ZymmrAuthError(
            'Zymmr rejected this session. Copy a fresh sid cookie while logged into Zymmr and try again.'
        )
    server_messages = payload.get('_server_messages')
    if server_messages and server_messages not in ('[]', '', None):
        lowered = str(server_messages).lower()
        if 'login' in lowered or 'permission' in lowered or 'not permitted' in lowered:
            raise ZymmrAuthError(
                'Zymmr rejected this session. Copy a fresh sid cookie while logged into Zymmr and try again.'
            )


def _report_body(payload):
    """Return the inner `{ meta, columns, rows }` object from a Frappe method response."""
    _raise_if_auth_failure(payload)
    if isinstance(payload, list):
        return {'columns': [], 'rows': payload, 'meta': {}}
    if not isinstance(payload, dict):
        return {'columns': [], 'rows': [], 'meta': {}}

    msg = payload.get('message', payload)
    if isinstance(msg, str):
        lowered = msg.lower()
        if 'login' in lowered or 'permission' in lowered or 'not permitted' in lowered:
            raise ZymmrAuthError(
                'Zymmr session expired or SID is invalid. Copy a fresh sid cookie while logged into Zymmr.'
            )
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


def _row_key_to_entry_field(columns):
    """
    Use Zymmr column metadata so `name` on tabTime Log maps to `id`, not a
    Work Item name. Falls back to the known field-name / Excel-label map.
    """
    mapping = dict(ZYMMR_KEY_TO_ENTRY)
    for col in columns or []:
        if not isinstance(col, dict):
            continue
        field = ZYMMR_COLUMN_TO_ENTRY.get((col.get('table'), col.get('name')))
        if not field:
            continue
        if col.get('name'):
            mapping[col['name']] = field
        if col.get('label'):
            mapping[col['label']] = field
    return mapping


def _flatten_zymmr_row(row, key_to_field):
    """Map one Zymmr row dict onto save_report field names (values still raw)."""
    if isinstance(row, (list, tuple)):
        # Positional row: zip against column names already in key_to_field order is unreliable.
        return {}
    if not isinstance(row, dict):
        return {}
    mapped = {}
    for key, value in row.items():
        field = key_to_field.get(key) or key_to_field.get(str(key).strip())
        if field:
            mapped[field] = value
    return mapped


def normalize_timelog_entry(raw):
    """
    Coerce a mapped row into the Excel-upload entry shape expected by
    TimelogService.save_report. Returns None if Id, Author, or Date is missing.
    """
    entry_id = _cell_str(raw.get('id'))
    author = _cell_str(raw.get('author'))
    log_date = _parse_date_cell(raw.get('date'))
    if not entry_id or not author or not log_date:
        return None

    time_seconds = _parse_duration_seconds(raw.get('timeSeconds'))
    return {
        'id': entry_id,
        'author': author,
        'primaryAssignee': _cell_str(raw.get('primaryAssignee')),
        'workflowState': _cell_str(raw.get('workflowState')),
        'title': _cell_str(raw.get('title')),
        'project': _cell_str(raw.get('project')) or '',
        'key': _cell_str(raw.get('key')),
        'description': _cell_str(raw.get('description')),
        'startDate': _parse_date_cell(raw.get('startDate')),
        'endDate': _parse_date_cell(raw.get('endDate')),
        'date': log_date,
        'timeSeconds': time_seconds,
        'timeHours': round(time_seconds / 3600, 4) if time_seconds else 0,
    }


def convert_zymmr_report_to_timelog_entries(payload):
    """
    Intermediate converter: Zymmr `generate_report` JSON → the same entry
    dicts an Excel upload sends to POST /api/timelog/save-report.

    Expected payload shape:
        { "message": { "meta": {...}, "columns": [...], "rows": [...] } }
    """
    report = _report_body(payload)
    key_to_field = _row_key_to_entry_field(report['columns'])
    entries = []
    skipped = 0
    for row in report['rows']:
        entry = normalize_timelog_entry(_flatten_zymmr_row(row, key_to_field))
        if entry:
            entries.append(entry)
        else:
            skipped += 1

    if report['rows'] and not entries:
        raise ZymmrRequestError(
            f"Received {len(report['rows'])} Zymmr rows but none had Id, Author, and Date after conversion."
        )

    return entries, {
        'rawRowCount': len(report['rows']),
        'convertedCount': len(entries),
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
            {
                'type': 'left',
                'left': {'table': 'tabWork Item', 'table_label': 'Work Item', 'column': 'name'},
                'right': {'table': 'tabTime Log', 'table_label': 'Time Log', 'column': 'work_item'},
            },
        ],
        'columns': [
            {
                'table': 'tabWork Item',
                'table_label': 'Work Item',
                'columns': [
                    {'label': 'Primary Assignee', 'value': 'passignee', 'type': 'Link'},
                    {'label': 'Workflow State', 'value': 'workflow_state', 'type': 'Link'},
                    {'label': 'Title', 'value': 'title', 'type': 'Data'},
                    {'label': 'Project', 'value': 'project', 'type': 'Link'},
                    {'label': 'Start Date', 'value': 'start_date', 'type': 'Date'},
                    {'label': 'End Date', 'value': 'end_date', 'type': 'Date'},
                    {'label': 'Key', 'value': 'key', 'type': 'Data'},
                ],
            },
            {
                'table': 'tabTime Log',
                'table_label': 'Time Log',
                'columns': [
                    {'label': 'Description', 'value': 'description', 'type': 'Text'},
                    {'label': 'Time', 'value': 'time', 'type': 'Duration'},
                    {'label': 'Date', 'value': 'date', 'type': 'Datetime'},
                    {'label': 'Id', 'value': 'name', 'type': 'Data'},
                    {'label': 'Author', 'value': 'author', 'type': 'Link'},
                ],
            },
        ],
        'filters': [
            {
                'column': {
                    'label': 'Logged Time',
                    'table': 'tabWork Item',
                    'table_label': 'Work Item',
                    'type': 'Duration',
                    'value': 'logged_time',
                },
                'operator': 'is',
                'value': {'label': 'Set', 'value': 'set'},
            },
            {
                'column': {
                    'label': 'Date',
                    'table': 'tabTime Log',
                    'table_label': 'Time Log',
                    'type': 'Datetime',
                    'value': 'date',
                },
                'operator': 'between',
                'value': {
                    'label': f'{from_s} to {to_s}',
                    'value': [from_s, to_s],
                },
            },
        ],
    }

def _iter_windows(from_date, to_date):
    start = from_date
    while start <= to_date:
        end = min(start + timedelta(days=WINDOW_DAYS - 1), to_date)
        yield start, end
        start = end + timedelta(days=1)


def _verify_setting():
    if not current_app.config.get('ZYMMR_SSL_VERIFY', True):
        return False
    try:
        import certifi
        return certifi.where()
    except ImportError:
        return True


def _session():
    session = requests.Session()
    session.verify = _verify_setting()
    return session


def _post(session, url, *, timeout, **kwargs):
    try:
        return session.post(url, timeout=timeout, **kwargs)
    except requests.exceptions.SSLError:
        if session.verify:
            Logger.warning('Zymmr SSL verify failed; retrying without certificate verification')
            session.verify = False
            return session.post(url, timeout=timeout, **kwargs)
        raise


def _site_headers(referer, extra=None):
    """Headers shared by login and generate_report — same shape as the working browser call."""
    site = current_app.config.get('ZYMMR_SITE_NAME', 'flairminds.zymmr.com')
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Frappe-Site-Name': site,
        'Referer': referer,
        'User-Agent': ZYMMR_USER_AGENT,
        'sec-ch-ua-platform': '"macOS"',
        'sec-ch-ua-mobile': '?0',
    }
    if extra:
        headers.update(extra)
    return headers


def _cookie_header(session, sid):
    """Build an explicit Cookie header like the browser generate_report request."""
    parts = [f'sid={sid}'] if sid else []
    csrf = session.cookies.get('csrf_token')
    if csrf:
        parts.append(f'csrf_token={csrf}')
    system_user = session.cookies.get('system_user')
    if system_user:
        parts.append(f'system_user={system_user}')
    return '; '.join(parts)


def login_zymmr(usr, pwd):
    """
    POST /api/method/login (same host, SSL, and headers as generate_report)
    and return (session, sid). usr/pwd are not logged or stored.
    """
    base = current_app.config.get('ZYMMR_BASE_URL', 'https://flairminds.zymmr.com').rstrip('/')
    session = _session()
    login_url = f'{base}{ZYMMR_LOGIN_PATH}'
    headers = _site_headers(f'{base}/frontend/login/')
    try:
        resp = _post(
            session,
            login_url,
            timeout=15,
            data=json.dumps({'usr': usr, 'pwd': pwd}).encode('utf-8'),
            headers=headers,
        )
        # Classic Frappe login is often form-encoded; retry if JSON did not authenticate.
        sid = session.cookies.get('sid') or resp.cookies.get('sid')
        if (not sid or sid == 'Guest') and resp.status_code < 500:
            form_headers = dict(headers)
            form_headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=utf-8'
            resp = _post(
                session,
                login_url,
                timeout=15,
                data={'usr': usr, 'pwd': pwd},
                headers=form_headers,
            )
    except requests.RequestException:
        session.close()
        raise ZymmrRequestError('Could not reach Zymmr. Check the network connection and try again.')

    sid = session.cookies.get('sid') or resp.cookies.get('sid')
    logged_in = False
    try:
        body = resp.json()
        msg = body.get('message')
        if isinstance(msg, str) and msg.lower() == 'logged in':
            logged_in = True
    except ValueError:
        pass

    if resp.status_code in (401, 403) or (not logged_in and (not sid or sid == 'Guest')):
        session.close()
        raise ZymmrAuthError('Zymmr login failed. Check username and password.')
    if resp.status_code >= 400:
        session.close()
        raise ZymmrRequestError('Zymmr login failed. Please try again.')
    if not sid or sid == 'Guest':
        session.close()
        raise ZymmrAuthError('Zymmr login succeeded but no sid cookie was returned.')
    return session, sid


def _post_zymmr(session, sid, payload):
    """Same generate_report POST as the original Timesheet sync (JSON + sid cookie)."""
    base = current_app.config.get('ZYMMR_BASE_URL', 'https://flairminds.zymmr.com').rstrip('/')
    url = f'{base}{ZYMMR_REPORT_PATH}'
    extra = {'Cookie': _cookie_header(session, sid)}
    csrf = session.cookies.get('csrf_token')
    if csrf:
        extra['X-Frappe-CSRF-Token'] = csrf
    try:
        resp = _post(
            session,
            url,
            timeout=90,
            data=json.dumps(payload).encode('utf-8'),
            headers=_site_headers(f'{base}/frontend/analytics/reports/QRY-96', extra),
        )
    except requests.RequestException:
        raise ZymmrRequestError('Could not reach Zymmr. Check the network connection and try again.')

    if resp.status_code in (401, 403):
        raise ZymmrAuthError('Zymmr session expired. Sign in again and retry.')
    if resp.status_code >= 400:
        Logger.warning('Zymmr generate_report HTTP error', status=resp.status_code)
        raise ZymmrRequestError(
            'Zymmr returned an error while generating the report. Try again, or use a smaller date range.'
        )

    stripped = (resp.text or '').lstrip().lower()
    if stripped.startswith('<!doctype') or stripped.startswith('<html'):
        raise ZymmrAuthError('Zymmr session expired. Sign in again and retry.')

    try:
        return resp.json()
    except ValueError:
        raise ZymmrRequestError('Zymmr returned an unexpected response.')


def logout_zymmr(session, sid):
    """
    POST /api/method/logout with the same client/cookies as generate_report
    so the sid does not stay active on Zymmr. Failures are logged, not raised —
    the report has already been fetched.
    """
    if not session or not sid or sid == 'Guest':
        return
    base = current_app.config.get('ZYMMR_BASE_URL', 'https://flairminds.zymmr.com').rstrip('/')
    extra = {'Cookie': _cookie_header(session, sid)}
    csrf = session.cookies.get('csrf_token')
    if csrf:
        extra['X-Frappe-CSRF-Token'] = csrf
    try:
        resp = _post(
            session,
            f'{base}{ZYMMR_LOGOUT_PATH}',
            timeout=15,
            data=b'{}',
            headers=_site_headers(f'{base}/frontend/work-items', extra),
        )
        if resp.status_code >= 400:
            Logger.warning('Zymmr logout returned an error', status=resp.status_code)
    except requests.RequestException as e:
        Logger.warning('Zymmr logout failed', error=str(e))


def fetch_zymmr_timelog_entries(usr, pwd, from_date, to_date):
    """
    Login to Zymmr, pull generate_report for [from_date, to_date], return
    (entries, meta) matching TimelogService.save_report.

    usr/pwd/sid are request-scoped only — not logged or persisted.
    """
    start = _parse_iso_date(from_date)
    end = _parse_iso_date(to_date)
    if not start or not end:
        raise ValueError('from and to must be YYYY-MM-DD dates')
    if end < start:
        raise ValueError("'from' date must be on or before 'to' date")
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        raise ValueError(f'Date range cannot exceed {MAX_RANGE_DAYS} days per sync.')

    session, sid = login_zymmr(usr, pwd)
    try:
        by_id = {}
        truncated = False
        windows = 0
        raw_row_count = 0

        for window_start, window_end in _iter_windows(start, end):
            windows += 1
            entries, conv_meta = convert_zymmr_report_to_timelog_entries(
                _post_zymmr(session, sid, _build_payload(window_start, window_end))
            )
            raw_row_count += conv_meta.get('rawRowCount') or 0
            if conv_meta.get('truncated') or len(entries) >= REPORT_LIMIT:
                truncated = True
            for entry in entries:
                by_id[entry['id']] = entry

        Logger.info(
            'Fetched Zymmr timelog rows',
            windows=windows,
            raw=raw_row_count,
            fetched=len(by_id),
            truncated=truncated,
            from_date=start.isoformat(),
            to_date=end.isoformat(),
        )
        return list(by_id.values()), {
            'fetchedCount': len(by_id),
            'truncated': truncated,
            'from': start.isoformat(),
            'to': end.isoformat(),
            'windows': windows,
        }
    finally:
        try:
            logout_zymmr(session, sid)
        except Exception:
            Logger.warning('Zymmr logout raised unexpectedly')
        session.close()
