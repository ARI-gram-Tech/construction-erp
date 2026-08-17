# apps/boq/models.py
"""
Phase 1 — BOQ Core.

A BOQ belongs to a Project and is organised into its own self-referencing
BOQSection tree — deliberately NOT the same tree as apps.planning.WBS,
since a QS often groups by trade/division (Earthworks, Concrete,
Finishes) while Planning groups by schedule sequence/work package.
Forcing them to share one hierarchy would break whichever side built
theirs second.

Linking to Planning is optional and explicit, per your call: each
BOQItem carries nullable `wbs` / `activity` FKs regardless of anything
else. BOQ.link_mode is purely advisory for the frontend (show/hide the
WBS picker) — it does not enforce linkage at the DB level, so a project
can start standalone and start linking items later without a migration
or data fix.
"""
from django.db import models

from apps.common.models import TimeStampedModel


class Unit(models.Model):
    """
    Measurement units — shared reference data, not per-company, since
    m3/kg/no mean the same thing everywhere. Seed via a data migration.
    """
    code = models.CharField(max_length=10, unique=True)  # 'm3', 'm2', 'kg', 'no', 'Ls'
    name = models.CharField(max_length=50)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return self.code


class BOQ(TimeStampedModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('superseded', 'Superseded'),
    ]
    SOURCE_CHOICES = [
        ('manual', 'Manual entry'),
        ('import_excel', 'Excel import'),
        ('import_ai', 'AI import'),
    ]
    LINK_MODE_CHOICES = [
        ('standalone', 'Standalone — own section structure only'),
        ('linked_to_wbs', 'Linked to WBS — items can map to Planning'),
    ]
    INTEGRATION_MODE_CHOICES = [
        ('reference', 'Reference only'),
        ('cost_tracking', 'Cost tracking'),
        ('full_integration', 'Full integration'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='boqs'
    )
    title = models.CharField(max_length=255)
    currency = models.CharField(max_length=3, default='KES')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    link_mode = models.CharField(
        max_length=20, choices=LINK_MODE_CHOICES, default='standalone',
        help_text=(
            'UI hint only — whether this BOQ surfaces WBS/Activity linking '
            'to the user. Items can hold a wbs/activity FK either way; this '
            'just controls whether the picker is shown by default.'
        ),
    )
    integration_mode = models.CharField(
        max_length=20, choices=INTEGRATION_MODE_CHOICES, default='reference',
    )
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    reference_document = models.ForeignKey(
        'documents.Document', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reference_boqs',
        help_text='Set only when this BOQ was created via "Reference Only" upload — '
                   'the actual stored file this BOQ represents. BOQDetailPage renders '
                   'this file in-app instead of a sections/items editor when set.',
    )

    HEALTH_LABELS = {
        'reference_only': '🔴 Reference Only',
        'partially_integrated': '🟡 Partially Integrated',
        'fully_integrated': '🟢 Fully Integrated',
    }

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.project.name})'

    def compute_health(self):
        """
        Real signal, not a manually-set flag:
          - integration_mode='reference' is always Reference Only,
            regardless of import history — the BOQ was never meant to
            drive anything else.
          - Otherwise, look at the most recently approved import
            session (if any): low AI confidence or any skipped rows
            means Partially Integrated.
          - No import history at all (manually built, or nothing
            imported yet) means Fully Integrated once it has items —
            there's nothing to distrust.
        """
        if self.integration_mode == 'reference':
            return 'reference_only'

        last_session = self.import_sessions.filter(status='approved').order_by('-created_at').first()
        if last_session is None:
            return 'fully_integrated' if self.items.exists() else 'partially_integrated'

        if last_session.error_count:
            return 'partially_integrated'
        if last_session.import_mode == 'ai_import' and (last_session.confidence_score or 0) < 80:
            return 'partially_integrated'

        return 'fully_integrated'

    def health_label(self):
        return self.HEALTH_LABELS[self.compute_health()]


class BOQRevision(TimeStampedModel):
    boq = models.ForeignKey(BOQ, on_delete=models.CASCADE, related_name='revisions')
    revision_number = models.PositiveIntegerField()
    reason = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ['-revision_number']
        unique_together = ('boq', 'revision_number')

    def __str__(self):
        return f'{self.boq.title} — rev {self.revision_number}'


class BOQSection(TimeStampedModel):
    """
    Self-referencing so sections nest arbitrarily deep (Division >
    Section > Sub-section), since real BOQ formats (FIDIC/NCA/KeRRA/
    consultant-custom) don't agree on how many levels to use.
    """
    boq = models.ForeignKey(BOQ, on_delete=models.CASCADE, related_name='sections')
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


class BOQItem(TimeStampedModel):
    boq = models.ForeignKey(BOQ, on_delete=models.CASCADE, related_name='items')
    section = models.ForeignKey(
        BOQSection, on_delete=models.SET_NULL, null=True, blank=True, related_name='items'
    )
    item_code = models.CharField(max_length=50, blank=True)
    description = models.TextField()
    unit = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name='boq_items')
    quantity = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    rate = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    order = models.IntegerField(default=0)

    # Optional links into Planning — never required, regardless of BOQ.link_mode.
    wbs = models.ForeignKey(
        'planning.WBS', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='boq_items',
    )
    activity = models.ForeignKey(
        'planning.Activity', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='boq_items',
    )

    # Set once this item's section has been rolled into a budget line via
    # apps.budget.services.generate.generate_budget_from_boq(). Nullable
    # because allocation happens at the section level (see
    # BudgetLine.boq_section) — this per-item link is for future use
    # once budgets need item-level granularity, not populated yet.
    budget_line = models.ForeignKey(
        'budget.BudgetLine', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='boq_items',
    )

    class Meta:
        ordering = ['order', 'item_code']

    @property
    def amount(self):
        return self.quantity * self.rate

    def __str__(self):
        return f'{self.item_code} {self.description[:40]}'


class BOQImportSession(TimeStampedModel):
    """
    Audit trail for Module 2 (Import Engine), included here now so the
    FK target exists — the actual import logic/endpoints come in Module 2.
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

    boq = models.ForeignKey(
        BOQ, on_delete=models.CASCADE, related_name='import_sessions', null=True, blank=True
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='boq_import_sessions'
    )
    file = models.FileField(upload_to='boq_imports/%Y/%m/')
    import_mode = models.CharField(max_length=20, choices=MODE_CHOICES)
    column_mapping = models.JSONField(default=dict, blank=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)

    # Populated at confirm() time — see views_import.py. Used by
    # BOQ.compute_health() so the health badge reflects real import
    # quality instead of a manually-set flag.
    row_count = models.PositiveIntegerField(null=True, blank=True, help_text='Rows successfully imported.')
    error_count = models.PositiveIntegerField(null=True, blank=True, help_text='Rows skipped due to validation errors.')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Import for {self.project.name} ({self.get_import_mode_display()})'


class BOQItemFlag(TimeStampedModel):
    """
    Lets a planner (who has no edit rights on BOQ data) raise a concern
    about a linked item instead of silently guessing or editing it
    themselves. QS still makes the actual correction in the BOQ module —
    this is just the notification/paper-trail mechanism.
    """
    activity = models.ForeignKey(
        'planning.Activity', on_delete=models.CASCADE, related_name='boq_flags'
    )
    boq_item = models.ForeignKey(
        BOQItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='flags'
    )
    note = models.TextField()
    raised_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Flag on {self.activity.name}'