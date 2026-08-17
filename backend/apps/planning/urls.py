# apps/planning/urls.py
from django.urls import path

from .views import (
    ActivityViewSet, 
    MilestoneViewSet, 
    WBSViewSet, 
    ProjectBaselineViewSet,  
    ActivityMaterialViewSet,
    ActivityLabourRequirementViewSet,
    ActivityEquipmentRequirementViewSet,
    RequirementGroupViewSet,
    ActivityToolRequirementViewSet,
    ActivityPPERequirementViewSet,
    ActivityServiceRequirementViewSet,
)
activity_list = ActivityViewSet.as_view({'get': 'list', 'post': 'create'})
activity_detail = ActivityViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
})
activity_progress = ActivityViewSet.as_view({'get': 'progress', 'post': 'progress'})
activity_bin = ActivityViewSet.as_view({'get': 'bin'})
activity_restore = ActivityViewSet.as_view({'post': 'restore'})

milestone_list = MilestoneViewSet.as_view({'get': 'list', 'post': 'create'})
milestone_detail = MilestoneViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
})

wbs_list = WBSViewSet.as_view({'get': 'list', 'post': 'create'})
wbs_detail = WBSViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})
wbs_bin = WBSViewSet.as_view({'get': 'bin'})
wbs_restore = WBSViewSet.as_view({'post': 'restore'})

baseline_list = ProjectBaselineViewSet.as_view({'get': 'list', 'post': 'create'})
baseline_detail = ProjectBaselineViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'})
baseline_variance = ProjectBaselineViewSet.as_view({'get': 'variance'})


activity_generate_rr = ActivityViewSet.as_view({'post': 'generate_restock_request'})

material_list = ActivityMaterialViewSet.as_view({'get': 'list', 'post': 'create'})
material_detail = ActivityMaterialViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
material_submit = ActivityMaterialViewSet.as_view({'post': 'submit'})
material_approve = ActivityMaterialViewSet.as_view({'post': 'approve'})
material_request_changes = ActivityMaterialViewSet.as_view({'post': 'request_changes'})

labour_list = ActivityLabourRequirementViewSet.as_view({'get': 'list', 'post': 'create'})
labour_detail = ActivityLabourRequirementViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
labour_submit = ActivityLabourRequirementViewSet.as_view({'post': 'submit'})
labour_approve = ActivityLabourRequirementViewSet.as_view({'post': 'approve'})
labour_request_changes = ActivityLabourRequirementViewSet.as_view({'post': 'request_changes'})

equipment_list = ActivityEquipmentRequirementViewSet.as_view({'get': 'list', 'post': 'create'})
equipment_detail = ActivityEquipmentRequirementViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
equipment_submit = ActivityEquipmentRequirementViewSet.as_view({'post': 'submit'})
equipment_approve = ActivityEquipmentRequirementViewSet.as_view({'post': 'approve'})
equipment_request_changes = ActivityEquipmentRequirementViewSet.as_view({'post': 'request_changes'})

tool_list = ActivityToolRequirementViewSet.as_view({'get': 'list', 'post': 'create'})
tool_detail = ActivityToolRequirementViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
tool_submit = ActivityToolRequirementViewSet.as_view({'post': 'submit'})
tool_approve = ActivityToolRequirementViewSet.as_view({'post': 'approve'})
tool_request_changes = ActivityToolRequirementViewSet.as_view({'post': 'request_changes'})

ppe_list = ActivityPPERequirementViewSet.as_view({'get': 'list', 'post': 'create'})
ppe_detail = ActivityPPERequirementViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
ppe_submit = ActivityPPERequirementViewSet.as_view({'post': 'submit'})
ppe_approve = ActivityPPERequirementViewSet.as_view({'post': 'approve'})
ppe_request_changes = ActivityPPERequirementViewSet.as_view({'post': 'request_changes'})

service_list = ActivityServiceRequirementViewSet.as_view({'get': 'list', 'post': 'create'})
service_detail = ActivityServiceRequirementViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})
service_submit = ActivityServiceRequirementViewSet.as_view({'post': 'submit'})
service_approve = ActivityServiceRequirementViewSet.as_view({'post': 'approve'})
service_request_changes = ActivityServiceRequirementViewSet.as_view({'post': 'request_changes'})

requirement_group_list = RequirementGroupViewSet.as_view({'get': 'list'})
requirement_group_detail = RequirementGroupViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'})
requirement_group_mark_not_required = RequirementGroupViewSet.as_view({'post': 'mark_not_required'})
requirement_group_reopen = RequirementGroupViewSet.as_view({'post': 'reopen'})
requirement_group_approve = RequirementGroupViewSet.as_view({'post': 'approve'})
requirement_group_request_changes = RequirementGroupViewSet.as_view({'post': 'request_changes'})

activity_assign_planner = ActivityViewSet.as_view({'post': 'assign_planner'})
activity_submit_planning = ActivityViewSet.as_view({'post': 'submit_planning'})
activity_approve_planning = ActivityViewSet.as_view({'post': 'approve_planning'})
activity_request_changes = ActivityViewSet.as_view({'post': 'request_changes'})

urlpatterns = [
    path('projects/<int:project_pk>/activities/', activity_list, name='project-activities'),
    path('projects/<int:project_pk>/activities/<int:pk>/', activity_detail, name='project-activity-detail'),
    path('projects/<int:project_pk>/activities/<int:pk>/progress/', activity_progress, name='project-activity-progress'),
    path('projects/<int:project_pk>/activities/bin/', activity_bin, name='project-activity-bin'),
    path('projects/<int:project_pk>/activities/<int:pk>/restore/', activity_restore, name='project-activity-restore'),
    path('projects/<int:project_pk>/milestones/', milestone_list, name='project-milestones'),
    path('projects/<int:project_pk>/milestones/<int:pk>/', milestone_detail, name='project-milestone-detail'),
    path('projects/<int:project_pk>/wbs/', wbs_list, name='project-wbs'),
    path('projects/<int:project_pk>/wbs/<int:pk>/', wbs_detail, name='project-wbs-detail'),
    path('projects/<int:project_pk>/wbs/bin/', wbs_bin, name='project-wbs-bin'),
    path('projects/<int:project_pk>/wbs/<int:pk>/restore/', wbs_restore, name='project-wbs-restore'),
    path('projects/<int:project_pk>/baselines/', baseline_list, name='project-baselines'),
    path('projects/<int:project_pk>/baselines/<int:pk>/', baseline_detail, name='project-baseline-detail'),
    path('projects/<int:project_pk>/baselines/<int:pk>/variance/', baseline_variance, name='project-baseline-variance'),
    path('projects/<int:project_pk>/activities/<int:pk>/generate-restock-request/', activity_generate_rr, name='activity-generate-rr'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/materials/', material_list, name='activity-materials'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/materials/<int:pk>/', material_detail, name='activity-material-detail'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/materials/<int:pk>/submit/', material_submit, name='activity-material-submit'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/materials/<int:pk>/approve/', material_approve, name='activity-material-approve'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/materials/<int:pk>/request-changes/', material_request_changes, name='activity-material-request-changes'),

    path('projects/<int:project_pk>/activities/<int:activity_pk>/labour/', labour_list, name='activity-labour'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/labour/<int:pk>/', labour_detail, name='activity-labour-detail'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/labour/<int:pk>/submit/', labour_submit, name='activity-labour-submit'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/labour/<int:pk>/approve/', labour_approve, name='activity-labour-approve'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/labour/<int:pk>/request-changes/', labour_request_changes, name='activity-labour-request-changes'),

    path('projects/<int:project_pk>/activities/<int:activity_pk>/equipment/', equipment_list, name='activity-equipment'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/equipment/<int:pk>/', equipment_detail, name='activity-equipment-detail'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/equipment/<int:pk>/submit/', equipment_submit, name='activity-equipment-submit'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/equipment/<int:pk>/approve/', equipment_approve, name='activity-equipment-approve'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/equipment/<int:pk>/request-changes/', equipment_request_changes, name='activity-equipment-request-changes'),

    path('projects/<int:project_pk>/activities/<int:activity_pk>/tools/', tool_list, name='activity-tools'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/tools/<int:pk>/', tool_detail, name='activity-tool-detail'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/tools/<int:pk>/submit/', tool_submit, name='activity-tool-submit'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/tools/<int:pk>/approve/', tool_approve, name='activity-tool-approve'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/tools/<int:pk>/request-changes/', tool_request_changes, name='activity-tool-request-changes'),

    path('projects/<int:project_pk>/activities/<int:activity_pk>/ppe/', ppe_list, name='activity-ppe'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/ppe/<int:pk>/', ppe_detail, name='activity-ppe-detail'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/ppe/<int:pk>/submit/', ppe_submit, name='activity-ppe-submit'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/ppe/<int:pk>/approve/', ppe_approve, name='activity-ppe-approve'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/ppe/<int:pk>/request-changes/', ppe_request_changes, name='activity-ppe-request-changes'),

    path('projects/<int:project_pk>/activities/<int:activity_pk>/services/', service_list, name='activity-services'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/services/<int:pk>/', service_detail, name='activity-service-detail'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/services/<int:pk>/submit/', service_submit, name='activity-service-submit'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/services/<int:pk>/approve/', service_approve, name='activity-service-approve'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/services/<int:pk>/request-changes/', service_request_changes, name='activity-service-request-changes'),

    path('projects/<int:project_pk>/activities/<int:pk>/assign-planner/', activity_assign_planner, name='activity-assign-planner'),
    path('projects/<int:project_pk>/activities/<int:pk>/submit-planning/', activity_submit_planning, name='activity-submit-planning'),
    path('projects/<int:project_pk>/activities/<int:pk>/approve-planning/', activity_approve_planning, name='activity-approve-planning'),
    path('projects/<int:project_pk>/activities/<int:pk>/request-changes/', activity_request_changes, name='activity-request-changes'),

    path('projects/<int:project_pk>/activities/<int:activity_pk>/requirement-groups/', requirement_group_list, name='activity-requirement-groups'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/requirement-groups/<int:pk>/', requirement_group_detail, name='activity-requirement-group-detail'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/requirement-groups/<int:pk>/mark-not-required/', requirement_group_mark_not_required, name='activity-requirement-group-mark-not-required'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/requirement-groups/<int:pk>/reopen/', requirement_group_reopen, name='activity-requirement-group-reopen'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/requirement-groups/<int:pk>/approve/', requirement_group_approve, name='activity-requirement-group-approve'),
    path('projects/<int:project_pk>/activities/<int:activity_pk>/requirement-groups/<int:pk>/request-changes/', requirement_group_request_changes, name='activity-requirement-group-request-changes'),
]