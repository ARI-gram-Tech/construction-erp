"""
Views for the suppliers app. Company-wide — scoped to the authenticated
user's own company, shared across all their projects.
"""
from rest_framework import viewsets, permissions

from .permissions import SupplierPermission, SupplierContactPermission
from .models import Supplier, SupplierContact
from .serializers import SupplierSerializer, SupplierContactSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    """
    GET    /api/suppliers/            list this company's suppliers
    POST   /api/suppliers/            create a supplier for this company
    GET    /api/suppliers/{id}/       view one supplier (includes contacts)
    PATCH  /api/suppliers/{id}/       edit a supplier
    DELETE /api/suppliers/{id}/       remove a supplier
    """
    serializer_class = SupplierSerializer
    permission_classes = [SupplierPermission]

    def get_queryset(self):
        company = self.request.user.company
        if company is None:
            return Supplier.objects.none()
        return Supplier.objects.for_company(company).prefetch_related('contacts')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class SupplierContactViewSet(viewsets.ModelViewSet):
    """
    GET    /api/suppliers/contacts/?supplier={id}   list contacts (optionally filtered)
    POST   /api/suppliers/contacts/                 create a contact
    GET    /api/suppliers/contacts/{id}/             view one contact
    PATCH  /api/suppliers/contacts/{id}/             edit a contact
    DELETE /api/suppliers/contacts/{id}/             remove a contact

    Scoped through the parent supplier's company, so a user can't
    read/write contacts belonging to another company's supplier.
    """
    serializer_class = SupplierContactSerializer
    permission_classes = [SupplierContactPermission]

    def get_queryset(self):
        company = self.request.user.company
        if company is None:
            return SupplierContact.objects.none()
        qs = SupplierContact.objects.filter(supplier__company=company)
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs