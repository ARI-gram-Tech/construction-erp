# apps/budget/models.py
"""
Phase 3 — Budget & Cost Engine.

A Budget belongs to a Project and is usually generated from a BOQ (one
BudgetLine per top-level BOQSection), but can also be created manually
for projects that don't run a structured BOQ. Once `status='locked'`,
BudgetLine.approved_amount is meant to be immutable outside a Variation
(Module 4) — this app doesn't enforce that at the DB level yet since
Variations don't exist yet; the view layer blocks direct edits instead
(see views.py), and that block should be replaced with a proper
Variation-only path once Module 4 lands.

CostTransaction is the generic cost ledger every other module writes
to: Procurement writes 'committed' rows when a PO is approved,
Inventory/Finance write 'actual' rows when material is issued or an
invoice is paid. Nothing in this module cares which module wrote a
transaction — it just sums them. That's what keeps "Budget vs Actual"
correct without any module needing to know about the others' internals.
"""
from django.db import models

from apps.common.models import TimeStampedModel


class Budget(TimeStampedModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('approved', 'Approved'),
        ('locked', 'Locked'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='budgets'
    )
    boq = models.ForeignKey(
        'boq.BOQ', on_delete=models.SET_NULL, null=True, blank=True, related_name='budgets',
        help_text='The BOQ this budget was generated from, if any. Null for manually-built budgets.',
    )
    title = models.CharField(max_length=255)
    currency = models.CharField(max_length=3, default='KES')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_budgets'
    )
    approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_budgets'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.project.name})'


class BudgetLine(TimeStampedModel):
    """
    One line per top-level BOQSection when generated from a BOQ (e.g.
    "Earthworks", "Concrete Works"), or a manually-added line otherwise.
    `boq_section` is nullable so manual lines and an "Unallocated" line
    (for BOQ items with no section) both fit the same model.

    `original_amount` is a frozen snapshot from the BOQ at generation
    time and never changes — it answers "what did we originally price
    this at." `approved_amount` is what the budget is actually tracked
    against, and is the only field a Variation should ever touch.
    """
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='lines')
    boq_section = models.ForeignKey(
        'boq.BOQSection', on_delete=models.SET_NULL, null=True, blank=True, related_name='budget_lines'
    )
    title = models.CharField(max_length=255)
    original_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    approved_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'title']

    def __str__(self):
        return f'{self.title} — {self.budget.title}'


class CostTransaction(TimeStampedModel):
    """
    The generic cost ledger. `transaction_type` distinguishes money
    that's been promised (committed — e.g. an approved PO) from money
    that's actually left the business (actual — e.g. a paid invoice or
    issued material at cost). Both matter to a QS for different
    reasons: committed cost shows what's already spoken for even before
    actual spend catches up.

    `source_type`/`source_reference` are free-form now (no FK to
    Procurement/Inventory/Finance models, since those integrations
    aren't wired up yet) so this ledger works standalone today and can
    gain real source links later without a schema change — just start
    populating source_reference with a real PO/invoice number instead
    of a manual note.
    """
    TRANSACTION_TYPE_CHOICES = [
        ('committed', 'Committed'),
        ('actual', 'Actual'),
    ]
    SOURCE_TYPE_CHOICES = [
        ('manual', 'Manual entry'),
        ('procurement', 'Procurement'),
        ('inventory', 'Inventory'),
        ('finance', 'Finance'),
    ]

    budget_line = models.ForeignKey(BudgetLine, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default='manual')
    source_reference = models.CharField(max_length=100, blank=True, help_text='e.g. PO-0042, INV-1029')
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_transaction_type_display()} {self.amount} — {self.budget_line.title}'