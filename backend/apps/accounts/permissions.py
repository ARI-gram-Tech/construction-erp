"""
Custom permission classes for the accounts app.
Role-based permissions (CEO, PM, QS, etc.) get added here once the
roles/permissions model is built out later in Phase 3.
"""
from rest_framework import permissions


class IsSelf(permissions.BasePermission):
    """
    Allows a user to view/edit only their own account record.
    """
    def has_object_permission(self, request, view, obj):
        return obj == request.user


class IsSuperAdmin(permissions.BasePermission):
    """
    Only platform-level Super Admins can manage user accounts across
    all companies — list, edit, deactivate, delete.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)