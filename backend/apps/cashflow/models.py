"""
Phase — Cash Flow.

Cash flow answers a question Budget deliberately doesn't: WHEN does
planned/actual money move, not just how much in total.

CashFlowEntry is the core unit: one row = one Activity's planned (or
actual) amount for one time period (week/month/year — QS's choice per
project). It optionally points at the BudgetLine it's time-phasing, so
totals can be cross-checked against Budget without the two apps
merging into one.

Deliberately NOT derived from BOQItem.activity linkage — per the
decision that this app must work even when items aren't linked to
activities (or the BOQ is reference-only and has no items at all).
QS fills this in directly against Activities; a future "derive from
BOQ" pass can populate rows with source='derived' without changing
this model at all.
"""
from decimal import Decimal

from django.db import models
from django.core.exceptions import ValidationError

from apps.common.models import TimeStampedModel


class CashFlowPlan(TimeStampedModel):
    """
    One per project (usually) — holds the project-wide settings for how
    cash flow is being tracked: what period granularity, and which
    Budget (if any) it's being reconciled against. A project could in
    theory have more than one (e.g. re-baselined), same reasoning as
    BOQ allowing multiple revisions.
    """
    PERIOD_CHOICES = [
        ('week', 'Weekly'),
        ('month', 'Monthly'),
        ('year', 'Yearly'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='cashflow_plans'
    )
    budget = models.ForeignKey(
        'budget.Budget', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cashflow_plans',
        help_text='Optional — the Budget this cash flow is being reconciled against. '
                   'Null if the project has no budget yet or cash flow is being built standalone.',
    )
    title = models.CharField(max_length=255)
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='month')
    is_current = models.BooleanField(
        default=True,
        help_text='Only one current plan per project at a time — mirrors ProjectBaseline.is_current.',
    )
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.project.name})'


class CashFlowEntry(TimeStampedModel):
    """
    One Activity's planned or actual amount for one period bucket.

    period_start is always normalized to the first day of its bucket
    (first day of the week/month/year) so aggregation is a simple
    group-by, not a date-range join.

    entry_type separates PLANNED (what QS distributed from the budget/
    BOQ across the activity's dates) from ACTUAL (what really moved —
    typically pulled from Procurement commitments + Finance payments
    later, but manually entered for now, same bootstrapping pattern as
    apps.budget.CostTransaction).
    """
    ENTRY_TYPE_CHOICES = [
        ('planned', 'Planned'),
        ('actual', 'Actual'),
    ]
    SOURCE_CHOICES = [
        ('manual', 'Manual entry'),
        ('derived', 'Derived from BOQ/Budget'),
    ]
    CATEGORY_CHOICES = [
        ('materials', 'Materials'),
        ('labour', 'Labour'),
        ('plant', 'Plant & Equipment'),
        ('subcontract', 'Subcontract'),
        ('other', 'Other / Unspecified'),
    ]

    plan = models.ForeignKey(CashFlowPlan, on_delete=models.CASCADE, related_name='entries')
    activity = models.ForeignKey(
        'planning.Activity', on_delete=models.CASCADE, related_name='cashflow_entries'
    )
    budget_line = models.ForeignKey(
        'budget.BudgetLine', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cashflow_entries',
        help_text='Optional — which Budget line this entry is time-phasing, for reconciliation.',
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES, default='planned')
    period_start = models.DateField(help_text='Normalized to the first day of its week/month/year bucket.')
    amount = models.DecimalField(max_digits=18, decimal_places=2, default=Decimal('0'))
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='manual')
    notes = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['activity_id', 'period_start']
        # One row per (activity, category, period, entry_type) — editing
        # re-saves the same row instead of creating duplicates for the
        # same cell in the grid.
        unique_together = ('plan', 'activity', 'category', 'entry_type', 'period_start')

    def __str__(self):
        return f'{self.activity.name} — {self.period_start} — {self.amount}'

    def clean(self):
        if self.activity_id and self.plan_id and self.activity.project_id != self.plan.project_id:
            raise ValidationError('This activity belongs to a different project than the cash flow plan.')
        if self.budget_line_id and self.plan.budget_id and self.budget_line.budget_id != self.plan.budget_id:
            raise ValidationError('This budget line does not belong to the plan\'s budget.')