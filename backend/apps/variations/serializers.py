# apps/variations/serializers.py
from rest_framework import serializers

from .models import Variation, InterimPaymentCertificate


class VariationSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source='requested_by.email', read_only=True)
    decided_by_name = serializers.CharField(source='decided_by.email', read_only=True, default=None)
    budget_line_title = serializers.CharField(source='budget_line.title', read_only=True, default=None)

    class Meta:
        model = Variation
        fields = [
            'id', 'project', 'budget_line', 'budget_line_title', 'number', 'title',
            'description', 'reason', 'cost_impact', 'time_impact_days', 'status',
            'requested_by', 'requested_by_name', 'decided_by', 'decided_by_name',
            'decided_at', 'created_at',
        ]
        read_only_fields = [
            'project', 'number', 'status', 'requested_by', 'decided_by', 'decided_at',
        ]


class InterimPaymentCertificateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = InterimPaymentCertificate
        fields = [
            'id', 'project', 'budget', 'certificate_number', 'period_start', 'period_end',
            'work_done_amount', 'retention_percent', 'vat_percent', 'advance_recovery_amount',
            'previous_gross_certified', 'retention_amount', 'amount_after_retention',
            'vat_amount', 'gross_amount', 'net_payable',
            'status', 'notes', 'created_by', 'created_by_name', 'issued_at', 'created_at',
        ]
        read_only_fields = [
            'project', 'certificate_number', 'previous_gross_certified',
            'retention_amount', 'amount_after_retention', 'vat_amount', 'gross_amount',
            'net_payable', 'status', 'created_by', 'issued_at',
        ]