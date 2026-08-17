"""
Permission model for ProjectMember (the Team roster itself).

Two tiers, matching the same pattern as apps.projects.permissions and
apps.planning.permissions:

  MANAGE — add/remove people from a project's team. Restricted to
           company-wide managers and the project's assigned PM, same
           reasoning as apps.projects: deciding who's on a project is
           a structural decision about that project, not something any
           team member should be able to do to their own roster.

  VIEW   — see who's on the team at all. Restricted to company-wide
           managers, the assigned PM, and anyone who is ALREADY a
           ProjectMember of that specific project. This is the gate
           that was completely missing before — a user with no
           connection to Project E should never be able to see (or
           touch) Project E's roster, same NDA boundary that applies
           to everything else on that project.
"""
from rest_framework import permissions

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager'}


def is_company_wide_manager(user):
    return user.role in COMPANY_WIDE_MANAGERS


def is_assigned_project_manager(user, project):
    return project.project_manager_id == user.id


def can_manage_team(user, project):
    return is_company_wide_manager(user) or is_assigned_project_manager(user, project)


def can_view_team(user, project):
    from .models import ProjectMember

    if can_manage_team(user, project):
        return True
    return ProjectMember.objects.filter(project=project, user=user).exists()


class ProjectMemberPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_project()
        if request.method in permissions.SAFE_METHODS:
            return can_view_team(request.user, project)
        return can_manage_team(request.user, project)

    def has_object_permission(self, request, view, obj):
        project = obj.project
        if request.method in permissions.SAFE_METHODS:
            return can_view_team(request.user, project)
        return can_manage_team(request.user, project)