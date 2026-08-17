from rest_framework import serializers
from django.db.models import Sum

from .models import CashFlowPlan, CashFlowEntry


class CashFlowEntrySerializer(serializers.ModelSerializer):
    activity_name = serializers.CharField(source='activity.name', read_only=True)
    wbs_id = serializers.IntegerField(source='activity.wbs_id', read_only=True)
    wbs_name = serializers.CharField(source='activity.wbs.name', read_only=True, default=None)
    budget_line_title = serializers.CharField(source='budget_line.title', read_only=True, default=None)

    class Meta:
        model = CashFlowEntry
        fields = [
            'id', 'plan', 'activity', 'activity_name', 'wbs_id', 'wbs_name',
            'budget_line', 'budget_line_title', 'category', 'entry_type',
            'period_start', 'amount', 'source', 'notes', 'created_by',
        ]
        read_only_fields = ['plan', 'source', 'created_by']


class CashFlowPlanSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    total_planned = serializers.SerializerMethodField()
    total_actual = serializers.SerializerMethodField()

    class Meta:
        model = CashFlowPlan
        fields = [
            'id', 'project', 'budget', 'title', 'period_type', 'is_current',
            'created_by', 'created_by_name', 'total_planned', 'total_actual', 'created_at',
        ]
        read_only_fields = ['project', 'created_by']

    def get_total_planned(self, obj):
        result = obj.entries.filter(entry_type='planned').aggregate(total=Sum('amount'))
        return result['total'] or 0

    def get_total_actual(self, obj):
        result = obj.entries.filter(entry_type='actual').aggregate(total=Sum('amount'))
        return result['total'] or 0


class GenerateEntriesSerializer(serializers.Serializer):
    """
    Input for the 'generate-rows' action — pre-populates blank
    CashFlowEntry rows for every Activity in the project (or a filtered
    subset), one row per period the activity spans. Doesn't set amounts
    — QS fills those in; this just saves them from manually creating
    every row first.
    """
    activity_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    category = serializers.ChoiceField(choices=CashFlowEntry.CATEGORY_CHOICES, default='other')
    entry_type = serializers.ChoiceField(choices=CashFlowEntry.ENTRY_TYPE_CHOICES, default='planned')