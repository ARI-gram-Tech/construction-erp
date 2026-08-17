# apps/boq/permissions_activity.py
"""
Permission for the activity-scoped BOQ endpoints (linked items list,
flag creation). Reuses BOQ's own can_view_boq/can_manage_boq tiering —
a planner assigned to the activity should already be a ProjectMember
(assign_planner adds them automatically), so can_view_boq's
is_project_member check covers them without any special-casing.
"""
from rest_framework import permissions
from .permissions import can_view_boq, can_manage_boq


class ActivityBOQPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        project = view.get_activity().project
        if request.method in permissions.SAFE_METHODS:
            return can_view_boq(request.user, project)
        # Only write action here is creating a flag — anyone who can
        # view BOQ data should be able to flag a concern on it.
        return can_view_boq(request.user, project)