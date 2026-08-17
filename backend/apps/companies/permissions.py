"""
Permission classes for the companies app.
"""
from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """
    Only platform-level Super Admins (Django's is_superuser flag) can
    access company management endpoints — approve, suspend, view all
    companies, etc. Regular company users never reach these views.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsCompanyMember(permissions.BasePermission):
    """
    Allows a user to view/edit only their own company's record.
    Used later once User has a company FK — placeholder for now.
    """
    def has_object_permission(self, request, view, obj):
        return getattr(request.user, 'company_id', None) == obj.id


class IsCompanyMember(permissions.BasePermission):
    """
    Allows a user to view/edit only their own company's record.
    Super Admins bypass this (handled separately by IsSuperAdmin views);
    this is for Company Admin / employee self-service endpoints.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.company_id)

    def has_object_permission(self, request, view, obj):
        return obj.id == request.user.company_id


COMPANY_ADMIN_ROLES = {'company_admin', 'director'}


class IsCompanyAdmin(permissions.BasePermission):
    """
    Narrower than IsCompanyMember: only company_admin or director can
    create/manage other employees in their company. A regular employee
    being 'in the company' isn't enough to let them add new accounts.
    """
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.company_id
            and user.role in COMPANY_ADMIN_ROLES
        )