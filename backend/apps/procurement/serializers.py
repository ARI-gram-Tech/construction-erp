# apps/procurement/serializers.py
from rest_framework import serializers

from .models import PurchaseRequest, PurchaseRequestItem, LPO, LPOItem


class PurchaseRequestItemSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(
        source='received_by.get_full_name', read_only=True, default=None
    )
    is_in_stock = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequestItem
        fields = (
            'id', 'description', 'quantity', 'unit', 'estimated_unit_cost', 'notes',
            'approved_quantity', 'delivered_quantity', 'delivered_by', 'delivered_at',
            'received_quantity', 'received_by', 'received_by_name', 'received_at',
            'stock_movement', 'is_in_stock',
        )
        read_only_fields = (
            'id', 'approved_quantity', 'delivered_quantity', 'delivered_by', 'delivered_at',
            'received_quantity', 'received_by', 'received_by_name', 'received_at',
            'stock_movement', 'is_in_stock',
        )

    def get_is_in_stock(self, obj):
        return obj.stock_movement_id is not None


class PurchaseRequestSerializer(serializers.ModelSerializer):
    items = PurchaseRequestItemSerializer(many=True)
    requested_by_name = serializers.CharField(
        source='requested_by.get_full_name', read_only=True
    )
    project_name = serializers.CharField(source='project.name', read_only=True)
    tier1_approver_name = serializers.CharField(
        source='tier1_approver.get_full_name', read_only=True
    )
    tier2_approver_name = serializers.CharField(
        source='tier2_approver.get_full_name', read_only=True
    )
    tier3_approver_name = serializers.CharField(
        source='tier3_approver.get_full_name', read_only=True
    )
    estimated_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = PurchaseRequest
        fields = (
            'id', 'code', 'project', 'project_name', 'requested_by', 'requested_by_name',
            'title', 'reason', 'priority', 'required_date', 'status',
            'budget_line',
            'tier1_approver', 'tier1_approver_name', 'tier1_decision',
            'tier1_comment', 'tier1_decided_at',
            'tier2_approver', 'tier2_approver_name', 'tier2_decision',
            'tier2_comment', 'tier2_decided_at',
            'tier3_approver', 'tier3_approver_name', 'tier3_decision',
            'tier3_comment', 'tier3_decided_at',
            'items', 'estimated_total',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'code', 'project', 'requested_by', 'status',
            'tier1_approver', 'tier1_decision', 'tier1_comment', 'tier1_decided_at',
            'tier2_approver', 'tier2_decision', 'tier2_comment', 'tier2_decided_at',
            'tier3_approver', 'tier3_decision', 'tier3_comment', 'tier3_decided_at',
            'created_at', 'updated_at',
        )

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('Add at least one line item.')
        return items

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        pr = PurchaseRequest.objects.create(**validated_data)
        PurchaseRequestItem.objects.bulk_create(
            [PurchaseRequestItem(purchase_request=pr, **item) for item in items_data]
        )
        return pr

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            # Draft-only edit: simplest correct behavior is replace-in-full,
            # since PRs are small (a handful of lines) and this avoids the
            # complexity of diffing which existing items changed vs. new.
            instance.items.all().delete()
            PurchaseRequestItem.objects.bulk_create(
                [PurchaseRequestItem(purchase_request=instance, **item) for item in items_data]
            )
        return instance

class ApprovedQuantityItemSerializer(serializers.Serializer):
    """One row when an approver sets per-item approved quantities."""
    id = serializers.IntegerField()
    approved_quantity = serializers.DecimalField(max_digits=12, decimal_places=2)


class RecordDeliverySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    delivered_quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    delivered_by = serializers.CharField(max_length=255, required=False, allow_blank=True)


class RecordReceiptSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    received_quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    warehouse = serializers.IntegerField(
        help_text='Which warehouse this was actually received into — creates the real StockMovement.',
    )


class LPOItemSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = LPOItem
        fields = ('id', 'description', 'quantity', 'unit', 'rate', 'amount')


class LPOSerializer(serializers.ModelSerializer):
    items = LPOItemSerializer(many=True, read_only=True)
    purchase_request_code = serializers.CharField(source='purchase_request.code', read_only=True)
    digitally_approved_by_name = serializers.CharField(
        source='digitally_approved_by.get_full_name', read_only=True, default=None
    )
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, default=None)
    signed_document_url = serializers.SerializerMethodField()

    class Meta:
        model = LPO
        fields = (
            'id', 'code', 'purchase_request', 'purchase_request_code', 'supplier',
            'company_name', 'company_address', 'company_po_box', 'company_phone', 'company_email',
            'supplier_name', 'supplier_address', 'supplier_email', 'supplier_phone',
            'vat_applicable', 'vat_percent', 'subtotal', 'vat_amount', 'total',
            'status', 'signature_mode', 'signed_document', 'signed_document_url',
            'digitally_approved_by', 'digitally_approved_by_name', 'digitally_approved_at',
            'delivery_location', 'created_by', 'created_by_name', 'sent_at',
            'items', 'created_at',
        )
        read_only_fields = (
            'id', 'code', 'purchase_request', 'supplier', 'status',
            'digitally_approved_by', 'digitally_approved_at', 'created_by', 'sent_at', 'created_at',
        )

    def get_signed_document_url(self, obj):
        if not obj.signed_document:
            return None
        request = self.context.get('request')
        url = obj.signed_document.url
        return request.build_absolute_uri(url) if request else url