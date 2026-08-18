"""
Permission model for Procurement (PurchaseRequest).

The three-tier approval logic (is_tier1_approver / is_tier2_approver /
is_tier3_approver, requires_tier3) already lives in views.py and stays
there — those are business-rule functions about WHO can approve at a
given stage, evaluated against the request's live status. This file
covers the broader question: who can see/create/edit a request at all,
before it even reaches an approval stage.

  CREATE/EDIT (draft only) — anyone who's an actual ProjectMember of
      the project, or a company-wide manager. Matches how the field
      scenario actually works: the site engineer or PM raises the
      request, not just tier-1/tier-2/tier-3 approvers.

  VIEW — company-wide managers, the assigned PM, procurement_manager/
      director (company-wide procurement roles, same as tier 2/3 —
      they need to see requests company-wide to do their job, not just
      on projects they're a ProjectMember of), and any ProjectMember
      of that specific project. Purchase requests reveal project
      spend/needs — same NDA boundary as everywhere else, but
      procurement/director roles are deliberately NOT scoped to
      project membership, since approving spend company-wide is
      literally their job.

Submit/cancel/approve/reject stay gated by the existing tier functions
in views.py — this file only decides the surrounding CRUD.
"""
from rest_framework import permissions

from apps.team.models import ProjectMember

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager'}
COMPANY_WIDE_PROCUREMENT_ROLES = {'procurement_manager', 'director', 'company_admin'}


def is_company_wide_manager(user):
    return user.role in COMPANY_WIDE_MANAGERS


def is_company_wide_procurement(user):
    return user.role in COMPANY_WIDE_PROCUREMENT_ROLES


def is_assigned_project_manager(user, project):
    return project.project_manager_id == user.id


def is_project_member(user, project):
    return ProjectMember.objects.filter(project=project, user=user).exists()


PROCUREMENT_STAFF_ROLES = {'procurement_manager', 'procurement'}


def can_create_request(user, project):
    """
    Procurement owns Purchase Requests end-to-end now — raising them,
    buying from suppliers, logging delivery/receipt. Site staff and PMs
    use the internal Restock Request (apps.planning) instead, which
    never involves a supplier. Being a ProjectMember alone is no longer
    enough to create a PR.
    """
    if is_company_wide_manager(user):
        return True
    return user.role in PROCUREMENT_STAFF_ROLES


def can_view_requests(user, project):
    if is_company_wide_manager(user):
        return True
    if is_company_wide_procurement(user):
        return True
    if is_assigned_project_manager(user, project):
        return True
    return is_project_member(user, project)


def can_record_delivery(user):
    """
    Logging what the supplier's delivery note says arrived — procurement's
    job, not the requester's or an unrelated project member's. Company-wide
    managers can always override, same as everywhere else in this app.
    """
    if is_company_wide_manager(user):
        return True
    return user.role in ('procurement_manager', 'procurement')


def can_record_receipt(user, project):
    """
    Confirming what actually landed at a warehouse — this is the action
    that moves real stock, so it belongs to whoever can physically receive
    at that project's store (storekeeper, if they're on this project) or
    company-wide logistics, not procurement staff who never touch the
    warehouse.
    """
    if is_company_wide_manager(user):
        return True
    from apps.inventory.permissions import can_manage_warehouse_logistics
    if can_manage_warehouse_logistics(user):
        return True
    if user.role == 'storekeeper':
        return is_project_member(user, project)
    return False


class PurchaseRequestPermission(permissions.BasePermission):
    """
    list/create   -> can_create_request / can_view_requests
    retrieve      -> can_view_requests
    update/delete -> handled in perform_update() (own-draft-only rule
                     already there) — this just requires viewability
                     as a floor, the view's own checks narrow further
    submit/cancel/approve/reject -> tier functions in views.py decide;
                     this permission class just requires the user can
                     see the project's requests at all as a baseline
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action in ('inbox', 'all_requests'):
            # Cross-project by design — filtering to what each role can
            # see/act on happens inside the view itself (queryset scoped
            # by role), not here.
            return True
        project = view.get_project()
        if view.action == 'create':
            return can_create_request(request.user, project)
        return can_view_requests(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = obj.project
        if request.method in permissions.SAFE_METHODS:
            return can_view_requests(request.user, project)
        if view.action == 'record_delivery':
            return can_record_delivery(request.user)
        if view.action == 'record_receipt':
            return can_record_receipt(request.user, project)
        # Everything else (update/destroy/submit/cancel/approve/reject/
        # escalate) requires at least view access as a floor — the
        # view's own ownership/tier checks (perform_update, approve,
        # reject, escalate) apply the real narrowing on top of this.
        return can_view_requests(request.user, project)


BOSS_ROLES = {'director', 'company_admin'}


def can_generate_lpo(user):
    """Procurement creates LPOs from approved PRs — same tier as everything else procurement does."""
    if is_company_wide_manager(user):
        return True
    return user.role in PROCUREMENT_STAFF_ROLES


def can_sign_lpo(user, mode):
    """
    Digital approval is boss-only, by design — matches your description
    that only the boss's authorization makes it valid, digital or not.
    Uploading a wet-ink scan is looser: procurement staff handle the
    physical paperwork day to day, they're just confirming "yes, this is
    the signed copy," not personally authorizing the spend — the ink
    itself is the authorization.
    """
    if is_company_wide_manager(user):
        return True
    if mode == 'digital':
        return user.role in BOSS_ROLES
    if mode == 'wet_ink':
        return user.role in PROCUREMENT_STAFF_ROLES
    return False


def can_send_lpo(user):
    if is_company_wide_manager(user):
        return True
    return user.role in PROCUREMENT_STAFF_ROLES


class LPOPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action in ('create', 'manual'):
            return can_generate_lpo(request.user)
        return True  # view access checked at object level

    def has_object_permission(self, request, view, obj):
        project = obj.purchase_request.project
        if request.method in permissions.SAFE_METHODS:
            return can_view_requests(request.user, project)
        if view.action == 'approve_digital':
            return can_sign_lpo(request.user, 'digital')
        if view.action == 'upload_signed':
            return can_sign_lpo(request.user, 'wet_ink')
        if view.action == 'send':
            return can_send_lpo(request.user)
        return can_view_requests(request.user, project)