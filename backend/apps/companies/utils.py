"""
Shared helpers for the companies app.
"""
import logging

from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def send_credentials_email(user, temp_password):
    """
    Sent when an admin directly creates a user account (Company Admin
    creating an employee, or Super Admin creating a Company Admin).
    Unlike send_invite_email, there's no token/link — the account
    already exists and is immediately usable, but must_change_password
    forces a reset on first login so the temp password is short-lived.
    """
    try:
        send_mail(
            subject="Your Construction ERP account is ready",
            message=(
                f"Hello {user.first_name or user.email},\n\n"
                f"An account has been created for you on Construction ERP.\n\n"
                f"Email: {user.email}\n"
                f"Temporary password: {temp_password}\n\n"
                f"Log in at {settings.FRONTEND_URL}/login — you'll be asked "
                f"to set a new password immediately on first login.\n\n"
                f"This temporary password should not be shared."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )
    except Exception:
        logger.exception(
            "Failed to send credentials email to %s (user id=%s)",
            user.email, user.id,
        )
        
def send_invite_email(invite):
    """
    Sends the invite link to the company's email. Uses whatever
    EMAIL_BACKEND is configured in settings (Brevo API in production/dev).

    Failure to send (bad API key, provider outage, etc.) is logged, not
    raised — the Invitation row is already saved by this point, so a
    flaky email provider shouldn't turn into a 500 for the caller. The
    invite can still be resent later via the resend-invite action.
    """
    link = f"{settings.FRONTEND_URL}/accept-invite/{invite.token}"
    try:
        send_mail(
            subject="You're invited to set up your Construction ERP account",
            message=(
                f"Hello,\n\n"
                f"{invite.company.name} has been approved on Construction ERP.\n"
                f"Click the link below to set up your Company Admin account:\n\n"
                f"{link}\n\n"
                f"This link expires in 7 days."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invite.email],
        )
    except Exception:
        logger.exception(
            "Failed to send invite email to %s (invite id=%s)",
            invite.email, invite.id,
        )