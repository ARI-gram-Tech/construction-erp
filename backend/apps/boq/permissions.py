"""
Permission model for BOQ (Bill of Quantities).

Same tiering pattern as apps.planning.permissions and
apps.team.permissions:

  MANAGE — create/edit/delete BOQs, sections, items, revisions,
           duplicates, and import sessions. Restricted to company-wide
           managers, the project's assigned PM, and QS — QS is the
           BOQ's primary owner (pricing, quantities, and the budget it
           feeds all sit in their lane per how this company actually
           works), but only counts if they're an actual ProjectMember
           of THIS project, not just holding the qs role somewhere in
           the company.

  VIEW   — read-only. Anyone who's an actual ProjectMember of the
           project, plus company-wide managers and the assigned PM.
           Contract quantities and rates are commercially sensitive —
           deliberately NOT open to every authenticated company user,
           same NDA boundary as everywhere else.
"""
from rest_framework import permissions

from apps.team.models import ProjectMember

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager'}
BOQ_MANAGE_ROLES = {'qs'}


def is_company_wide_manager(user):
    return user.role in COMPANY_WIDE_MANAGERS


def is_assigned_project_manager(user, project):
    return project.project_manager_id == user.id


def is_project_member(user, project):
    return ProjectMember.objects.filter(project=project, user=user).exists()


def can_manage_boq(user, project):
    if is_company_wide_manager(user):
        return True
    if is_assigned_project_manager(user, project):
        return True
    if user.role in BOQ_MANAGE_ROLES and is_project_member(user, project):
        return True
    return False


def can_view_boq(user, project):
    if can_manage_boq(user, project):
        return True
    return is_project_member(user, project)


def _project_from_obj(obj):
    """
    BOQ has `.project` directly. BOQSection/BOQItem/BOQRevision hang off
    a BOQ instead (`.boq.project`) — lets one permission class work
    across all of them, same pattern as apps.planning.permissions.
    """
    if hasattr(obj, 'project'):
        return obj.project
    return obj.boq.project


class BOQPermission(permissions.BasePermission):
    """For BOQViewSet — resolves project via view.get_project()."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_project()
        if request.method in permissions.SAFE_METHODS:
            return can_view_boq(request.user, project)
        return can_manage_boq(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = _project_from_obj(obj)
        if request.method in permissions.SAFE_METHODS:
            return can_view_boq(request.user, project)
        return can_manage_boq(request.user, project)


class BOQNestedPermission(permissions.BasePermission):
    """
    For BOQSectionViewSet / BOQItemViewSet / BOQRevisionViewSet — these
    resolve their project via get_boq().project, one level deeper than
    BOQViewSet's own get_project().
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_boq().project
        if request.method in permissions.SAFE_METHODS:
            return can_view_boq(request.user, project)
        return can_manage_boq(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = _project_from_obj(obj)
        if request.method in permissions.SAFE_METHODS:
            return can_view_boq(request.user, project)
        return can_manage_boq(request.user, project)


class BOQImportSessionPermission(permissions.BasePermission):
    """Importing a BOQ is a structural action — same tier as can_manage_boq."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_project()
        if request.method in permissions.SAFE_METHODS:
            return can_view_boq(request.user, project)
        return can_manage_boq(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = obj.project
        if request.method in permissions.SAFE_METHODS:
            return can_view_boq(request.user, project)
        return can_manage_boq(request.user, project)