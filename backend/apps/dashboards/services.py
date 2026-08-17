# apps/dashboards/services.py
"""
Role-specific dashboard data services.

Each service takes the requesting user and returns a plain dict shaped
for that role's dashboard component. Scoping pattern: find the projects
this user is a member of (via team.ProjectMember), then pull data for
only those projects — never company-wide.
"""
from datetime import date
from decimal import Decimal

from apps.team.models import ProjectMember
from apps.planning.models import Activity, ActivityMaterial
from apps.documents.models import Document
from apps.boq.models import BOQ
from apps.budget.models import Budget, BudgetLine, CostTransaction
from apps.variations.models import Variation, InterimPaymentCertificate


class SiteEngineerDashboardService:
    """
    Phase 2 pilot dashboard. Scoped to Activities, Materials, and
    Drawings only — Inspections/Site Diary/Issues/Weather deferred
    until those models exist.
    """

    def __init__(self, user):
        self.user = user

    def get_project_ids(self):
        # role_on_project is free text with no fixed values, so we don't
        # filter on it. Whether this user IS a site engineer is decided
        # by the view (request.user.role == 'site_engineer'); here we
        # just find which projects they're linked to via ProjectMember.
        return list(
            ProjectMember.objects.filter(
                user=self.user
            ).values_list('project_id', flat=True)
        )

    def get_data(self):
        project_ids = self.get_project_ids()
        if not project_ids:
            return {'projects': []}

        today = date.today()
        result = []

        for project_id in project_ids:
            activities = Activity.objects.filter(
                project_id=project_id,
                planned_start__lte=today,
                planned_end__gte=today,
            ).order_by('planned_start')

            pending_materials = ActivityMaterial.objects.filter(
                activity__project_id=project_id,
                status='pending',
            ).select_related('activity', 'item')

            drawings = Document.objects.filter(
                project_id=project_id,
            ).order_by('-id')[:10]

            result.append({
                'project_id': project_id,
                'todays_activities': [
                    {
                        'id': a.id,
                        'name': a.name,
                        'percent_complete': a.percent_complete,
                        'status': a.status,
                        'planned_start': a.planned_start,
                        'planned_end': a.planned_end,
                    }
                    for a in activities
                ],
                'pending_materials': [
                    {
                        'id': m.id,
                        'activity_name': m.activity.name,
                        'item_name': m.item.name,
                        'quantity_required': m.quantity_required,
                    }
                    for m in pending_materials
                ],
                'drawings': [
                    {
                        'id': d.id,
                        'name': getattr(d, 'name', str(d)),
                    }
                    for d in drawings
                ],
            })

        return {'projects': result}


class QSDashboardService:
    """
    QS dashboard, scoped the same way as SiteEngineerDashboardService:
    via ProjectMember rows for this user. Four blocks per project:
    BOQ summary, Budget vs Actual, Variations, and recent IPCs —
    matching what apps.boq/budget/variations actually support today.
    """

    def __init__(self, user):
        self.user = user

    def get_project_ids(self):
        return list(
            ProjectMember.objects.filter(
                user=self.user
            ).values_list('project_id', flat=True)
        )

    def _boq_summary(self, project_id):
        boqs = BOQ.objects.filter(project_id=project_id).prefetch_related('items')
        return [
            {
                'id': b.id,
                'title': b.title,
                'status': b.status,
                'item_count': b.items.count(),
                'total_amount': sum((item.amount for item in b.items.all()), Decimal('0')),
                'health': b.compute_health(),
                'health_label': b.health_label(),
            }
            for b in boqs
        ]

    def _budget_vs_actual(self, project_id):
        budgets = Budget.objects.filter(project_id=project_id).prefetch_related('lines__transactions')
        result = []
        for budget in budgets:
            lines = []
            for line in budget.lines.all():
                committed = sum(
                    (t.amount for t in line.transactions.all() if t.transaction_type == 'committed'),
                    Decimal('0'),
                )
                actual = sum(
                    (t.amount for t in line.transactions.all() if t.transaction_type == 'actual'),
                    Decimal('0'),
                )
                lines.append({
                    'id': line.id,
                    'title': line.title,
                    'approved_amount': line.approved_amount,
                    'committed': committed,
                    'actual': actual,
                    'variance': line.approved_amount - actual,
                })
            result.append({
                'id': budget.id,
                'title': budget.title,
                'status': budget.status,
                'lines': lines,
            })
        return result

    def _variations(self, project_id):
        variations = Variation.objects.filter(project_id=project_id).order_by('-number')[:10]
        return [
            {
                'id': v.id,
                'number': v.number,
                'title': v.title,
                'status': v.status,
                'cost_impact': v.cost_impact,
                'time_impact_days': v.time_impact_days,
            }
            for v in variations
        ]

    def _recent_ipcs(self, project_id):
        ipcs = InterimPaymentCertificate.objects.filter(project_id=project_id).order_by('-certificate_number')[:5]
        return [
            {
                'id': ipc.id,
                'certificate_number': ipc.certificate_number,
                'status': ipc.status,
                'period_start': ipc.period_start,
                'period_end': ipc.period_end,
                'net_payable': ipc.net_payable,
            }
            for ipc in ipcs
        ]

    def get_data(self):
        project_ids = self.get_project_ids()
        if not project_ids:
            return {'projects': []}

        result = []
        for project_id in project_ids:
            result.append({
                'project_id': project_id,
                'boqs': self._boq_summary(project_id),
                'budgets': self._budget_vs_actual(project_id),
                'variations': self._variations(project_id),
                'recent_ipcs': self._recent_ipcs(project_id),
            })

        return {'projects': result}


class ProcurementDashboardService:
    """
    Company-wide, not project-scoped — matches apps.procurement's own
    inbox() action: procurement_manager/director/company_admin/
    procurement oversee across every project, not just ones they're a
    ProjectMember of. project_manager is the one exception (own
    projects only), same narrowing inbox() already applies.
    """

    def __init__(self, user):
        self.user = user

    def _visible_requests(self):
        from apps.procurement.models import PurchaseRequest

        company = self.user.company
        if company is None:
            return PurchaseRequest.objects.none()

        qs = PurchaseRequest.objects.filter(project__company=company).select_related(
            'project', 'requested_by',
        )

        role = self.user.role
        if role in ('company_admin', 'director', 'procurement_manager', 'procurement'):
            return qs  # company-wide visibility
        if role == 'project_manager':
            return qs.filter(project__project_manager_id=self.user.id)
        return qs.none()

    def _low_stock_count(self):
        from django.db.models import Sum, F
        from apps.inventory.models import StockItem

        company = self.user.company
        if company is None:
            return 0

        # Single annotated query — avoids looping every item and hitting
        # stock_levels.all() per row like StockItemSerializer does.
        return StockItem.objects.filter(company=company).annotate(
            total=Sum('stock_levels__quantity')
        ).filter(
            total__lte=F('reorder_level')
        ).count()

    def get_data(self):
        requests = self._visible_requests()
        open_requests = requests.filter(
            status__in=['pending_tier1', 'pending_tier2', 'pending_tier3']
        )
        awaiting_fulfillment = requests.filter(status='approved')

        return {
            'open_requests_count': open_requests.count(),
            'awaiting_fulfillment_count': awaiting_fulfillment.count(),
            'low_stock_count': self._low_stock_count(),
            'recent_requests': [
                {
                    'id': r.id,
                    'code': r.code,
                    'title': r.title,
                    'status': r.status,
                    'estimated_total': r.estimated_total,
                    'project_name': r.project.name,
                    'requested_by_name': r.requested_by.get_full_name(),
                }
                for r in requests.order_by('-created_at')[:10]
            ],
        }