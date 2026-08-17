# apps/planning/permissions.py
"""
Permission model for Planning (WBS, Activities, Milestones, Baselines,
and per-Activity resource requirements).

Two separate questions decide what someone can do here:

1. Does their COMPANY-WIDE role (accounts.User.role — a controlled
   choice field) give them oversight regardless of project assignment?
   company_admin / director / operations_manager: yes, on every project.

2. Are they actually part of THIS project's team (a ProjectMember row
   exists), or specifically the project's assigned project_manager?

   Deliberately NOT using ProjectMember.role_on_project for this —
   per apps.team's own docstring, that field is free text ("Site
   Engineer", "SE", "site eng", whatever whoever added them typed),
   not validated against a fixed taxonomy. Using it for security
   decisions would be fragile. Instead, tier is decided by the user's
   real `role` field, and ProjectMember only answers "are they on the
   team at all."

Three tiers, from broadest to narrowest:

  STRUCTURE  — create/edit/delete WBS nodes, Activities, Milestones,
               and Baselines. Shapes the schedule itself. Freezing a
               baseline in particular is "this is the official record
               now," so it stays at this tier, not opened to site roles.
               Granted to: company-wide managers, the project's
               assigned PM, and QS (QS needs to shape WBS structure
               since BOQ items link into it).

  EXECUTION  — report progress, manage what an activity needs
               (materials/labour/equipment), trigger a restock
               request from pending materials. The day-to-day
               "what's actually happening on site" work, without
               being able to restructure the schedule.
               Granted to: everyone in STRUCTURE, plus site_manager,
               site_engineer, foreman, site_supervisor — but only if
               they're an actual ProjectMember of this project.

  VIEW       — read-only. Granted to anyone in EXECUTION, plus any
               other ProjectMember at all (client, subcontractor,
               or any other role_on_project) — enough to see progress
               without being able to change anything.

A company-wide role alone (e.g. being a "project_manager" somewhere in
the company) grants nothing on a project you're not assigned to or a
member of — that mirrors how apps.procurement's tier-1 approval checks
project.project_manager_id, not just user.role.
"""
from rest_framework import permissions

from apps.team.models import ProjectMember

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager'}
EXECUTION_SITE_ROLES = {'site_manager', 'site_engineer', 'foreman', 'site_supervisor'}
STRUCTURE_DELETE_ONLY_ROLES = {'qs'}

# QS never creates or edits WBS/Activities — that stays PM + company-
# manager only (can_manage_structure). QS DOES get a delete lane, but a
# deliberately narrow one: it's soft-delete-to-bin only, never a hard
# delete, and the frontend must show a strong warning before submitting.
# Planned but not built yet: the delete should wait for PM approval
# before it lands in the bin, sit there 30 days, and only a company-
# admin-issued PIN (sent via notification) can permanently empty it.
# For now: QS deletes -> straight to bin, recoverable, PM/manager can
# restore.

def is_company_wide_manager(user):
    return user.role in COMPANY_WIDE_MANAGERS


def is_assigned_project_manager(user, project):
    return project.project_manager_id == user.id


def is_project_member(user, project):
    return ProjectMember.objects.filter(project=project, user=user).exists()


def can_manage_structure(user, project):
    """
    Create/edit WBS, Activities, Milestones, Baselines — PM + company
    managers only. QS is deliberately excluded here; see
    can_soft_delete_structure for QS's narrower delete-only lane.
    """
    if is_company_wide_manager(user):
        return True
    if is_assigned_project_manager(user, project):
        return True
    return False


def can_soft_delete_structure(user, project):
    """
    Delete (to the recycle bin) on WBS/Activities specifically. Everyone
    who can_manage_structure has this too, plus QS — but for QS this is
    the ONLY structural power they have, and it never bypasses the
    soft-delete/bin mechanism (there is no separate hard-delete path QS
    can reach).
    """
    if can_manage_structure(user, project):
        return True
    if user.role in STRUCTURE_DELETE_ONLY_ROLES and is_project_member(user, project):
        return True
    return False


def can_execute(user, project):
    """Progress updates + resource requirement management + generate-PR."""
    if can_manage_structure(user, project):
        return True
    if user.role in EXECUTION_SITE_ROLES and is_project_member(user, project):
        return True
    return False


def can_plan_activity(user, activity):
    """
    Being the assigned_planner on THIS activity grants resource/
    requirement editing rights on it specifically — independent of the
    user's company-wide role. Covers companies without a dedicated
    site_engineer role: the PM can assign literally anyone, and that
    assignment alone is what grants access, not their job title.
    """
    if can_manage_structure(user, activity.project):
        return True
    if activity.assigned_planner_id == user.id:
        return True
    return can_execute(user, activity.project)


def can_plan_activity_now(user, activity):
    """
    Same as can_plan_activity, but additionally locks out the assigned
    planner (not PM/company managers) once planning_status is
    'submitted' or 'approved' — the reviewer should be looking at a
    stable snapshot while it's under review, not one the planner can
    still edit underneath them. Editing reopens automatically once
    changes are requested (planning_status flips back to
    'changes_requested').
    """
    if can_manage_structure(user, activity.project):
        return True
    if activity.assigned_planner_id == user.id:
        return activity.planning_status in ('in_progress', 'changes_requested')
    return can_execute(user, activity.project)


def can_delete_own_resource(user, resource_obj, project):
    """
    For ActivityMaterial/Labour/Equipment specifically: a site execution
    role (site_manager/site_engineer/foreman/site_supervisor) may only
    remove entries THEY personally added — never someone else's, and
    never the Activity itself (that's not reachable from here at all).
    PM/company managers can remove any entry regardless of who added it.
    """
    if can_manage_structure(user, project):
        return True
    if user.role in EXECUTION_SITE_ROLES and is_project_member(user, project):
        return resource_obj.created_by_id == user.id
    return False


def can_view(user, project):
    """Anyone with a real stake in the project can see the schedule."""
    if can_execute(user, project):
        return True
    return is_project_member(user, project)


def _project_from_obj(obj):
    """
    Activity/Milestone/WBS/ProjectBaseline all have `.project` directly.
    ActivityMaterial/ActivityLabourRequirement/ActivityEquipmentRequirement
    hang off an Activity instead, so `.activity.project`. This lets one
    permission class's has_object_permission work across both shapes
    without every viewset needing its own object-permission logic.
    """
    return obj.project if hasattr(obj, 'project') else obj.activity.project


class PlanningStructurePermission(permissions.BasePermission):
    """
    For MilestoneViewSet, ProjectBaselineViewSet: full CRUD requires
    can_manage_structure(); reads require can_view(). (WBS has its own
    WBSPermission below — it needs the QS delete-only carve-out that
    Milestones/Baselines deliberately don't get.)
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_project()
        if request.method in permissions.SAFE_METHODS:
            return can_view(request.user, project)
        return can_manage_structure(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = _project_from_obj(obj)
        if request.method in permissions.SAFE_METHODS:
            return can_view(request.user, project)
        return can_manage_structure(request.user, project)


class WBSPermission(permissions.BasePermission):
    """
    Create/edit WBS — can_manage_structure (PM + company managers).
    Delete — can_soft_delete_structure (adds QS, but every WBS delete is
    a soft delete to the bin; see views.py).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_project()
        if getattr(view, 'action', None) == 'bin':
            return can_view(request.user, project)
        if request.method in permissions.SAFE_METHODS:
            return can_view(request.user, project)
        if request.method == 'DELETE':
            return can_soft_delete_structure(request.user, project)
        return can_manage_structure(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = _project_from_obj(obj)
        if getattr(view, 'action', None) == 'restore':
            return can_manage_structure(request.user, project)
        if request.method in permissions.SAFE_METHODS:
            return can_view(request.user, project)
        if request.method == 'DELETE':
            return can_soft_delete_structure(request.user, project)
        return can_manage_structure(request.user, project)


class ActivityPermission(permissions.BasePermission):
    """
    ActivityViewSet is split by action, not just HTTP method:
      - list/retrieve                    -> can_view
      - create/update/partial_update/
        destroy                          -> can_manage_structure
      - progress / generate_restock_request
                                          -> can_execute (site roles
                                             need these day-to-day
                                             without schedule-editing
                                             rights)
    """
    EXECUTION_ACTIONS = {'progress', 'generate_restock_request'}

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_project()
        if view.action in ('list', 'create', 'bin'):
            if view.action == 'create':
                return can_manage_structure(request.user, project)
            return can_view(request.user, project)
        return True  # object-level actions checked in has_object_permission

    def has_object_permission(self, request, view, obj):
        project = obj.project
        if view.action in self.EXECUTION_ACTIONS:
            if request.method in permissions.SAFE_METHODS:
                return can_view(request.user, project)
            return can_execute(request.user, project)
        if view.action == 'restore':
            # Restoring out of the bin is a structural decision — putting
            # something back into the live plan — so it's PM/manager only,
            # even if QS was the one who bin'd it.
            return can_manage_structure(request.user, project)
        if request.method in permissions.SAFE_METHODS:
            return can_view(request.user, project)
        if request.method == 'DELETE':
            return can_soft_delete_structure(request.user, project)
        return can_manage_structure(request.user, project)


class ActivityResourcePermission(permissions.BasePermission):
    """
    For ActivityMaterialViewSet / ActivityLabourRequirementViewSet /
    ActivityEquipmentRequirementViewSet: creating requires can_execute();
    reads require can_view(). Deleting/editing is narrower than plain
    can_execute — a site execution role can only touch entries they
    personally created (can_delete_own_resource); PM/company managers
    can touch any entry.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_activity().project
        if request.method in permissions.SAFE_METHODS:
            return can_view(request.user, project)
        return can_execute(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = obj.activity.project
        if request.method in permissions.SAFE_METHODS:
            return can_view(request.user, project)
        if request.method in ('PATCH', 'PUT') or getattr(view, 'action', '') == 'create':
            return can_plan_activity(request.user, obj.activity)
        return can_delete_own_resource(request.user, obj, project)