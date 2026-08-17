"""
Phase 4 — Tender / Estimating (company-level QS work).

A Tender has two modes, mirroring BOQ.integration_mode's
reference/cost_tracking/full_integration split:

  reference — "just file this tender document in the system." No
              pricing items, no pipeline. Created via
              Tender.create_reference(), same shape as
              BOQViewSet.create_reference(). Shows up in the Tenders
              list/dashboard instead of being invisible in Documents.

  active    — the real pricing workflow: opportunity -> pricing ->
              submitted -> won/lost. Alice builds up pricing using
              TenderBOQSection / TenderBOQItem below — Tender's OWN
              tables, completely separate from apps.boq.BOQ. Nothing
              outside apps.tenders ever reads these two tables; no
              other app (budget, variations, procurement, inventory)
              needs to know they exist.

A reference tender can be promoted to active later simply by adding
tender BOQ items and moving status off 'filed' — nothing forces the
choice permanently at creation.

Won tenders convert into a real Project via Tender.convert_to_project()
(apps/tenders/services/convert.py) — creates the Project, then COPIES
this tender's TenderBOQItem/TenderBOQSection rows into a brand new,
completely normal apps.boq.BOQ (same copy pattern as
BOQViewSet.duplicate()), and calls into apps.budget's existing
generate_budget_from_boq(). From that point on, the project's BOQ is
indistinguishable from one that never went through a tender at all —
apps.boq itself is never modified by any of this.
"""
from django.db import models

from apps.common.models import CompanyOwnedModel, TimeStampedModel


class Tender(CompanyOwnedModel):
    MODE_CHOICES = [
        ('reference', 'Reference only — document on file'),
        ('active', 'Active — being priced'),
    ]
    STATUS_CHOICES = [
        # mode='reference' tenders sit in 'filed' and nowhere else.
        ('filed', 'Filed (reference only)'),
        # mode='active' pipeline:
        ('opportunity', 'Opportunity'),
        ('pricing', 'Pricing'),
        ('submitted', 'Submitted'),
        ('won', 'Won'),
        ('lost', 'Lost'),
        ('withdrawn', 'Withdrawn'),
    ]
    LOSS_REASON_CHOICES = [
        ('price', 'Price too high'),
        ('technical', 'Technical score'),
        ('late', 'Late submission'),
        ('disqualified', 'Failed qualification'),
        ('cancelled', 'Client cancelled'),
        ('other', 'Other / unknown'),
    ]

    title = models.CharField(max_length=255)
    client_name = models.CharField(
        max_length=255, blank=True,
        help_text='Free text — the tendering client/consultant. Not apps.clients.Client '
                   'necessarily, since many tenders come from a consultant, not the end client.',
    )
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='reference')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='filed')

    closing_date = models.DateField(
        null=True, blank=True, help_text='Submission deadline. Optional for reference-only tenders.',
    )
    estimated_value = models.DecimalField(
        max_digits=16, decimal_places=2, null=True, blank=True,
        help_text='Rough value at opportunity stage, before real pricing exists.',
    )

    assigned_qs = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_tenders',
    )

    # --- Reference-only mode ---
    reference_document = models.ForeignKey(
        'documents.Document', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reference_tenders',
        help_text='Set only when mode="reference" — the filed tender document. '
                   'Same pattern as BOQ.reference_document.',
    )

    # --- Pricing build-up (company-wide QS_INVOLVED work, filled once active) ---
    overheads_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    risk_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    profit_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # --- Submission / outcome ---
    submitted_price = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    outcome_decided_at = models.DateTimeField(null=True, blank=True)
    loss_reason = models.CharField(max_length=20, choices=LOSS_REASON_CHOICES, blank=True)
    loss_notes = models.TextField(blank=True)

    # --- Conversion to project, once won ---
    converted_project = models.OneToOneField(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='originating_tender',
    )
    converted_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='+')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def boq_item_count(self):
        return self.boq_items.count()

    @property
    def boq_total(self):
        return sum((item.amount for item in self.boq_items.all()), start=0)

    def compute_health(self):
        """
        Real signal, not a manually-set flag — mirrors BOQ.compute_health()'s
        spirit, but works off this tender's OWN boq_items, never
        apps.boq.
        """
        if self.mode == 'reference':
            return 'reference_only'
        if self.boq_item_count == 0:
            return 'not_started'
        return 'ready' if self.status in ('pricing', 'submitted', 'won', 'lost') else 'not_started'


class TenderBOQSection(TimeStampedModel):
    """
    Own table, own hierarchy — deliberately NOT apps.boq.BOQSection.
    Same self-referencing shape (mirrors how a real BOQ nests
    Division > Section > Sub-section), but this one belongs to a
    Tender, never a Project. Nothing here reaches into apps.boq at all.
    """
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='boq_sections')
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='children'
    )
    code = models.CharField(max_length=50, blank=True)
    title = models.CharField(max_length=255)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'code']

    def __str__(self):
        return f'{self.code} {self.title}'.strip()


class TenderBOQItem(TimeStampedModel):
    """
    Tender's own line-item table — same fields as apps.boq.BOQItem
    (item_code, description, unit, quantity, rate), plus the tender-only
    pricing build-up folded directly in here rather than a separate
    side-table (every tender BOQ item can carry a build-up, so there's
    no need for an optional one-to-one).

    unit is a plain CharField here, not a FK to apps.boq.Unit — keeps
    this model fully independent. If you want the same shared unit
    list (m3, kg, no...) later, that's a shared reference table either
    app can point to; it doesn't require coupling to apps.boq itself.
    """
    RATE_SOURCE_CHOICES = [
        ('manual', 'Entered manually'),
        ('historical', 'From historical rate'),
        ('procurement_quote', 'From a procurement quotation'),
        ('rate_library', 'From the Rate Library'),
    ]

    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='boq_items')
    section = models.ForeignKey(
        TenderBOQSection, on_delete=models.SET_NULL, null=True, blank=True, related_name='items'
    )
    item_code = models.CharField(max_length=50, blank=True)
    description = models.TextField()
    unit = models.CharField(max_length=20)
    quantity = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    rate = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    order = models.IntegerField(default=0)

    # --- Pricing build-up, folded in directly (see docstring) ---
    material_cost = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    labour_cost = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    plant_cost = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    subcontractor_cost = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    rate_source = models.CharField(max_length=20, choices=RATE_SOURCE_CHOICES, default='manual')
    rate_source_note = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['order', 'item_code']

    @property
    def amount(self):
        return self.quantity * self.rate

    @property
    def build_up_total(self):
        return self.material_cost + self.labour_cost + self.plant_cost + self.subcontractor_cost

    def __str__(self):
        return f'{self.item_code} {self.description[:40]}'

    
class TenderBOQImportSession(TimeStampedModel):
    """
    Tender's own import audit trail — mirrors apps.boq.BOQImportSession
    exactly, just FK'd to Tender instead of Project. Deliberately a
    separate table, not a shared one: same "don't make BOQ's tables
    learn about tenders" rule applies here too. The actual parsing
    logic (import_parser.py, ai_parser.py) is still reused as-is from
    apps.boq — only the model this session belongs to, and what it
    ultimately writes into (TenderBOQItem, not BOQItem), differ.
    """
    MODE_CHOICES = [
        ('manual_mapping', 'Manual mapping'),
        ('ai_import', 'AI import'),
    ]
    STATUS_CHOICES = [
        ('pending_review', 'Pending review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    tender = models.ForeignKey(
        Tender, on_delete=models.CASCADE, related_name='import_sessions'
    )
    file = models.FileField(upload_to='tender_boq_imports/%Y/%m/')
    import_mode = models.CharField(max_length=20, choices=MODE_CHOICES)
    column_mapping = models.JSONField(default=dict, blank=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)

    row_count = models.PositiveIntegerField(null=True, blank=True, help_text='Rows successfully imported.')
    error_count = models.PositiveIntegerField(null=True, blank=True, help_text='Rows skipped due to validation errors.')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Import for {self.tender.title} ({self.get_import_mode_display()})'