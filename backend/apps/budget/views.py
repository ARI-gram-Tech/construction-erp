# apps/budget/views.py
"""
Same project-scoping pattern as apps.boq and apps.planning:
project_pk from the URL, get_project()/get_budget() confirm ownership
via request.user.company before anything is queried or created.
"""
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from apps.boq.models import BOQ
from .models import Budget, BudgetLine, CostTransaction
from .serializers import (
    BudgetSerializer,
    BudgetLineSerializer,
    CostTransactionSerializer,
    GenerateBudgetSerializer,
)
from .services.generate import generate_budget_from_boq


class ProjectScopedMixin:
    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], company=self.request.user.company
        )


class BudgetViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']  # no full PUT — partial edits only

    def get_queryset(self):
        return Budget.objects.filter(project=self.get_project())

    def perform_create(self, serializer):
        serializer.save(project=self.get_project(), created_by=self.request.user)

    def perform_update(self, serializer):
        budget = self.get_object()
        if budget.status == 'locked':
            raise ValidationError('Budget is locked. Changes require a variation once Module 4 is built.')
        serializer.save()

    @action(detail=False, methods=['post'], url_path='generate-from-boq')
    def generate_from_boq(self, request, project_pk=None):
        """
        POST { "boq_id": 12, "title": "Initial Budget" (optional) }
        Creates a brand new Budget from the BOQ's current items — never
        overwrites an existing budget. Re-running this after the BOQ
        changes gives you a second Budget to compare, not a silent
        replacement of the first.
        """
        project = self.get_project()
        serializer = GenerateBudgetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        boq = get_object_or_404(BOQ, pk=serializer.validated_data['boq_id'], project=project)
        title = serializer.validated_data.get('title') or f'Budget — {boq.title}'

        budget = generate_budget_from_boq(boq, title, request.user)
        return Response(BudgetSerializer(budget).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, project_pk=None, pk=None):
        """
        draft -> approved. Doesn't lock the budget — approved budgets
        can still be edited; locking is a separate, deliberate step
        (see lock()) so "approved by the PM" and "frozen, changes need
        a variation" aren't forced to happen at the same moment.
        """
        budget = self.get_object()
        if budget.status == 'locked':
            return Response({'detail': 'Budget is locked. Unlock it first if you need to re-approve.'}, status=400)
        budget.status = 'approved'
        budget.approved_by = request.user
        budget.approved_at = timezone.now()
        budget.save(update_fields=['status', 'approved_by', 'approved_at'])
        return Response(BudgetSerializer(budget).data)

    @action(detail=True, methods=['post'])
    def lock(self, request, project_pk=None, pk=None):
        """
        Freezes BudgetLine.approved_amount against direct edits. There's
        no unlock endpoint here on purpose — until Module 4 (Variations)
        exists to provide an audited path for post-lock changes, the
        only way to unlock is a deliberate DB/admin action, not a casual
        API call.
        """
        budget = self.get_object()
        budget.status = 'locked'
        budget.save(update_fields=['status'])
        return Response(BudgetSerializer(budget).data)


class BudgetLineViewSet(viewsets.ModelViewSet):
    """
    Nested under a budget: /api/budget/projects/{project_pk}/budgets/{budget_pk}/lines/
    Lines are created by generate_from_boq() or added manually; editing
    `approved_amount` directly is blocked once the parent Budget is locked.
    """
    serializer_class = BudgetLineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_budget(self):
        return get_object_or_404(
            Budget, pk=self.kwargs['budget_pk'], project__company=self.request.user.company
        )

    def get_queryset(self):
        return BudgetLine.objects.filter(budget=self.get_budget()).prefetch_related('transactions')

    def perform_create(self, serializer):
        budget = self.get_budget()
        if budget.status == 'locked':
            raise ValidationError('Budget is locked. Changes require a variation once Module 4 is built.')
        serializer.save(budget=budget)

    def perform_update(self, serializer):
        line = self.get_object()
        if line.budget.status == 'locked':
            raise ValidationError('Budget is locked. Changes require a variation once Module 4 is built.')
        serializer.save()


class CostTransactionViewSet(viewsets.ModelViewSet):
    """
    Nested under a budget line:
    /api/budget/projects/{project_pk}/budgets/{budget_pk}/lines/{line_pk}/transactions/

    This is the manual entry point for today (typed in by a QS). Once
    Procurement/Inventory/Finance are wired up, they call
    CostTransaction.objects.create(...) directly with source_type set
    accordingly — this endpoint keeps working unchanged for manual entries.
    """
    serializer_class = CostTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post']  # transactions are a ledger — never edited, only added

    def get_budget_line(self):
        return get_object_or_404(
            BudgetLine,
            pk=self.kwargs['line_pk'],
            budget_id=self.kwargs['budget_pk'],
            budget__project__company=self.request.user.company,
        )

    def get_queryset(self):
        return CostTransaction.objects.filter(budget_line=self.get_budget_line())

    def perform_create(self, serializer):
        serializer.save(
            budget_line=self.get_budget_line(),
            created_by=self.request.user,
            source_type=serializer.validated_data.get('source_type') or 'manual',
        )