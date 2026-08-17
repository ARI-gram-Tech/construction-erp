"""
Permission model for Suppliers (vendor master records).

Suppliers are company-wide, not project-scoped — matches how the
model itself works (CompanyOwnedModel, no project FK). Two tiers:

  MANAGE — create/edit/delete supplier and contact records. Granted to
      company-wide managers and the procurement roles who actually
      raise POs against these vendors day to day.

  VIEW — read-only. Open to any authenticated company user — knowing
      which suppliers exist and their contact details is harmless on
      its own (same reasoning as StockItemPermission's open read),
      and PM/site roles legitimately need to look a supplier up when
      raising a purchase request.
"""
from rest_framework import permissions

COMPANY_WIDE_MANAGERS = {'company_admin', 'director', 'operations_manager'}
SUPPLIER_MANAGE_ROLES = {'procurement_manager', 'procurement'}


def can_manage_suppliers(user):
    return user.role in COMPANY_WIDE_MANAGERS or user.role in SUPPLIER_MANAGE_ROLES


class SupplierPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return can_manage_suppliers(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return can_manage_suppliers(request.user)


class SupplierContactPermission(permissions.BasePermission):
    """Same tiering as SupplierPermission — a contact is just a child record of a supplier."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return can_manage_suppliers(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return can_manage_suppliers(request.user)