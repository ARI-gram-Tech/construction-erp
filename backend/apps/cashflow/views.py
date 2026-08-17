"""
Same project-scoping pattern as apps.boq / apps.budget / apps.planning.
"""
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from apps.projects.models import Project
from apps.planning.models import Activity
from .models import CashFlowPlan, CashFlowEntry
from .permissions import CashFlowPlanPermission, CashFlowEntryPermission
from .serializers import CashFlowPlanSerializer, CashFlowEntrySerializer, GenerateEntriesSerializer
from .services import periods as period_utils


class ProjectScopedMixin:
    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], company=self.request.user.company
        )


class CashFlowPlanViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    serializer_class = CashFlowPlanSerializer
    permission_classes = [CashFlowPlanPermission]

    def get_queryset(self):
        return CashFlowPlan.objects.filter(project=self.get_project())

    def perform_create(self, serializer):
        project = self.get_project()
        if serializer.validated_data.get('is_current', True):
            CashFlowPlan.objects.filter(project=project, is_current=True).update(is_current=False)
        serializer.save(project=project, created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def summary(self, request, project_pk=None, pk=None):
        """
        GET .../plans/{id}/summary/?group_by=wbs|activity
        Returns period-by-period totals — the actual chart/grid data.
        Shape:
          {
            "periods": ["2026-01-01", "2026-02-01", ...],
            "rows": [
              {"key": "wbs-3", "label": "Concrete Works", "type": "wbs",
               "totals": {"2026-01-01": 120000, ...},
               "children": [
                 {"key": "activity-14", "label": "Cast Slab", "type": "activity",
                  "totals": {"2026-01-01": 120000, ...}}
               ]}
            ]
          }
        """
        plan = self.get_object()
        entry_type = request.query_params.get('entry_type', 'planned')
        entries = (
            plan.entries.filter(entry_type=entry_type)
            .select_related('activity', 'activity__wbs')
        )

        all_periods = sorted({e.period_start for e in entries})

        wbs_groups = {}
        unassigned = {'key': 'unassigned', 'label': 'Unassigned', 'type': 'wbs', 'totals': {}, 'children': {}}

        for e in entries:
            activity = e.activity
            wbs = activity.wbs
            if wbs:
                group = wbs_groups.setdefault(wbs.id, {
                    'key': f'wbs-{wbs.id}', 'label': wbs.name, 'type': 'wbs',
                    'totals': {}, 'children': {},
                })
            else:
                group = unassigned

            group['totals'][str(e.period_start)] = group['totals'].get(str(e.period_start), 0) + float(e.amount)

            child = group['children'].setdefault(activity.id, {
                'key': f'activity-{activity.id}', 'label': activity.name, 'type': 'activity',
                'totals': {},
            })
            child['totals'][str(e.period_start)] = child['totals'].get(str(e.period_start), 0) + float(e.amount)

        rows = []
        for group in list(wbs_groups.values()) + ([unassigned] if unassigned['totals'] else []):
            group['children'] = list(group['children'].values())
            rows.append(group)

        return Response({
            'periods': [str(p) for p in all_periods],
            'rows': rows,
        })


class CashFlowEntryViewSet(viewsets.ModelViewSet):
    """
    Nested: /api/cashflow/projects/{project_pk}/plans/{plan_pk}/entries/
    """
    serializer_class = CashFlowEntrySerializer
    permission_classes = [CashFlowEntryPermission]

    def get_plan(self):
        return get_object_or_404(
            CashFlowPlan, pk=self.kwargs['plan_pk'],
            project_id=self.kwargs['project_pk'], project__company=self.request.user.company,
        )

    def get_queryset(self):
        return CashFlowEntry.objects.filter(plan=self.get_plan()).select_related('activity', 'activity__wbs')

    def _validate_activity(self, serializer, plan):
        activity = serializer.validated_data.get('activity')
        if activity and activity.project_id != plan.project_id:
            raise ValidationError({'activity': 'This activity belongs to a different project.'})

    def perform_create(self, serializer):
        plan = self.get_plan()
        self._validate_activity(serializer, plan)
        serializer.save(plan=plan, created_by=self.request.user, source='manual')

    def perform_update(self, serializer):
        plan = self.get_plan()
        self._validate_activity(serializer, plan)
        serializer.save(source='manual')

    @action(detail=False, methods=['post'], url_path='generate-rows')
    def generate_rows(self, request, project_pk=None, plan_pk=None):
        """
        Pre-populates blank (amount=0) entries for every period each
        selected Activity spans, using the plan's period_type. QS then
        fills in amounts directly in the grid — doesn't overwrite
        existing entries (get_or_create), safe to re-run.
        """
        plan = self.get_plan()
        serializer = GenerateEntriesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        activities = Activity.objects.filter(project_id=project_pk, is_deleted=False)
        if data.get('activity_ids'):
            activities = activities.filter(id__in=data['activity_ids'])

        created_count = 0
        for activity in activities:
            period_list = period_utils.generate_periods(
                activity.planned_start, activity.planned_end, plan.period_type,
            )
            for period_start in period_list:
                _, created = CashFlowEntry.objects.get_or_create(
                    plan=plan, activity=activity, category=data['category'],
                    entry_type=data['entry_type'], period_start=period_start,
                    defaults={'amount': 0, 'source': 'manual', 'created_by': request.user},
                )
                if created:
                    created_count += 1

        return Response({'created_count': created_count}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='distribute')
    def distribute(self, request, project_pk=None, plan_pk=None):
        """
        Body: {"activity": <id>, "category": "materials", "entry_type": "planned", "total_amount": 780000}
        Evenly splits total_amount across the activity's period range,
        creating/updating one CashFlowEntry per period. This is the
        'suggested auto-fill' — QS can still hand-edit any resulting cell.
        """
        plan = self.get_plan()
        activity_id = request.data.get('activity')
        category = request.data.get('category', 'other')
        entry_type = request.data.get('entry_type', 'planned')
        total_amount = request.data.get('total_amount')

        if not activity_id or total_amount is None:
            raise ValidationError('activity and total_amount are required.')

        activity = get_object_or_404(Activity, pk=activity_id, project_id=project_pk)
        period_list = period_utils.generate_periods(activity.planned_start, activity.planned_end, plan.period_type)
        split = period_utils.even_split(__import__('decimal').Decimal(str(total_amount)), period_list)

        entries = []
        for period_start, amount in split.items():
            entry, _ = CashFlowEntry.objects.update_or_create(
                plan=plan, activity=activity, category=category,
                entry_type=entry_type, period_start=period_start,
                defaults={'amount': amount, 'source': 'derived', 'created_by': request.user},
            )
            entries.append(entry)

        return Response(CashFlowEntrySerializer(entries, many=True).data)