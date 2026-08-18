"""
Permission model for Inventory (Warehouses, StockItems, StockLevels,
StockMovements).

Mirrors the tiering pattern from apps.planning.permissions and
apps.projects.permissions: company-wide roles get oversight everywhere,
everyone else is scoped to their real account role and, where relevant,
actual project membership.

Tiers, broadest to narrowest:

  COMPANY_WIDE_MANAGERS (company_admin, director, operations_manager)
      Full access to everything — every warehouse, every action.

  main_store_manager
      Owns the Main Warehouse and cross-warehouse logistics:
      receive, issue, transfer, AND adjust — anywhere. Transfer and
      adjust are deliberately kept here and nowhere else: transfer
      moves stock between two locations at once (including in/out of
      a project without that project's own team acting), and adjust
      silently rewrites a quantity with no physical movement behind
      it — both are higher-trust actions than a routine receive/issue,
      so they don't extend down to storekeeper.

  storekeeper
      The project-level counterpart — receives deliveries into and
      issues stock out of a SPECIFIC project's store, but only for
      projects they're actually a ProjectMember of. Cannot transfer
      or adjust anywhere, including their own project's store — a
      storekeeper confirms what physically arrived/went out, they
      don't relocate stock between warehouses or overwrite a count
      without a matching movement.

  VIEW-ONLY roles (qs, site_manager, site_engineer, foreman,
      site_supervisor, and storekeeper for warehouses outside their
      assigned projects)
      Can see stock levels and movement history — need this to know
      what's available before requesting more, or (QS) to track
      actual spend against budget — but never record a movement
      themselves.

A company-wide role alone doesn't grant anything on its own bypassing
project scoping for storekeeper — same principle as
apps.planning.permissions and apps.projects.permissions: being
"storekeeper" somewhere in the company grants nothing on a project
you're not a member of.
"""
from rest_framework import permissions

from apps.team.models import ProjectMember

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager'}
MAIN_STORE_ROLES = {'main_store_manager'}
STOREKEEPER_ROLES = {'storekeeper'}
VIEW_ONLY_ROLES = {'qs', 'site_manager', 'site_engineer', 'foreman', 'site_supervisor', 'project_manager'}
PROCUREMENT_CATALOG_ROLES = {'procurement_manager', 'procurement'}


def is_company_wide_manager(user):
    return user.role in COMPANY_WIDE_MANAGERS


def is_main_store_manager(user):
    return user.role in MAIN_STORE_ROLES


def is_project_member(user, project):
    if project is None:
        return False
    return ProjectMember.objects.filter(project=project, user=user).exists()


def can_manage_warehouse_logistics(user):
    """
    Transfer + Adjust — the two highest-trust stock actions. Main Store
    Manager and company-wide managers only, everywhere, regardless of
    warehouse or project.
    """
    return is_company_wide_manager(user) or is_main_store_manager(user)


def can_receive_or_issue(user, warehouse):
    """
    Receive + Issue on a SPECIFIC warehouse.
      - Company-wide managers: any warehouse.
      - Main Store Manager: any warehouse (they're the company-wide
        logistics role, not limited to the Main Warehouse's own name).
      - Storekeeper: only a project warehouse they're an actual
        ProjectMember of. A storekeeper on Project A gets nothing on
        Project B's store just by holding the storekeeper role.
    """
    if is_company_wide_manager(user) or is_main_store_manager(user):
        return True
    if user.role in STOREKEEPER_ROLES:
        return is_project_member(user, warehouse.project)
    return False


def can_view_warehouse(user, warehouse):
    """
    Read access — stock levels, movement history.

    The Main Warehouse (project=None) is company-wide stock. Only
    company-wide managers and Main Store Manager can see it — that's
    already handled above via can_receive_or_issue, which grants those
    two roles access to every warehouse. Storekeeper is deliberately
    excluded from Main Warehouse: they're scoped to their own assigned
    project's store only, and should not be able to browse company-wide
    stock or other projects' stores just by holding the storekeeper role.

    A project's own store IS visible to QS/site execution/storekeeper
    roles, but only if they're an actual ProjectMember of that specific
    project — never by role alone, matching the same NDA boundary as
    everywhere else in the system.
    """
    if can_receive_or_issue(user, warehouse):
        return True

    if warehouse.project_id is None:
        # Main Warehouse: company-wide logistics roles only (handled
        # above). No role gets view access here beyond that.
        return False

    if user.role in VIEW_ONLY_ROLES or user.role in STOREKEEPER_ROLES:
        return is_project_member(user, warehouse.project)

    return False


def visible_warehouses_queryset(base_queryset, user):
    """
    Bulk equivalent of can_view_warehouse(), for use in get_queryset() —
    filtering the whole list in one query instead of checking every
    Warehouse/StockLevel/StockMovement row one at a time after fetching.

    - Company-wide managers, Main Store Manager: see every warehouse in
      the company, including Main — the roles actually responsible for
      cross-warehouse logistics.
    - QS / site execution roles / storekeeper: ONLY the specific project
      warehouse(s) they're an actual ProjectMember of — never Main
      Warehouse, and never a project they're not on, no matter their
      role. Storekeeper is scoped the same way as the other project-
      level roles now, not given company-wide read access.
    - Anyone else: nothing.
    """
    if is_company_wide_manager(user) or is_main_store_manager(user):
        return base_queryset
    if user.role in VIEW_ONLY_ROLES or user.role in STOREKEEPER_ROLES:
        member_project_ids = ProjectMember.objects.filter(
            user=user
        ).values_list('project_id', flat=True)
        return base_queryset.filter(project_id__in=member_project_ids)
    return base_queryset.none()


class StockRestockRequestPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action in ('approve', 'reject', 'escalate_to_procurement'):
            return can_manage_warehouse_logistics(request.user)
        if view.action == 'receive':
            # The storekeeper of the RECEIVING project can confirm arrival
            # themselves — they don't need logistics-tier sign-off to say
            # "yes, this landed at my store" — but logistics-tier can
            # also do it (e.g. no storekeeper assigned yet).
            return (
                request.user.role in STOREKEEPER_ROLES
                or can_manage_warehouse_logistics(request.user)
            )
        if view.action == 'create':
            return (
                request.user.role in STOREKEEPER_ROLES
                or can_manage_warehouse_logistics(request.user)
            )
        return True


class PendingStockItemRequestPermission(permissions.BasePermission):
    """
    Anyone authenticated can list/retrieve (so a site engineer can see
    the status of their own request — 'awaiting approval', 'approved',
    'rejected'). Approve/reject are logistics-tier + procurement, per
    business decision: procurement staff don't otherwise manage
    warehouse logistics, but they DO get a say in what enters the
    catalog since it affects what they can procure against.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action in ('approve', 'reject'):
            return (
                can_manage_warehouse_logistics(request.user)
                or request.user.role in PROCUREMENT_CATALOG_ROLES
            )
        return True


class WarehousePermission(permissions.BasePermission):
    """
    Editing a Warehouse's name/address/active-status is logistics-tier —
    Main Store Manager + company-wide managers. Reading follows
    can_view_warehouse.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True  # narrowed to specific warehouses in get_queryset()/has_object_permission
        return can_manage_warehouse_logistics(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return can_view_warehouse(request.user, obj)
        return can_manage_warehouse_logistics(request.user)


class StockItemPermission(permissions.BasePermission):
    """
    The catalog itself (StockItem) isn't warehouse-scoped — it's
    company-wide master data. Creating/editing/deleting catalog entries
    is a logistics-tier decision (adding a new material type affects
    every warehouse), reading is open to any authenticated company user
    since knowing "does this item exist" is harmless on its own — actual
    quantities are gated per-warehouse via StockLevel/StockMovement.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return can_manage_warehouse_logistics(request.user)


class StockLevelPermission(permissions.BasePermission):
    """Read-only viewset — gated the same as viewing the warehouse itself."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
    # Object-level warehouse check happens in the viewset's get_queryset(),
    # same pattern as apps.planning — filtering what's visible is cheaper
    # than checking permission on every row after the fact.


class StockMovementPermission(permissions.BasePermission):
    """
    ViewSet is split by action:
      - list/retrieve                 -> can_view_warehouse (per row)
      - receive/issue                 -> can_receive_or_issue on the
                                          warehouse named in the request
      - transfer/adjust               -> can_manage_warehouse_logistics
      - update/partial_update         -> reference/notes only (already
                                          enforced by the serializer);
                                          same tier as receive/issue on
                                          that movement's warehouse
      - reverse                       -> same tier as whatever created
                                          the movement type being reversed
                                          (receive/issue -> can_receive_or_issue,
                                          transfer/adjustment -> logistics tier)
    """
    RECEIVE_ISSUE_ACTIONS = {'receive', 'issue'}
    LOGISTICS_ACTIONS = {'transfer', 'adjust'}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if view.action in ('list',):
            return True  # narrowed per-row in get_queryset()

        if view.action in self.RECEIVE_ISSUE_ACTIONS:
            warehouse = view._get_warehouse(request.data.get('warehouse'))
            return can_receive_or_issue(request.user, warehouse)

        if view.action == 'transfer':
            return can_manage_warehouse_logistics(request.user)

        if view.action == 'adjust':
            return can_manage_warehouse_logistics(request.user)

        return True  # retrieve/update/partial_update/reverse checked at object level

    def has_object_permission(self, request, view, obj):
        if view.action in ('retrieve',):
            return can_view_warehouse(request.user, obj.warehouse)

        if view.action in ('update', 'partial_update'):
            return can_receive_or_issue(request.user, obj.warehouse)

        if view.action == 'reverse':
            if obj.movement_type in ('transfer_out', 'transfer_in', 'adjustment'):
                return can_manage_warehouse_logistics(request.user)
            return can_receive_or_issue(request.user, obj.warehouse)

        return can_view_warehouse(request.user, obj.warehouse)