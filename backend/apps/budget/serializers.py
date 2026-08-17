# apps/budget/serializers.py
from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from .models import Budget, BudgetLine, CostTransaction


class CostTransactionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = CostTransaction
        fields = [
            'id', 'budget_line', 'transaction_type', 'source_type', 'source_reference',
            'amount', 'description', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['budget_line', 'created_by']


class BudgetLineSerializer(serializers.ModelSerializer):
    """
    committed_amount/actual_amount/remaining/variance are computed live
    from CostTransaction, not stored — same reasoning as BOQ.total_amount:
    a cached field can drift, a summed one can't.
    """
    boq_section_title = serializers.CharField(source='boq_section.title', read_only=True, default=None)
    committed_amount = serializers.SerializerMethodField()
    actual_amount = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    variance = serializers.SerializerMethodField()

    class Meta:
        model = BudgetLine
        fields = [
            'id', 'budget', 'boq_section', 'boq_section_title', 'title',
            'original_amount', 'approved_amount', 'order',
            'committed_amount', 'actual_amount', 'remaining', 'variance',
        ]
        read_only_fields = ['budget']

    def _sum(self, obj, transaction_type):
        result = obj.transactions.filter(transaction_type=transaction_type).aggregate(total=Sum('amount'))
        return result['total'] or Decimal('0')

    def get_committed_amount(self, obj):
        return self._sum(obj, 'committed')

    def get_actual_amount(self, obj):
        return self._sum(obj, 'actual')

    def get_remaining(self, obj):
        return obj.approved_amount - self.get_actual_amount(obj)

    def get_variance(self, obj):
        # Positive = over budget, negative = under budget — matches the
        # "+1,400,000 ⚠ Over Budget" convention from the roadmap.
        return self.get_actual_amount(obj) - obj.approved_amount


class BudgetSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.email', read_only=True, default=None)
    total_original = serializers.SerializerMethodField()
    total_approved = serializers.SerializerMethodField()
    total_committed = serializers.SerializerMethodField()
    total_actual = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'project', 'boq', 'title', 'currency', 'status',
            'created_by', 'created_by_name', 'approved_by', 'approved_by_name', 'approved_at',
            'total_original', 'total_approved', 'total_committed', 'total_actual',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['project', 'boq', 'created_by', 'approved_by', 'approved_at']

    def get_total_original(self, obj):
        return sum((line.original_amount for line in obj.lines.all()), Decimal('0'))

    def get_total_approved(self, obj):
        return sum((line.approved_amount for line in obj.lines.all()), Decimal('0'))

    def get_total_committed(self, obj):
        result = CostTransaction.objects.filter(
            budget_line__budget=obj, transaction_type='committed'
        ).aggregate(total=Sum('amount'))
        return result['total'] or Decimal('0')

    def get_total_actual(self, obj):
        result = CostTransaction.objects.filter(
            budget_line__budget=obj, transaction_type='actual'
        ).aggregate(total=Sum('amount'))
        return result['total'] or Decimal('0')


class GenerateBudgetSerializer(serializers.Serializer):
    """Input-only serializer for BudgetViewSet.generate_from_boq()."""
    boq_id = serializers.IntegerField()
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)