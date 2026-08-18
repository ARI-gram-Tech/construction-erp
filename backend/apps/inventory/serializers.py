# apps/inventory/serializers.py
from rest_framework import serializers
from .models import (
    Warehouse, StockItem, StockLevel, StockMovement,
    PendingStockItemRequest, StockRestockRequest,
)


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = ('id', 'name', 'location_type', 'project', 'address', 'is_active')
        # location_type and project are set once by the auto-create signal,
        # not hand-edited via the API in this phase.
        read_only_fields = ('id', 'location_type', 'project')


class StockLevelSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_unit = serializers.CharField(source='item.unit', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)

    class Meta:
        model = StockLevel
        fields = (
            'id', 'warehouse', 'warehouse_name', 'item', 'item_name',
            'item_code', 'item_unit', 'quantity',
        )
        read_only_fields = ('id', 'quantity')


class StockItemSerializer(serializers.ModelSerializer):
    total_quantity = serializers.SerializerMethodField()

    class Meta:
        model = StockItem
        fields = (
            'id', 'code', 'name', 'category', 'unit', 'reorder_level',
            'standard_cost',
            'notes', 'total_quantity',
        )
        read_only_fields = ('id', 'code')

    def get_total_quantity(self, obj):
        # Only sums stock at warehouses this specific user can see —
        # falls back to summing everything if no context was passed
        # (e.g. called from somewhere that isn't StockItemViewSet, like
        # a management command), so this stays safe by default rather
        # than silently returning 0 everywhere it isn't explicitly wired.
        visible_ids = self.context.get('visible_warehouse_ids')
        levels = obj.stock_levels.all()
        if visible_ids is not None:
            levels = [sl for sl in levels if sl.warehouse_id in visible_ids]
        return sum(sl.quantity for sl in levels)


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    related_warehouse_name = serializers.CharField(
        source='related_warehouse.name', read_only=True
    )
    performed_by_name = serializers.CharField(
        source='performed_by.get_full_name', read_only=True
    )
    budget_line_title = serializers.CharField(
        source='budget_line.title', read_only=True, default=None
    )
    is_reversal = serializers.SerializerMethodField()
    is_reversed = serializers.SerializerMethodField()
    can_reverse = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = (
            'id', 'movement_type', 'item', 'item_name', 'warehouse',
            'warehouse_name', 'quantity', 'unit_cost', 'budget_line', 'budget_line_title',
            'related_warehouse', 'related_warehouse_name', 'reference', 'performed_by',
            'performed_by_name', 'notes', 'created_at',
            'reverses', 'is_reversal', 'is_reversed', 'can_reverse',
        )
        # Every field here is read-only because movements are only ever
        # created through the receive/issue/transfer/adjust actions on
        # the viewset — never via a generic POST — so StockLevel always
        # stays in sync with what the movement log says happened.
        read_only_fields = fields

    def get_is_reversal(self, obj):
        return obj.reverses_id is not None

    def get_is_reversed(self, obj):
        return obj.reversed_by.exists()

    def get_can_reverse(self, obj):
        # A reversal of a reversal isn't allowed — and a movement that's
        # already been reversed once can't be reversed again.
        return obj.reverses_id is None and not obj.reversed_by.exists()


class PendingStockItemRequestSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True, default=None)
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = PendingStockItemRequest
        fields = (
            'id', 'project', 'project_name', 'requested_name', 'suggested_unit',
            'suggested_category', 'quantity_requested', 'requested_by', 'requested_by_name',
            'status', 'resolved_item', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'review_notes', 'created_at',
        )
        read_only_fields = (
            'id', 'project', 'requested_by', 'status', 'resolved_item',
            'reviewed_by', 'reviewed_at', 'created_at',
        )


class ApproveRequestItemSerializer(serializers.Serializer):
    """
    One row in a bulk-approve payload. Reviewer can correct the name/
    unit/category right here — no need to reject-and-resubmit over a
    spelling error.
    """
    id = serializers.IntegerField()
    name = serializers.CharField(max_length=255)
    unit = serializers.CharField(max_length=30)
    category = serializers.ChoiceField(choices=StockItem.CATEGORY_CHOICES)
    reorder_level = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, default=0,
    )


class RejectRequestSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField())
    reason = serializers.CharField(required=False, allow_blank=True)


class StockMovementUpdateSerializer(serializers.ModelSerializer):
    """
    Deliberately narrow: only reference and notes can be edited after
    creation. quantity/item/warehouse must never change post-creation —
    that's what would let StockLevel drift from the audit log.
    """
    class Meta:
        model = StockMovement
        fields = ('id', 'reference', 'notes')
        read_only_fields = ('id',)


class StockRestockRequestSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_unit = serializers.CharField(source='item.unit', read_only=True)
    source_warehouse_name = serializers.CharField(
        source='source_warehouse.name', read_only=True, default=None
    )
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    dispatched_by_name = serializers.CharField(
        source='dispatched_by.get_full_name', read_only=True, default=None
    )
    received_by_name = serializers.CharField(
        source='received_by.get_full_name', read_only=True, default=None
    )
    reviewed_by_name = serializers.CharField(
        source='reviewed_by.get_full_name', read_only=True, default=None
    )
    generated_purchase_request_code = serializers.CharField(
        source='generated_purchase_request.code', read_only=True, default=None
    )
    outstanding_quantity = serializers.SerializerMethodField()

    class Meta:
        model = StockRestockRequest
        fields = (
            'id', 'project', 'project_name', 'item', 'item_name', 'item_unit',
            'quantity_requested', 'fulfilled_quantity', 'outstanding_quantity',
            'source_warehouse', 'source_warehouse_name',
            'notes', 'requested_by', 'requested_by_name', 'status',
            'dispatched_by', 'dispatched_by_name', 'dispatched_at', 'dispatch_notes',
            'resulting_movement',
            'received_by', 'received_by_name', 'received_at', 'receipt_movement',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_notes',
            'generated_purchase_request', 'generated_purchase_request_code',
            'created_at',
        )
        read_only_fields = (
            'id', 'project', 'requested_by', 'status', 'fulfilled_quantity',
            'dispatched_by', 'dispatched_at', 'resulting_movement',
            'received_by', 'received_at', 'receipt_movement',
            'reviewed_by', 'reviewed_at', 'review_notes',
            'generated_purchase_request', 'created_at',
        )

    def get_outstanding_quantity(self, obj):
        fulfilled = obj.fulfilled_quantity or 0
        return obj.quantity_requested - fulfilled


class ApproveRestockRequestSerializer(serializers.Serializer):
    """Dispatch only now — stock leaves source_warehouse, status -> in_transit."""
    source_warehouse = serializers.IntegerField(required=False)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)


class ReceiveRestockRequestSerializer(serializers.Serializer):
    """
    Body: { "id": <request id>, "reference"?: str }
    No quantity field — restock requests don't support partial receipt
    the way PurchaseRequestItem does (matching your earlier decision:
    RR is a simple internal move, not a multi-supplier PR line).
    """
    id = serializers.IntegerField()
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)