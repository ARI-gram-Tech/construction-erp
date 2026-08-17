# apps/planning/views.py
"""
Same project-scoping pattern as apps.team: project_pk from the URL,
get_project() confirms it belongs to request.user.company.
"""
from datetime import date

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from django.utils import timezone

from .permissions import (
    PlanningStructurePermission, WBSPermission, ActivityPermission,
    ActivityResourcePermission, can_manage_structure,
)
from .models import (
    Activity, Milestone, WBS, BaselineActivity, ProjectBaseline,
    ActivityMaterial, ActivityLabourRequirement, ActivityEquipmentRequirement,
    RequirementGroup, ActivityMaterialRevision, ActivityLabourRevision, ActivityEquipmentRevision,
    ActivityToolRequirement, ActivityToolRevision,
    ActivityPPERequirement, ActivityPPERevision,
    ActivityServiceRequirement, ActivityServiceRevision,
)
from .serializers import(
    ActivitySerializer, 
    MilestoneSerializer, 
    ProgressUpdateSerializer,
    WBSSerializer,
    BaselineActivitySerializer,
    ProjectBaselineSerializer,
    ActivityMaterialSerializer,
    ActivityLabourRequirementSerializer,
    ActivityEquipmentRequirementSerializer,
    RequirementGroupSerializer,
    ActivityToolRequirementSerializer,
    ActivityPPERequirementSerializer,
    ActivityServiceRequirementSerializer,
);


def get_or_create_group(activity, group_type):
    """Shared by every item viewset's perform_create — one row per (activity, group_type)."""
    group, _ = RequirementGroup.objects.get_or_create(
        activity=activity, group_type=group_type,
        defaults={'status': RequirementGroup.STATUS_PENDING_ASSIGNMENT},
    )
    return group


class RequirementItemActionsMixin:
    """
    Shared submit/approve/request-changes + revision-on-edit behaviour
    for all six per-activity requirement item types. Subclasses set
    `revision_model` and `revision_fk_name` (the FK field on that
    revision model pointing back to the item — e.g. 'material', 'tool').
    """
    revision_model = None
    revision_fk_name = None

    def _snapshot_revision(self, item, reason=''):
        self.revision_model.objects.create(**{
            self.revision_fk_name: item,
            'revision_number': item.revision_number,
            'quantity_required': item.quantity_required,
            'notes': item.notes,
            'changed_by': self.request.user,
            'reason': reason,
            'status_at_time': item.review_status,
        })

    def perform_update(self, serializer):
        item = self.get_object()
        quantity_changed = (
            'quantity_required' in serializer.validated_data
            and serializer.validated_data['quantity_required'] != item.quantity_required
        )
        if quantity_changed and item.review_status in ('submitted', 'approved'):
            self._snapshot_revision(item, reason='Edited after submission')
            item.revision_number += 1
            item.review_status = 'draft'
            item.save(update_fields=['revision_number', 'review_status'])
        serializer.save()
        if item.group_id:
            item.group.recompute_status_from_items()

    def perform_destroy(self, instance):
        group = instance.group
        instance.delete()
        if group:
            group.recompute_status_from_items()

    @action(detail=True, methods=['post'])
    def submit(self, request, *args, **kwargs):
        item = self.get_object()
        if item.review_status not in ('draft', 'changes_requested'):
            raise ValidationError('This item isn\'t in a state that can be submitted.')
        item.review_status = 'submitted'
        item.save(update_fields=['review_status'])
        if item.group_id:
            item.group.recompute_status_from_items()
        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, *args, **kwargs):
        item = self.get_object()
        project = item.activity.project
        if not (can_manage_structure(request.user, project) or request.user.role == 'qs'):
            raise PermissionDenied('Only PM, QS, or a company manager can approve.')
        item.review_status = 'approved'
        item.save(update_fields=['review_status'])
        if item.group_id:
            item.group.recompute_status_from_items()
        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=['post'], url_path='request-changes')
    def request_changes(self, request, *args, **kwargs):
        item = self.get_object()
        project = item.activity.project
        if not (can_manage_structure(request.user, project) or request.user.role == 'qs'):
            raise PermissionDenied('Only PM, QS, or a company manager can request changes.')
        note = request.data.get('note', '')
        self._snapshot_revision(item, reason=note or 'Changes requested')
        item.review_status = 'changes_requested'
        item.save(update_fields=['review_status'])
        if item.group_id:
            item.group.recompute_status_from_items()
        return Response(self.get_serializer(item).data)


class ProjectScopedMixin:
    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], company=self.request.user.company
        )

    def perform_create(self, serializer):
        serializer.save(project=self.get_project())


class ProjectBaselineViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    serializer_class = ProjectBaselineSerializer
    permission_classes = [PlanningStructurePermission]
    http_method_names = ['get', 'post', 'delete']  # no editing a snapshot

    def get_queryset(self):
        return ProjectBaseline.objects.filter(project=self.get_project())

    def perform_destroy(self, instance):
        # The "current" baseline is the official record everyone compares
        # against — deleting it out from under a live project would break
        # variance() with nothing to fall back to. Force a new baseline
        # (which auto-demotes this one) before it can be removed.
        if instance.is_current:
            raise ValidationError(
                'Cannot delete the current baseline. Create a new baseline '
                'first — it will automatically replace this one — then '
                'delete this older one if you no longer need it.'
            )
        instance.delete()

    def perform_create(self, serializer):
        project = self.get_project()
        # only one "current" baseline per project at a time
        ProjectBaseline.objects.filter(project=project, is_current=True).update(is_current=False)
        baseline = serializer.save(project=project, created_by=self.request.user, is_current=True)

        activities = Activity.objects.filter(project=project)
        BaselineActivity.objects.bulk_create([
            BaselineActivity(
                baseline=baseline,
                activity=a,
                name=a.name,
                planned_start=a.planned_start,
                planned_end=a.planned_end,
                status_at_snapshot=a.status,
            )
            for a in activities
        ])

    @action(detail=True, methods=['get'])
    def variance(self, request, project_pk=None, pk=None):
        """
        GET /planning/projects/{id}/baselines/{id}/variance/
        Compares each frozen baseline date against the activity's CURRENT
        planned date. Positive variance_days = running late; negative = ahead.
        If the activity was deleted since the baseline, current fields are null.
        """
        baseline = self.get_object()
        rows = []
        for snap in baseline.snapshot_activities.select_related('activity').all():
            current = snap.activity
            rows.append({
                'activity_name': snap.name,
                'baseline_start': snap.planned_start,
                'baseline_end': snap.planned_end,
                'current_end': current.planned_end if current else None,
                'variance_days': (current.planned_end - snap.planned_end).days if current else None,
                'current_status': current.status if current else 'deleted',
            })
        return Response(rows)


class ActivityViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    serializer_class = ActivitySerializer
    permission_classes = [ActivityPermission]

    def get_queryset(self):
        # Bin'd activities never show in the live plan — the dedicated
        # bin() action below is the only place they're listed.
        return Activity.objects.filter(project=self.get_project(), is_deleted=False)

    def perform_destroy(self, instance):
        from apps.common.utils import log_action

        # Dependency links still matter even for a soft delete — a bin'd
        # activity shouldn't leave another activity's Gantt bar pointing
        # at something that's no longer in the live plan.
        blockers = list(
            Activity.objects.filter(depends_on=instance, is_deleted=False)
            .values_list('name', flat=True)
        )
        if blockers:
            shown = ', '.join(blockers[:3])
            extra = f' and {len(blockers) - 3} more' if len(blockers) > 3 else ''
            raise ValidationError(
                f'Cannot delete "{instance.name}" — other activities depend on '
                f'it ({shown}{extra}). Update or clear those dependencies first.'
            )

        materials_count = instance.materials.count()
        labour_count = instance.labour_requirements.count()
        equipment_count = instance.equipment_requirements.count()
        progress_count = instance.updates.count()

        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()

        log_action(
            self.request.user, 'deleted_activity', company=instance.project.company,
            description=(
                f'Moved activity "{instance.name}" ({instance.code or instance.id}) '
                f'to the recycle bin on project "{instance.project.name}". Carrying: '
                f'{materials_count} material requirement(s), '
                f'{labour_count} labour requirement(s), '
                f'{equipment_count} equipment requirement(s), '
                f'{progress_count} progress update(s). Recoverable for 30 days.'
            ),
        )

    @action(detail=False, methods=['get'])
    def bin(self, request, project_pk=None):
        """GET /planning/projects/{id}/activities/bin/ — what's pending in the recycle bin."""
        project = self.get_project()
        items = Activity.objects.filter(project=project, is_deleted=True).order_by('-deleted_at')
        return Response(ActivitySerializer(items, many=True).data)

    @action(detail=True, methods=['post'])
    def restore(self, request, project_pk=None, pk=None):
        """POST .../activities/{id}/restore/ — PM/manager only, puts it back in the live plan."""
        from apps.common.utils import log_action
        activity = get_object_or_404(Activity, pk=pk, project=self.get_project(), is_deleted=True)
        self.check_object_permissions(request, activity)
        activity.is_deleted = False
        activity.deleted_at = None
        activity.deleted_by = None
        activity.save()
        log_action(
            request.user, 'restored_activity', company=activity.project.company,
            description=f'Restored activity "{activity.name}" from the recycle bin.',
        )
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['get', 'post'])
    def progress(self, request, project_pk=None, pk=None):
        activity = self.get_object()

        if request.method == 'GET':
            # Full daily progress log for this activity, most recent first
            updates = activity.updates.select_related('updated_by').all()
            return Response(ProgressUpdateSerializer(updates, many=True).data)

        serializer = ProgressUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(
            activity=activity,
            updated_by=request.user,
            progress_date=serializer.validated_data.get('progress_date') or date.today(),
        )

        new_percent = serializer.validated_data['percent_complete']
        activity.percent_complete = new_percent

        # First time work is logged, stamp the real start date
        if activity.actual_start is None and new_percent > 0:
            activity.actual_start = serializer.validated_data.get('progress_date') or date.today()

        if new_percent >= 100:
            activity.status = 'completed'
            if activity.actual_end is None:
                activity.actual_end = serializer.validated_data.get('progress_date') or date.today()
        elif new_percent > 0:
            activity.status = 'in_progress'

        activity.save()
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'], url_path='generate-restock-request')
    def generate_restock_request(self, request, project_pk=None, pk=None):
        """
        Rolls up every 'pending' ActivityMaterial on this activity into
        Restock Requests (RR) — one per material — for the site's own
        store to draw from central logistics. RR is deliberately NOT a
        Purchase Request: nothing leaves the company (no supplier
        involved), so this skips Procurement entirely, matching the
        rule that PR creation is Procurement's job, not something
        auto-generated from site planning.

        Only materials that already resolve to a real catalog item can
        be rolled into an RR — StockRestockRequest.item is a required
        FK to StockItem, so a material still sitting on an unapproved
        pending_request (new-to-catalog item) is skipped here; it needs
        Main Store Manager to approve it into the catalog first.
        """
        from apps.inventory.models import StockRestockRequest

        activity = self.get_object()
        pending = activity.materials.filter(
            status='pending', item__isnull=False,
        ).select_related('item')

        if not pending.exists():
            return Response(
                {'detail': 'No pending materials with a resolved catalog item '
                           'to generate a restock request for.'},
                status=400,
            )

        created_requests = []
        for am in pending:
            rr = StockRestockRequest.objects.create(
                company=activity.project.company,
                project=activity.project,
                item=am.item,
                quantity_requested=am.quantity_required,
                requested_by=request.user,
                notes=f'Auto-generated for Activity: {activity.name}',
            )
            created_requests.append(rr)

        pending.update(status='requested')

        from .serializers import ActivitySerializer
        return Response(ActivitySerializer(activity).data, status=201)

    @action(detail=True, methods=['post'])
    def assign_planner(self, request, project_pk=None, pk=None):
        """
        PM (or company-wide manager) picks anyone from the company to
        plan this activity. Auto-adds them to ProjectMember if they
        aren't already on the team — per the field requirement that a
        company without a dedicated role for this shouldn't need a
        separate manual "add to team" step first.
        """
        from apps.accounts.models import User
        from apps.team.models import ProjectMember
        from apps.planning.permissions import can_manage_structure

        activity = self.get_object()
        if not can_manage_structure(request.user, activity.project):
            raise PermissionDenied('Only the PM or a company manager can assign planning.')

        user_id = request.data.get('user')
        try:
            user = User.objects.get(pk=user_id, company=activity.project.company)
        except User.DoesNotExist:
            raise ValidationError('That user is not part of your company.')

        ProjectMember.objects.get_or_create(
            project=activity.project, user=user,
            defaults={'role_on_project': user.get_role_display() if user.role else 'Team Member'},
        )

        activity.assigned_planner = user
        activity.planning_status = 'in_progress'
        activity.save(update_fields=['assigned_planner', 'planning_status'])

        from apps.notifications.utils import notify
        notify(
            user, title=f'You\'ve been assigned to plan "{activity.name}"',
            message=f'{activity.project.name} — fill in requirements, materials, labour, and equipment.',
            level='info', link=f'/projects/{activity.project_id}/planning',
        )
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'])
    def submit_planning(self, request, project_pk=None, pk=None):
        """The assigned planner submits their work for PM + QS review."""
        activity = self.get_object()
        if activity.assigned_planner_id != request.user.id:
            raise PermissionDenied('Only the person assigned to plan this activity can submit it.')
        if activity.planning_status not in ('in_progress', 'changes_requested'):
            raise ValidationError('This activity isn\'t in a state that can be submitted.')

        activity.planning_status = 'submitted'
        activity.planning_submitted_at = timezone.now()
        activity.pm_approved_by = None
        activity.pm_approved_at = None
        activity.qs_approved_by = None
        activity.qs_approved_at = None
        activity.save()

        from apps.notifications.utils import notify
        from apps.accounts.models import User
        link = f'/projects/{activity.project_id}/planning'
        if activity.project.project_manager_id:
            notify(activity.project.project_manager, title=f'"{activity.name}" ready for review',
                   message='Planning submitted — needs PM approval.', level='info', link=link)
        for qs_user in User.objects.filter(company=activity.project.company, role='qs'):
            notify(qs_user, title=f'"{activity.name}" ready for budget review',
                   message='Planning submitted — needs QS approval.', level='info', link=link)

        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'])
    def approve_planning(self, request, project_pk=None, pk=None):
        """
        PM and QS each approve independently — both are required before
        planning_status flips to 'approved'. request.data: {tier: 'pm'|'qs', budget_amount?}
        """
        from apps.planning.permissions import is_assigned_project_manager

        activity = self.get_object()
        tier = request.data.get('tier')
        now = timezone.now()

        if tier == 'pm':
            if not (is_assigned_project_manager(request.user, activity.project) or request.user.role == 'company_admin'):
                raise PermissionDenied('Only this project\'s PM can approve at this stage.')
            activity.pm_approved_by = request.user
            activity.pm_approved_at = now
        elif tier == 'qs':
            if request.user.role not in ('qs', 'company_admin'):
                raise PermissionDenied('Only QS can approve the budget at this stage.')
            activity.qs_approved_by = request.user
            activity.qs_approved_at = now
            budget = request.data.get('budget_amount')
            if budget is not None:
                activity.qs_budget_amount = budget
        else:
            raise ValidationError('tier must be "pm" or "qs".')

        if activity.pm_approved_by_id and activity.qs_approved_by_id:
            activity.planning_status = 'approved'

        activity.save()

        from apps.notifications.utils import notify
        if activity.planning_status == 'approved' and activity.assigned_planner_id:
            notify(
                activity.assigned_planner, title=f'"{activity.name}" approved for execution',
                message='Both PM and QS have approved. Work can begin.', level='info',
                link=f'/projects/{activity.project_id}/planning',
            )
        return Response(ActivitySerializer(activity).data)

    @action(detail=True, methods=['post'])
    def request_changes(self, request, project_pk=None, pk=None):
        """PM or QS sends it back with a note instead of approving."""
        from apps.planning.permissions import can_manage_structure

        activity = self.get_object()
        if not (can_manage_structure(request.user, activity.project) or request.user.role == 'qs'):
            raise PermissionDenied('Only PM, QS, or a company manager can request changes.')

        note = request.data.get('note', '')
        activity.planning_status = 'changes_requested'
        activity.changes_requested_note = note
        activity.pm_approved_by = None
        activity.pm_approved_at = None
        activity.qs_approved_by = None
        activity.qs_approved_at = None
        activity.save()

        from apps.notifications.utils import notify
        if activity.assigned_planner_id:
            notify(
                activity.assigned_planner, title=f'Changes requested on "{activity.name}"',
                message=note or 'Review and resubmit.', level='warning',
                link=f'/projects/{activity.project_id}/planning',
            )
        return Response(ActivitySerializer(activity).data)
    
class MilestoneViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    serializer_class = MilestoneSerializer
    permission_classes = [PlanningStructurePermission]

    def get_queryset(self):
        return Milestone.objects.filter(project=self.get_project())
    

class WBSViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    serializer_class = WBSSerializer
    permission_classes = [WBSPermission]

    def get_queryset(self):
        return WBS.objects.filter(project=self.get_project(), is_deleted=False)

    def _descendant_ids(self, node):
        ids = {node.id}
        for child in WBS.objects.filter(parent=node, is_deleted=False):
            ids |= self._descendant_ids(child)
        return ids

    def perform_destroy(self, instance):
        from apps.common.utils import log_action

        ids = self._descendant_ids(instance)
        linked = Activity.objects.filter(wbs__in=ids, is_deleted=False).count()
        if linked:
            noun = 'activity is' if linked == 1 else 'activities are'
            raise ValidationError(
                f'Cannot delete "{instance.name}" — {linked} {noun} still linked '
                'to this section or its sub-sections. Reassign or delete those '
                'activities first.'
            )
        sub_section_count = len(ids) - 1

        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save()

        log_action(
            self.request.user, 'deleted_wbs_section', company=instance.project.company,
            description=(
                f'Moved WBS section "{instance.code} {instance.name}" to the '
                f'recycle bin on project "{instance.project.name}"'
                + (f', including {sub_section_count} sub-section(s)' if sub_section_count else '')
                + '. Recoverable for 30 days.'
            ),
        )

    @action(detail=False, methods=['get'])
    def bin(self, request, project_pk=None):
        project = self.get_project()
        items = WBS.objects.filter(project=project, is_deleted=True).order_by('-deleted_at')
        return Response(WBSSerializer(items, many=True).data)

    @action(detail=True, methods=['post'])
    def restore(self, request, project_pk=None, pk=None):
        from apps.common.utils import log_action
        node = get_object_or_404(WBS, pk=pk, project=self.get_project(), is_deleted=True)
        self.check_object_permissions(request, node)
        node.is_deleted = False
        node.deleted_at = None
        node.deleted_by = None
        node.save()
        log_action(
            request.user, 'restored_wbs_section', company=node.project.company,
            description=f'Restored WBS section "{node.code} {node.name}" from the recycle bin.',
        )
        return Response(WBSSerializer(node).data)
    

class ActivityMaterialViewSet(RequirementItemActionsMixin, viewsets.ModelViewSet):
    serializer_class = ActivityMaterialSerializer
    permission_classes = [ActivityResourcePermission]
    revision_model = ActivityMaterialRevision
    revision_fk_name = 'material'

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs['activity_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return ActivityMaterial.objects.filter(activity=self.get_activity())

    def perform_create(self, serializer):
        # local import — apps.planning shouldn't hard-depend on
        # apps.inventory at module load time
        from apps.inventory.models import PendingStockItemRequest

        activity = self.get_activity()
        group = get_or_create_group(activity, RequirementGroup.GROUP_MATERIALS)
        new_item_name = serializer.validated_data.pop('new_item_name', '').strip()
        new_item_unit = serializer.validated_data.pop('new_item_unit', '').strip()
        new_item_category = serializer.validated_data.pop('new_item_category', '').strip() or 'other'

        if new_item_name:
            pending = PendingStockItemRequest.objects.create(
                company=activity.project.company,
                project=activity.project,
                requested_name=new_item_name,
                suggested_unit=new_item_unit,
                suggested_category=new_item_category,
                quantity_requested=serializer.validated_data.get('quantity_required', 0),
                requested_by=self.request.user,
            )
            serializer.save(
                activity=activity, group=group, created_by=self.request.user,
                item=None, pending_request=pending,
            )

            from apps.notifications.utils import notify
            from django.contrib.auth import get_user_model
            User = get_user_model()
            for msm in User.objects.filter(
                company=activity.project.company, role='main_store_manager'
            ):
                notify(
                    msm, title='New catalog item request',
                    message=f'"{new_item_name}" requested from {activity.name} ({activity.project.name})',
                    level='info', link='/company/inventory/requests',
                )
        else:
            serializer.save(activity=activity, group=group, created_by=self.request.user)
        group.recompute_status_from_items()

    def perform_destroy(self, instance):
        # The frontend only shows a remove button for 'pending' rows, but
        # the API itself must enforce this — a direct call shouldn't be
        # able to detach a material that's already tied to a real PR.
        if instance.status != 'pending':
            raise ValidationError(
                f'Cannot remove this material — it has already been '
                f'{instance.status}. Only pending materials can be removed.'
            )
        group = instance.group
        instance.delete()
        if group:
            group.recompute_status_from_items()


class ActivityLabourRequirementViewSet(RequirementItemActionsMixin, viewsets.ModelViewSet):
    serializer_class = ActivityLabourRequirementSerializer
    permission_classes = [ActivityResourcePermission]
    revision_model = ActivityLabourRevision
    revision_fk_name = 'labour'

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs['activity_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return ActivityLabourRequirement.objects.filter(activity=self.get_activity())

    def perform_create(self, serializer):
        activity = self.get_activity()
        group = get_or_create_group(activity, RequirementGroup.GROUP_LABOUR)
        serializer.save(activity=activity, group=group, created_by=self.request.user)
        group.recompute_status_from_items()


class ActivityEquipmentRequirementViewSet(RequirementItemActionsMixin, viewsets.ModelViewSet):
    serializer_class = ActivityEquipmentRequirementSerializer
    permission_classes = [ActivityResourcePermission]
    revision_model = ActivityEquipmentRevision
    revision_fk_name = 'equipment'

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs['activity_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return ActivityEquipmentRequirement.objects.filter(activity=self.get_activity())

    def perform_create(self, serializer):
        activity = self.get_activity()
        group = get_or_create_group(activity, RequirementGroup.GROUP_PLANT_EQUIPMENT)
        serializer.save(activity=activity, group=group, created_by=self.request.user)
        group.recompute_status_from_items()


class ActivityToolRequirementViewSet(RequirementItemActionsMixin, viewsets.ModelViewSet):
    serializer_class = ActivityToolRequirementSerializer
    permission_classes = [ActivityResourcePermission]
    revision_model = ActivityToolRevision
    revision_fk_name = 'tool'

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs['activity_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return ActivityToolRequirement.objects.filter(activity=self.get_activity())

    def perform_create(self, serializer):
        activity = self.get_activity()
        group = get_or_create_group(activity, RequirementGroup.GROUP_TOOLS)
        serializer.save(activity=activity, group=group, created_by=self.request.user)
        group.recompute_status_from_items()


class ActivityPPERequirementViewSet(RequirementItemActionsMixin, viewsets.ModelViewSet):
    serializer_class = ActivityPPERequirementSerializer
    permission_classes = [ActivityResourcePermission]
    revision_model = ActivityPPERevision
    revision_fk_name = 'ppe'

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs['activity_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return ActivityPPERequirement.objects.filter(activity=self.get_activity())

    def perform_create(self, serializer):
        activity = self.get_activity()
        group = get_or_create_group(activity, RequirementGroup.GROUP_PPE_SAFETY)
        serializer.save(activity=activity, group=group, created_by=self.request.user)
        group.recompute_status_from_items()


class ActivityServiceRequirementViewSet(RequirementItemActionsMixin, viewsets.ModelViewSet):
    serializer_class = ActivityServiceRequirementSerializer
    permission_classes = [ActivityResourcePermission]
    revision_model = ActivityServiceRevision
    revision_fk_name = 'service'

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs['activity_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return ActivityServiceRequirement.objects.filter(activity=self.get_activity())

    def perform_create(self, serializer):
        activity = self.get_activity()
        group = get_or_create_group(activity, RequirementGroup.GROUP_SERVICES)
        serializer.save(activity=activity, group=group, created_by=self.request.user)
        group.recompute_status_from_items()


class RequirementGroupViewSet(viewsets.ModelViewSet):
    """
    Nested at .../activities/{activity_pk}/requirement-groups/.
    No create/delete — the six group rows (Materials/Labour/Plant/
    Tools/PPE/Services) are seeded automatically the first time this
    is listed for an activity, mirroring ActivityRequirementViewSet's
    get_or_create pattern.
    """
    serializer_class = RequirementGroupSerializer
    permission_classes = [ActivityResourcePermission]
    http_method_names = ['get', 'patch']

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs['activity_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        activity = self.get_activity()
        existing = set(
            RequirementGroup.objects.filter(activity=activity).values_list('group_type', flat=True)
        )
        missing = [gt for gt, _ in RequirementGroup.GROUP_TYPE_CHOICES if gt not in existing]
        if missing:
            RequirementGroup.objects.bulk_create([
                RequirementGroup(activity=activity, group_type=gt) for gt in missing
            ])
        return RequirementGroup.objects.filter(activity=activity)

    def perform_update(self, serializer):
        group = serializer.save()
        if group.responsible_id and group.status == RequirementGroup.STATUS_PENDING_ASSIGNMENT:
            group.status = RequirementGroup.STATUS_ASSIGNED
            group.save(update_fields=['status'])

    @action(detail=True, methods=['post'], url_path='mark-not-required')
    def mark_not_required(self, request, project_pk=None, activity_pk=None, pk=None):
        group = self.get_object()
        if not can_manage_structure(request.user, group.activity.project):
            raise PermissionDenied('Only the PM or a company manager can mark a group not required.')
        group.status = RequirementGroup.STATUS_NOT_REQUIRED
        group.save(update_fields=['status'])
        group.activity.recompute_planning_readiness()
        return Response(self.get_serializer(group).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, project_pk=None, activity_pk=None, pk=None):
        """Undo mark_not_required — puts the group back in play."""
        group = self.get_object()
        if not can_manage_structure(request.user, group.activity.project):
            raise PermissionDenied('Only the PM or a company manager can reopen a group.')
        if group.status != RequirementGroup.STATUS_NOT_REQUIRED:
            raise ValidationError('This group isn\'t marked as not required.')
        group.status = (
            RequirementGroup.STATUS_ASSIGNED if group.responsible_id
            else RequirementGroup.STATUS_PENDING_ASSIGNMENT
        )
        group.save(update_fields=['status'])
        group.activity.recompute_planning_readiness()
        return Response(self.get_serializer(group).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, project_pk=None, activity_pk=None, pk=None):
        """
        Fast-path bulk approve: every item must already be 'submitted'
        (or already 'approved'). Reviewers can still approve/reject
        items one at a time via each item's own approve/request-changes
        action instead of using this.
        """
        group = self.get_object()
        if not (can_manage_structure(request.user, group.activity.project) or request.user.role == 'qs'):
            raise PermissionDenied('Only PM, QS, or a company manager can approve.')
        items = list(group.items_queryset())
        blocking = [i for i in items if i.review_status not in ('submitted', 'approved')]
        if blocking:
            raise ValidationError(
                'All items must be submitted before the group can be approved as a whole. '
                'Approve or request changes on individual items instead.'
            )
        for item in items:
            if item.review_status == 'submitted':
                item.review_status = 'approved'
                item.save(update_fields=['review_status'])
        group.status = RequirementGroup.STATUS_APPROVED
        group.reviewed_by = request.user
        group.reviewed_at = timezone.now()
        group.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])
        group.activity.recompute_planning_readiness()
        return Response(self.get_serializer(group).data)

    @action(detail=True, methods=['post'], url_path='request-changes')
    def request_changes(self, request, project_pk=None, activity_pk=None, pk=None):
        group = self.get_object()
        if not (can_manage_structure(request.user, group.activity.project) or request.user.role == 'qs'):
            raise PermissionDenied('Only PM, QS, or a company manager can request changes.')
        note = request.data.get('note', '')
        group.status = RequirementGroup.STATUS_CHANGES_REQUESTED
        group.reviewed_by = request.user
        group.reviewed_at = timezone.now()
        group.review_note = note
        group.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_note'])
        group.activity.recompute_planning_readiness()
        return Response(self.get_serializer(group).data)