# apps/boq/serializers.py
from rest_framework import serializers

from .models import BOQ, BOQRevision, BOQSection, BOQItem, Unit, BOQImportSession, BOQItemFlag


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'code', 'name']


class BOQItemSerializer(serializers.ModelSerializer):
    unit_code = serializers.CharField(source='unit.code', read_only=True)
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, read_only=True)
    wbs_name = serializers.CharField(source='wbs.name', read_only=True, default=None)
    activity_name = serializers.CharField(source='activity.name', read_only=True, default=None)

    class Meta:
        model = BOQItem
        fields = [
            'id', 'boq', 'section', 'item_code', 'description', 'unit', 'unit_code',
            'quantity', 'rate', 'amount', 'order',
            'wbs', 'wbs_name', 'activity', 'activity_name',
        ]
        read_only_fields = ['boq']


class BOQSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BOQSection
        fields = ['id', 'boq', 'parent', 'code', 'title', 'order']
        read_only_fields = ['boq']


class BOQRevisionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = BOQRevision
        fields = [
            'id', 'boq', 'revision_number', 'reason',
            'created_by', 'created_by_name', 'is_current', 'created_at',
        ]
        read_only_fields = ['boq', 'revision_number', 'created_by', 'is_current']


class BOQSerializer(serializers.ModelSerializer):
    """
    List/detail representation. total_amount and item_count are computed
    from live items rather than stored, so they can never drift out of
    sync with the actual line items (same reasoning as Activity keeping
    percent_complete but ProgressUpdate as the real history).
    """
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    total_amount = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    health = serializers.SerializerMethodField()
    health_label = serializers.SerializerMethodField()
    reference_document_url = serializers.SerializerMethodField()

    class Meta:
        model = BOQ
        fields = [
            'id', 'project', 'title', 'currency', 'status', 'source',
            'link_mode', 'integration_mode', 'created_by', 'created_by_name',
            'total_amount', 'item_count', 'health', 'health_label',
            'reference_document', 'reference_document_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['project', 'created_by', 'source']

    def get_total_amount(self, obj):
        return sum((item.amount for item in obj.items.all()), start=0)

    def get_item_count(self, obj):
        return obj.items.count()

    def get_health(self, obj):
        return obj.compute_health()

    def get_reference_document_url(self, obj):
        if not obj.reference_document_id:
            return None
        latest = obj.reference_document.versions.first()
        if not latest or not latest.file:
            return None
        request = self.context.get('request')
        url = latest.file.url
        return request.build_absolute_uri(url) if request else url

    def get_health_label(self, obj):
        return obj.health_label()


class BOQImportSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BOQImportSession
        fields = [
            'id', 'boq', 'project', 'file', 'import_mode', 'column_mapping',
            'confidence_score', 'status', 'created_by', 'created_at',
        ]
        read_only_fields = ['project', 'created_by', 'status']


class BOQItemFlagSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source='raised_by.get_full_name', read_only=True, default=None)
    boq_item_code = serializers.CharField(source='boq_item.item_code', read_only=True, default=None)

    class Meta:
        model = BOQItemFlag
        fields = [
            'id', 'activity', 'boq_item', 'boq_item_code', 'note',
            'raised_by', 'raised_by_name', 'resolved', 'created_at',
        ]
        read_only_fields = ['activity', 'raised_by', 'resolved']