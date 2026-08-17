from rest_framework import serializers

from .models import Tender, TenderBOQSection, TenderBOQItem, TenderBOQImportSession


class TenderBOQItemSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    build_up_total = serializers.DecimalField(max_digits=15, decimal_places=4, read_only=True)

    class Meta:
        model = TenderBOQItem
        fields = [
            'id', 'tender', 'section', 'item_code', 'description', 'unit',
            'quantity', 'rate', 'amount', 'order',
            'material_cost', 'labour_cost', 'plant_cost', 'subcontractor_cost',
            'build_up_total', 'rate_source', 'rate_source_note',
        ]
        read_only_fields = ['tender']


class TenderBOQSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenderBOQSection
        fields = ['id', 'tender', 'parent', 'code', 'title', 'order']
        read_only_fields = ['tender']


class TenderSerializer(serializers.ModelSerializer):
    """
    List/detail representation. boq_total and tender_price are computed
    from this tender's own boq_items — never apps.boq — so they can't
    drift out of sync (same reasoning as BOQSerializer.get_total_amount).
    """
    assigned_qs_name = serializers.CharField(source='assigned_qs.get_full_name', read_only=True, default=None)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    reference_document_url = serializers.SerializerMethodField()
    boq_item_count = serializers.IntegerField(read_only=True)
    boq_total = serializers.SerializerMethodField()
    tender_price = serializers.SerializerMethodField()
    health = serializers.SerializerMethodField()

    class Meta:
        model = Tender
        fields = [
            'id', 'title', 'client_name', 'mode', 'status',
            'closing_date', 'estimated_value', 'assigned_qs', 'assigned_qs_name',
            'reference_document', 'reference_document_url',
            'overheads_amount', 'risk_amount', 'profit_percent',
            'submitted_price', 'submitted_at', 'outcome_decided_at',
            'loss_reason', 'loss_notes',
            'converted_project', 'converted_at',
            'boq_item_count', 'boq_total', 'tender_price', 'health',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'created_by', 'submitted_at', 'outcome_decided_at',
            'converted_project', 'converted_at',
        ]

    def get_reference_document_url(self, obj):
        if not obj.reference_document_id:
            return None
        latest = obj.reference_document.versions.first()
        if not latest or not latest.file:
            return None
        request = self.context.get('request')
        url = latest.file.url
        return request.build_absolute_uri(url) if request else url

    def get_boq_total(self, obj):
        return obj.boq_total

    def get_tender_price(self, obj):
        """
        Direct cost (this tender's own boq_items) + overheads + risk,
        marked up by profit%. Matches the cost build-up shape from the
        roadmap: Direct Cost -> + Overheads/Risk -> Cost -> + Profit ->
        Tender Price.
        """
        direct_cost = obj.boq_total
        cost = direct_cost + obj.overheads_amount + obj.risk_amount
        profit = cost * (obj.profit_percent / 100)
        return cost + profit

    def get_health(self, obj):
        return obj.compute_health()


class TenderReferenceUploadSerializer(serializers.Serializer):
    """Used only by Tender.create_reference() — mirrors BOQ's create_reference action."""
    title = serializers.CharField(max_length=255)
    client_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    file = serializers.FileField()


class ConvertToProjectSerializer(serializers.Serializer):
    """
    Body for POST /tenders/{id}/convert-to-project/. project fields not
    already on Tender (client, contract dates, etc.) get collected here
    rather than guessed — Tender doesn't carry every field Project needs.
    """
    project_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    client = serializers.IntegerField(required=False, allow_null=True)
    project_manager = serializers.IntegerField(required=False, allow_null=True)
    start_date = serializers.DateField(required=False, allow_null=True)


class RecordOutcomeSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(choices=['won', 'lost', 'withdrawn'])
    loss_reason = serializers.ChoiceField(choices=Tender.LOSS_REASON_CHOICES, required=False, allow_blank=True)
    loss_notes = serializers.CharField(required=False, allow_blank=True)


class TenderBOQImportSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenderBOQImportSession
        fields = [
            'id', 'tender', 'file', 'import_mode', 'column_mapping',
            'confidence_score', 'status', 'row_count', 'error_count',
            'created_by', 'created_at',
        ]
        read_only_fields = ['tender', 'created_by', 'status']