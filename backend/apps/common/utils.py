"""
Shared utility functions.
"""
import secrets

from .models import AuditLog


def generate_temp_password(length=12):
    """
    Human-typeable temporary password for admin-created accounts —
    excludes ambiguous characters (0/O, 1/l/I) since this gets read off
    an email and typed in by hand for a first login. Used by
    apps.companies' CreateEmployeeSerializer / CreateCompanyAdminSerializer.
    """
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def log_action(actor, action, company=None, description=''):
    """
    Records an audit log entry. Called from views after a significant
    action succeeds — approve, suspend, subscription change, etc.

    Usage:
        log_action(request.user, 'approved_company', company=company,
                    description=f'Approved {company.name}')
    """
    AuditLog.objects.create(
        actor=actor if getattr(actor, 'is_authenticated', False) else None,
        action=action,
        company=company,
        description=description,
    )