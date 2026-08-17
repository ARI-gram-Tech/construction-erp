# apps/projects/permissions.py
"""
Permission model for Projects — the root everything else hangs off of.

Delete is deliberately the narrowest tier here, narrower than create or
edit. Nearly every other app in this system FKs into Project with
on_delete=CASCADE (BOQ, Budget, Planning, Procurement...), so deleting
a project silently deletes every BOQ, budget, activity, and purchase
request built on top of it. That's not a mistake you undo — it stays
restricted to company_admin/director only, excluding even
operations_manager and the project's own assigned PM.

Three visibility/access tiers, decided explicitly rather than left
implicit:

  MANAGERS  (company_admin, director, operations_manager, procurement_manager) — full
            oversight: see every project, create, edit any project.
            operations_manager is deliberately here — it's the "PM of
            PMs" role that coordinates across every individual PM's
            project without needing company_admin/director's delete
            power.

  VIEWERS   (management) — see every project, same as MANAGERS, but
            can't create/edit/delete anything. A dashboard-only
            executive role: full visibility, zero write access.

  everyone else — strictly scoped to what they're attached to: the
            project's assigned project_manager, or a ProjectMember
            (apps.team) on that specific project. A project_manager
            running Project A has zero visibility into Project B
            unless explicitly added there — deliberately kept strict
            rather than letting all PMs see each other's projects.
"""
from django.db.models import Q
from rest_framework import permissions

from apps.team.models import ProjectMember

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager', 'procurement_manager'}
COMPANY_WIDE_VIEWERS = {'management'}
DELETE_ALLOWED_ROLES = {'company_admin', 'director'}


def is_company_wide_manager(user):
    return user.role in COMPANY_WIDE_MANAGERS


def is_company_wide_viewer(user):
    """
    Read-only oversight — sees every project like a company-wide
    manager does, but never gets create/edit/delete. Deliberately kept
    separate from is_company_wide_manager() rather than folded into
    it, so a future change to what managers can do never accidentally
    grants write access to this role too.
    """
    return user.role in COMPANY_WIDE_VIEWERS


def can_create_project(user):
    """Starting a new project is a company-level decision, not a site-level one."""
    return is_company_wide_manager(user)


def can_edit_project(user, project):
    if is_company_wide_manager(user):
        return True
    return project.project_manager_id == user.id


def can_delete_project(user):
    """
    Excludes operations_manager and the assigned PM on purpose — see
    module docstring. Deleting a project is a cascade, not an edit.
    """
    return user.role in DELETE_ALLOWED_ROLES


def can_view_project(user, project):
    if is_company_wide_manager(user) or is_company_wide_viewer(user):
        return True
    if project.project_manager_id == user.id:
        return True
    return ProjectMember.objects.filter(project=project, user=user).exists()


def visible_projects_queryset(base_queryset, user):
    """
    Used in get_queryset() for list/retrieve — filters to what
    can_view_project() would allow, as one query instead of checking
    every project one-by-one.
    """
    if is_company_wide_manager(user) or is_company_wide_viewer(user):
        return base_queryset
    member_project_ids = ProjectMember.objects.filter(user=user).values_list('project_id', flat=True)
    return base_queryset.filter(
        Q(project_manager_id=user.id) | Q(id__in=member_project_ids)
    )


class ProjectPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if view.action == 'create':
            return can_create_project(request.user)
        return True  # list is narrowed by get_queryset(); retrieve/update/destroy checked below

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return can_view_project(request.user, obj)
        if request.method == 'DELETE':
            return can_delete_project(request.user)
        return can_edit_project(request.user, obj)