# apps/variations/models.py
"""
Phase 4 — Variations & Interim Payment Certificates.

Variation.approve() is the ONLY sanctioned path for changing a locked
Budget's approved_amount — see apps.budget.views for the direct-edit
lock that everything else respects. Approving a variation bypasses
that lock deliberately (see services/apply.py); nothing else should.

InterimPaymentCertificate stores every computed figure (retention_amount,
vat_amount, gross_amount, net_payable) as real fields rather than
recomputing them from live rates. If retention_percent or vat_percent
change project-wide next month, a certificate issued last month must
keep showing last month's numbers — that's the entire point of a
certificate being a certificate.
"""
from django.db import models

from apps.common.models import TimeStampedModel


class Variation(TimeStampedModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_approval', 'Pending approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='variations'
    )
    budget_line = models.ForeignKey(
        'budget.BudgetLine', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='variations',
        help_text='Which budget line this variation adjusts. Leave blank for a '
                   'purely informational variation not tied to a specific line yet.',
    )
    number = models.PositiveIntegerField(help_text='Sequential per project — VO-1, VO-2, ...')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    reason = models.CharField(max_length=255, blank=True)

    cost_impact = models.DecimalField(
        max_digits=18, decimal_places=2, default=0,
        help_text='Positive = addition to contract sum, negative = omission.',
    )
    time_impact_days = models.IntegerField(default=0, help_text='Positive = extension, negative = acceleration.')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    requested_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='requested_variations'
    )
    decided_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='decided_variations'
    )
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-number']
        unique_together = ('project', 'number')

    def __str__(self):
        return f'VO-{self.number} — {self.title}'


class InterimPaymentCertificate(TimeStampedModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='ipcs'
    )
    budget = models.ForeignKey(
        'budget.Budget', on_delete=models.SET_NULL, null=True, blank=True, related_name='ipcs'
    )
    certificate_number = models.PositiveIntegerField(help_text='Sequential per project — IPC No.1, No.2, ...')
    period_start = models.DateField()
    period_end = models.DateField()

    # Inputs, entered manually until Module 6 (Progress Valuation) can
    # supply work_done_amount automatically from measured progress.
    work_done_amount = models.DecimalField(
        max_digits=18, decimal_places=2,
        help_text='Cumulative gross value of work completed to date, before retention.',
    )
    retention_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=16)
    advance_recovery_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    # Snapshot of the previous certificate's cumulative gross at the
    # moment this one was generated — frozen, not looked up live, so
    # deleting/editing a later certificate can't retroactively change
    # an earlier one's math.
    previous_gross_certified = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    # Computed at generation time — see services/ipc_calc.py. Stored,
    # not recalculated on read.
    retention_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    amount_after_retention = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    gross_amount = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    net_payable = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    issued_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-certificate_number']
        unique_together = ('project', 'certificate_number')

    def __str__(self):
        return f'IPC No.{self.certificate_number} — {self.project.name}'