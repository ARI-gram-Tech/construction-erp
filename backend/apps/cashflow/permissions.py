"""
Same tiering as apps.boq.permissions — cash flow is QS territory,
same reasoning: it's derived from/feeds the budget QS owns.
"""
from rest_framework import permissions
from apps.team.models import ProjectMember

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager'}
CASHFLOW_MANAGE_ROLES = {'qs'}


def is_company_wide_manager(user):
    return user.role in COMPANY_WIDE_MANAGERS


def is_assigned_project_manager(user, project):
    return project.project_manager_id == user.id


def is_project_member(user, project):
    return ProjectMember.objects.filter(project=project, user=user).exists()


def can_manage_cashflow(user, project):
    if is_company_wide_manager(user):
        return True
    if is_assigned_project_manager(user, project):
        return True
    if user.role in CASHFLOW_MANAGE_ROLES and is_project_member(user, project):
        return True
    return False


def can_view_cashflow(user, project):
    if can_manage_cashflow(user, project):
        return True
    return is_project_member(user, project)


def _project_from_obj(obj):
    if hasattr(obj, 'project'):
        return obj.project
    return obj.plan.project


class CashFlowPlanPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_project()
        if request.method in permissions.SAFE_METHODS:
            return can_view_cashflow(request.user, project)
        return can_manage_cashflow(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = _project_from_obj(obj)
        if request.method in permissions.SAFE_METHODS:
            return can_view_cashflow(request.user, project)
        return can_manage_cashflow(request.user, project)


class CashFlowEntryPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_plan().project
        if request.method in permissions.SAFE_METHODS:
            return can_view_cashflow(request.user, project)
        return can_manage_cashflow(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = _project_from_obj(obj)
        if request.method in permissions.SAFE_METHODS:
            return can_view_cashflow(request.user, project)
        return can_manage_cashflow(request.user, project)