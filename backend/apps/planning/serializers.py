# apps/planning/serializers.py
from rest_framework import serializers

from .models import (
    Activity, 
    Milestone, 
    ProgressUpdate, 
    WBS,
    BaselineActivity,
    ProjectBaseline,
    ActivityMaterial, 
    ActivityLabourRequirement, 
    ActivityEquipmentRequirement,
    RequirementGroup,
    ActivityToolRequirement,
    ActivityPPERequirement,
    ActivityServiceRequirement,
    );

class RequirementGroupSerializer(serializers.ModelSerializer):
    group_type_display = serializers.CharField(source='get_group_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    responsible_name = serializers.CharField(source='responsible.get_full_name', read_only=True, default=None)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default=None)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = RequirementGroup
        fields = (
            'id', 'activity', 'group_type', 'group_type_display',
            'responsible', 'responsible_name', 'status', 'status_display',
            'required_on_site', 'procurement_deadline',
            'alert_days_before', 'alert_sent_at',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_note',
            'item_count',
        )
        read_only_fields = ('id', 'activity', 'reviewed_by', 'reviewed_at', 'alert_sent_at')

    def get_item_count(self, obj):
        return obj.items_queryset().count()


class ProgressUpdateSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.email', read_only=True)

    class Meta:
        model = ProgressUpdate
        fields = ['id', 'activity', 'updated_by', 'updated_by_name', 'percent_complete', 'notes', 'progress_date', 'created_at']
        read_only_fields = ['activity', 'updated_by', 'created_at']


class ActivitySerializer(serializers.ModelSerializer):
    responsible_name = serializers.CharField(source='responsible.email', read_only=True)
    deleted_by_name = serializers.CharField(source='deleted_by.email', read_only=True, default=None)
    assigned_planner_name = serializers.CharField(source='assigned_planner.get_full_name', read_only=True, default=None)
    assigned_planner_role = serializers.CharField(source='assigned_planner.role', read_only=True, default=None)
    pm_approved_by_name = serializers.CharField(source='pm_approved_by.get_full_name', read_only=True, default=None)
    qs_approved_by_name = serializers.CharField(source='qs_approved_by.get_full_name', read_only=True, default=None)

    class Meta:
        model = Activity
        fields = [
            'id', 'project', 'wbs', 'code', 'name', 'responsible', 'responsible_name',
            'planned_start', 'planned_end', 'actual_start', 'actual_end',
            'percent_complete', 'status', 'depends_on', 'created_at', 'updated_at',
            'is_deleted', 'deleted_at', 'deleted_by_name',
            'assigned_planner', 'assigned_planner_name', 'assigned_planner_role', 'planning_status',
            'planning_submitted_at', 'pm_approved_by', 'pm_approved_by_name', 'pm_approved_at',
            'qs_approved_by', 'qs_approved_by_name', 'qs_approved_at', 'qs_budget_amount',
            'changes_requested_note',
        ]
        read_only_fields = [
            'project', 'is_deleted', 'deleted_at', 'deleted_by_name',
            'planning_status', 'planning_submitted_at',
            'pm_approved_by', 'pm_approved_at', 'qs_approved_by', 'qs_approved_at',
        ]

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ['id', 'project', 'name', 'target_date', 'achieved_date', 'status']
        read_only_fields = ['project']


class WBSSerializer(serializers.ModelSerializer):
    deleted_by_name = serializers.CharField(source='deleted_by.email', read_only=True, default=None)

    class Meta:
        model = WBS
        fields = ['id', 'project', 'parent', 'code', 'name', 'order', 'is_deleted', 'deleted_at', 'deleted_by_name']
        read_only_fields = ['project', 'is_deleted', 'deleted_at', 'deleted_by_name']


class BaselineActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = BaselineActivity
        fields = ['id', 'activity', 'name', 'planned_start', 'planned_end', 'status_at_snapshot']


class ProjectBaselineSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True)
    activity_count = serializers.SerializerMethodField()

    class Meta:
        model = ProjectBaseline
        fields = [
            'id', 'project', 'name', 'remarks', 'created_by', 'created_by_name',
            'is_current', 'activity_count', 'created_at',
        ]
        read_only_fields = ['project', 'created_by', 'is_current']

    def get_activity_count(self, obj):
        return obj.snapshot_activities.count()

class ActivityMaterialSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True, default=None)
    item_code = serializers.CharField(source='item.code', read_only=True, default=None)
    item_unit = serializers.CharField(source='item.unit', read_only=True, default=None)
    purchase_request_code = serializers.CharField(source='purchase_request.code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default=None)
    is_pending_catalog = serializers.SerializerMethodField()
    pending_request_name = serializers.CharField(
        source='pending_request.requested_name', read_only=True, default=None
    )
    pending_request_status = serializers.CharField(
        source='pending_request.status', read_only=True, default=None
    )

    # Write-only — used ONLY when the material doesn't exist in the
    # catalog yet. If provided, `item` is left null and a
    # PendingStockItemRequest is created + linked instead (see
    # ActivityMaterialViewSet.perform_create in views.py).
    new_item_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_item_unit = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_item_category = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = ActivityMaterial
        fields = (
            'id', 'activity', 'group', 'item', 'item_name', 'item_code', 'item_unit',
            'quantity_required', 'status', 'review_status', 'revision_number',
            'purchase_request', 'purchase_request_code', 'notes',
            'created_by', 'created_by_name',
            'is_pending_catalog', 'pending_request', 'pending_request_name', 'pending_request_status',
            'new_item_name', 'new_item_unit', 'new_item_category',
        )
        read_only_fields = (
            'id', 'activity', 'status', 'review_status', 'revision_number',
            'purchase_request', 'created_by', 'created_by_name', 'pending_request',
        )
        extra_kwargs = {'item': {'required': False}}

    def get_is_pending_catalog(self, obj):
        return obj.item_id is None and obj.pending_request_id is not None

    def validate(self, data):
        has_item = bool(data.get('item')) or (self.instance and self.instance.item_id)
        has_new_item_name = bool(data.get('new_item_name'))
        if not has_item and not has_new_item_name:
            raise serializers.ValidationError(
                'Select an existing material, or provide new_item_name to request it be added.'
            )
        return data


class ActivityLabourRequirementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default=None)

    class Meta:
        model = ActivityLabourRequirement
        fields = (
            'id', 'activity', 'group', 'role', 'quantity_required',
            'review_status', 'revision_number', 'notes', 'created_by', 'created_by_name',
        )
        read_only_fields = ('id', 'activity', 'review_status', 'revision_number', 'created_by', 'created_by_name')


class ActivityEquipmentRequirementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default=None)

    class Meta:
        model = ActivityEquipmentRequirement
        fields = (
            'id', 'activity', 'group', 'equipment_name', 'quantity_required',
            'review_status', 'revision_number', 'required_from', 'required_until',
            'notes', 'created_by', 'created_by_name',
        )
        read_only_fields = ('id', 'activity', 'review_status', 'revision_number', 'created_by', 'created_by_name')


class ActivityToolRequirementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default=None)

    class Meta:
        model = ActivityToolRequirement
        fields = (
            'id', 'activity', 'group', 'tool_name', 'quantity_required',
            'review_status', 'revision_number', 'notes', 'created_by', 'created_by_name',
        )
        read_only_fields = ('id', 'activity', 'review_status', 'revision_number', 'created_by', 'created_by_name')


class ActivityPPERequirementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default=None)

    class Meta:
        model = ActivityPPERequirement
        fields = (
            'id', 'activity', 'group', 'ppe_name', 'quantity_required',
            'review_status', 'revision_number', 'notes', 'created_by', 'created_by_name',
        )
        read_only_fields = ('id', 'activity', 'review_status', 'revision_number', 'created_by', 'created_by_name')


class ActivityServiceRequirementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.email', read_only=True, default=None)

    class Meta:
        model = ActivityServiceRequirement
        fields = (
            'id', 'activity', 'group', 'service_name', 'provider_notes', 'quantity_required',
            'review_status', 'revision_number', 'notes', 'created_by', 'created_by_name',
        )
        read_only_fields = ('id', 'activity', 'review_status', 'revision_number', 'created_by', 'created_by_name')
