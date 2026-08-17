from django.contrib import admin
from .models import Activity, Milestone, ProgressUpdate, WBS, ProjectBaseline, BaselineActivity
from .models import ActivityMaterial, ActivityLabourRequirement, ActivityEquipmentRequirement
from .models import (
    RequirementGroup,
    ActivityToolRequirement,
    ActivityPPERequirement,
    ActivityServiceRequirement,
)



class ActivityMaterialInline(admin.TabularInline):
    model = ActivityMaterial
    extra = 0
    fields = ('item', 'quantity_required', 'status', 'review_status', 'group', 'purchase_request', 'notes')
    readonly_fields = ('status', 'purchase_request')


class ActivityLabourInline(admin.TabularInline):
    model = ActivityLabourRequirement
    extra = 0
    fields = ('role', 'quantity_required', 'review_status', 'group', 'notes')


class ActivityEquipmentInline(admin.TabularInline):
    model = ActivityEquipmentRequirement
    extra = 0
    fields = ('equipment_name', 'quantity_required', 'review_status', 'group', 'required_from', 'required_until', 'notes')


class ActivityToolInline(admin.TabularInline):
    model = ActivityToolRequirement
    extra = 0
    fields = ('tool_name', 'quantity_required', 'review_status', 'group', 'notes')


class ActivityPPEInline(admin.TabularInline):
    model = ActivityPPERequirement
    extra = 0
    fields = ('ppe_name', 'quantity_required', 'review_status', 'group', 'notes')


class ActivityServiceInline(admin.TabularInline):
    model = ActivityServiceRequirement
    extra = 0
    fields = ('service_name', 'quantity_required', 'review_status', 'group', 'provider_notes', 'notes')


class RequirementGroupInline(admin.TabularInline):
    model = RequirementGroup
    extra = 0
    fields = ('group_type', 'responsible', 'status', 'required_on_site', 'procurement_deadline', 'reviewed_by')


class ProgressUpdateInline(admin.TabularInline):
    model = ProgressUpdate
    extra = 0
    readonly_fields = ('updated_by', 'percent_complete', 'progress_date', 'notes', 'created_at')

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = (
        'code', 'name', 'project', 'wbs', 'responsible', 'status', 'percent_complete',
        'planned_start', 'planned_end', 'assigned_planner', 'planning_status',
    )
    list_filter = ('status', 'planning_status', 'project__company')
    search_fields = ('code', 'name', 'project__name')
    readonly_fields = (
        'pm_approved_by', 'pm_approved_at', 'qs_approved_by', 'qs_approved_at',
        'planning_submitted_at',
    )
    inlines = [
        RequirementGroupInline, ProgressUpdateInline,
        ActivityMaterialInline, ActivityLabourInline, ActivityEquipmentInline,
        ActivityToolInline, ActivityPPEInline, ActivityServiceInline,
    ]


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'target_date', 'achieved_date', 'status')
    list_filter = ('status', 'project__company')
    search_fields = ('name', 'project__name')


@admin.register(WBS)
class WBSAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'project', 'parent', 'order')
    list_filter = ('project__company',)
    search_fields = ('code', 'name', 'project__name')


class BaselineActivityInline(admin.TabularInline):
    model = BaselineActivity
    extra = 0
    readonly_fields = ('activity', 'name', 'planned_start', 'planned_end', 'status_at_snapshot')


@admin.register(ProjectBaseline)
class ProjectBaselineAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'is_current', 'created_by', 'created_at')
    list_filter = ('is_current', 'project__company')
    search_fields = ('name', 'project__name')
    inlines = [BaselineActivityInline]


@admin.register(RequirementGroup)
class RequirementGroupAdmin(admin.ModelAdmin):
    """
    Standalone view so reporting/audit questions ('did every activity
    actually get its requirements approved?') can be answered by
    filtering this table directly, without opening each Activity.
    """
    list_display = (
        'activity', 'group_type', 'status', 'responsible',
        'required_on_site', 'procurement_deadline', 'reviewed_by', 'reviewed_at',
    )
    list_filter = ('group_type', 'status', 'activity__project__company')
    search_fields = ('activity__name', 'activity__project__name')
    readonly_fields = ('reviewed_by', 'reviewed_at')

