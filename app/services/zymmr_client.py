"""
Shared Zymmr (Frappe) session helpers: login, the generic `generate_report`
POST, and logout. Used by both zymmr_timelog_service.py (Timesheet Analyser)
and zymmr_effort_service.py (Effort Analyser) — each of those owns its own
report payload, column mapping, and row-conversion logic, but they share the
same login/session/request machinery so it isn't duplicated per report.
"""
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


class ZymmrAuthError(PermissionError):
    """Zymmr login failed or session rejected."""


class ZymmrRequestError(RuntimeError):
    """Zymmr was unreachable or returned an unexpected payload."""


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


def post_report(session, sid, payload, referer):
    """Generic generate_report POST (JSON body + sid cookie). `referer` is the
    full URL of the Zymmr report page this call is impersonating (e.g. the
    Timesheet Analyser's QRY-96 or the Effort Analyser's QRY-97)."""
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
            headers=_site_headers(referer, extra),
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
