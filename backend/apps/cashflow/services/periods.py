"""
Pure date-bucketing helpers — no DB, no framework. Given an activity's
planned_start/planned_end and a period_type, returns the list of
normalized period_start dates that activity spans, plus a default
even split of an amount across them.
"""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP


def month_start(d: date) -> date:
    return d.replace(day=1)


def year_start(d: date) -> date:
    return d.replace(month=1, day=1)


def week_start(d: date) -> date:
    # ISO week — Monday as the start of the week.
    return d - __import__('datetime').timedelta(days=d.weekday())


NORMALIZERS = {'week': week_start, 'month': month_start, 'year': year_start}


def generate_periods(start: date, end: date, period_type: str) -> list[date]:
    """Returns every normalized period_start between start and end, inclusive."""
    if start > end:
        start, end = end, start
    normalize = NORMALIZERS[period_type]
    periods = []
    current = normalize(start)
    last = normalize(end)
    while current <= last:
        periods.append(current)
        if period_type == 'week':
            current = current + __import__('datetime').timedelta(weeks=1)
        elif period_type == 'month':
            year = current.year + (current.month // 12)
            month = current.month % 12 + 1
            current = current.replace(year=year, month=month)
        else:  # year
            current = current.replace(year=current.year + 1)
    return periods


def even_split(total: Decimal, periods: list[date]) -> dict:
    """
    Splits `total` evenly across `periods`. Last period absorbs the
    rounding remainder so the sum always exactly equals `total` — never
    silently drops or adds a few cents.
    """
    if not periods:
        return {}
    count = len(periods)
    base = (total / count).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    result = {p: base for p in periods}
    remainder = total - (base * count)
    result[periods[-1]] += remainder
    return result