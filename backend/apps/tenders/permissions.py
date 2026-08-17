"""
Permission model for Tenders — company-level, not project-scoped
(there's no project until the tender is won). Same tiering shape as
apps.inventory.permissions: company-wide roles get everything, one
"owner" role (qs) does the real work, everyone else is view-only or
excluded.

  COMPANY_WIDE_MANAGERS (company_admin, director, operations_manager)
      Full access to every tender, any action.

  qs
      Can create tenders and pick up any unassigned one. Once a tender
      has an assigned_qs, only THAT qs (or a company-wide manager) can
      edit/submit/convert it — same "don't let two QSs silently
      clobber each other's pricing" reasoning as BOQ's project-member
      check, just without a project to scope against yet.

  VIEW-ONLY (procurement_manager, procurement)
      Need visibility for Market Pricing collaboration (Phase 4
      follow-on) — quoting against a tender's requested items — but
      never edit the tender itself.

Everyone else: no access. Tender pricing/estimated value is exactly
the kind of commercially sensitive data the rest of this codebase
already treats as NDA-boundary (see apps.boq.permissions docstring).
"""
from rest_framework import permissions

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager'}
QS_ROLE = 'qs'
TENDER_VIEW_ROLES = {'procurement_manager', 'procurement'}


def is_company_wide_manager(user):
    return user.role in COMPANY_WIDE_MANAGERS


def is_qs(user):
    return user.role == QS_ROLE


def can_create_tender(user):
    return is_company_wide_manager(user) or is_qs(user)


def can_view_tender(user, tender):
    if is_company_wide_manager(user):
        return True
    if is_qs(user):
        return True
    if user.role in TENDER_VIEW_ROLES:
        return True
    return False


def can_manage_tender(user, tender):
    """
    Edit fields, submit, record outcome, convert to project.
    An unassigned tender (assigned_qs is None) is fair game for any QS
    to pick up — once assigned, it's that QS's tender (or a manager's
    override).
    """
    if is_company_wide_manager(user):
        return True
    if is_qs(user):
        return tender.assigned_qs_id is None or tender.assigned_qs_id == user.id
    return False


class TenderPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action == 'create':
            return can_create_tender(request.user)
        return True  # narrowed at object level / in get_queryset()

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return can_view_tender(request.user, obj)
        return can_manage_tender(request.user, obj)


class TenderBOQNestedPermission(permissions.BasePermission):
    """
    For TenderBOQSectionViewSet / TenderBOQItemViewSet — resolves the
    tender via view.get_tender(), same shape as BOQNestedPermission
    resolving via view.get_boq().project.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        tender = view.get_tender()
        if request.method in permissions.SAFE_METHODS:
            return can_view_tender(request.user, tender)
        return can_manage_tender(request.user, tender)

    def has_object_permission(self, request, view, obj):
        tender = obj.tender
        if request.method in permissions.SAFE_METHODS:
            return can_view_tender(request.user, tender)
        return can_manage_tender(request.user, tender)