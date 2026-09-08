"""Small date/time helpers shared across services."""
import calendar
from datetime import date


def iso_utc(dt):
    """
    Many of our audit timestamps (e.g. last_uploaded_at) are stored as naive
    datetime.utcnow() values — plain `.isoformat()` on those has no timezone
    marker, so a frontend `dayjs()`/`Date()` parses them as local time instead
    of UTC (throwing the display off by the browser's UTC offset). Marking
    them explicitly as UTC fixes that.
    """
    if not dt:
        return None
    return dt.isoformat() + 'Z'


def months_ago(from_date, months):
    """`from_date` minus `months` calendar months, clamping the day to the
    target month's length (e.g. 31 Mar - 1 month -> 28/29 Feb)."""
    month_index = from_date.month - 1 - months
    year = from_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(from_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def months_from_now(from_date, months):
    """`from_date` plus `months` calendar months (same day-clamping as months_ago)."""
    return months_ago(from_date, -months)
