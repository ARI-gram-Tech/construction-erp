from rest_framework import serializers
from .models import Supplier, SupplierContact


class SupplierContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierContact
        fields = ('id', 'supplier', 'name', 'position', 'phone', 'email', 'is_primary')
        read_only_fields = ('id',)


class SupplierSerializer(serializers.ModelSerializer):
    # Nested, read-only: lets the list/detail view show contacts without a
    # separate request. Writing contacts still goes through
    # SupplierContactViewSet below, not through this serializer.
    contacts = SupplierContactSerializer(many=True, read_only=True)

    class Meta:
        model = Supplier
        fields = (
            'id', 'code', 'name', 'supplier_type', 'status',
            'registration_no', 'tax_pin', 'website',
            'contact_person', 'email', 'phone',
            'country', 'city', 'physical_address',
            'currency', 'payment_terms', 'credit_limit',
            'notes', 'contacts',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'code', 'created_at', 'updated_at')