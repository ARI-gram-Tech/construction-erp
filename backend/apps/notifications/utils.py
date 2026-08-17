# /apps/notifications/utils.py
"""
Shared helper for firing notifications from anywhere in the codebase.
"""
from .models import Notification


def notify(recipient, title, message='', level='info', link=''):
    """
    Creates a notification for a single user.

    Usage:
        notify(user, 'Your company was approved',
               message='You can now invite your team.',
               level='info', link='/company/dashboard')
    """
    if recipient is None:
        return None
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        level=level,
        link=link,
    )