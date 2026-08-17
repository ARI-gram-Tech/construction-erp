# apps/procurement/models.py
"""
Procurement — Phase 1: Purchase Requests.

A PurchaseRequest is raised against a specific Project and goes through
two approval tiers before it's considered approved:

  Tier 1 — the Project Manager assigned to THIS project (via ProjectMember,
           role='project_manager' on the user account). Judges necessity:
           does the project actually need this, right now, in this quantity.

  Tier 2 — any user company-wide with role='procurement_manager'. Judges
           authorization to spend: shared pool, not project-scoped, since
           procurement is a company-level function per the roadmap.

  company_admin may approve/reject at either tier as an override.

Deferred to later phases (needs modules that don't exist yet):
  - QS review/recommend step
  - RFQs & quotation comparison
  - Conversion into a Purchase Order (needs Supplier + pricing)
  - Value-based approval routing (needs a per-company thresholds/settings model)
"""
from django.db import models

from apps.common.models import TimeStampedModel


class PurchaseRequest(TimeStampedModel):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending_tier1', 'Pending Project Manager Approval'),
        ('pending_tier2', 'Pending Procurement Manager Approval'),
        ('pending_tier3', 'Pending Director Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    )
    PRIORITY_CHOICES = (
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
    )
    DECISION_CHOICES = (
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    code = models.CharField(
        max_length=20, blank=True, help_text='Auto-generated, e.g. PR-0001.'
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='purchase_requests'
    )
    requested_by = models.ForeignKey(
        'accounts.User', on_delete=models.PROTECT, related_name='purchase_requests_raised'
    )
    budget_line = models.ForeignKey(
        'budget.BudgetLine', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchase_requests',
        help_text='Which budget line this request draws from. Optional — required '
                   'only if you want approval to auto-create a committed CostTransaction '
                   '(see apps.integrations).',
    )
    title = models.CharField(
        max_length=255, help_text='Short description, e.g. "Cement for ground floor slab".'
    )
    reason = models.TextField(
        blank=True, help_text='Why this is needed / which activity it supports.'
    )
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    required_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # --- Tier 1: Project Manager ---
    tier1_approver = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pr_tier1_decisions',
    )
    tier1_decision = models.CharField(max_length=10, choices=DECISION_CHOICES, blank=True)
    tier1_comment = models.TextField(blank=True)
    tier1_decided_at = models.DateTimeField(null=True, blank=True)

    # --- Tier 2: Procurement Manager ---
    # Three real outcomes here, not two: Bharti can approve it herself,
    # reject it outright, or — her own judgment call, not a system rule
    # — push it to the Director even when the threshold wouldn't have
    # required it. requires_tier3() below still auto-forces escalation
    # above the company's threshold regardless of what she'd choose.
    TIER2_DECISION_CHOICES = (
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('escalated', 'Escalated to Director'),
    )
    tier2_approver = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pr_tier2_decisions',
    )
    tier2_decision = models.CharField(max_length=10, choices=TIER2_DECISION_CHOICES, blank=True)
    tier2_comment = models.TextField(blank=True)
    tier2_decided_at = models.DateTimeField(null=True, blank=True)

    # --- Tier 3: Director (only required if estimated_total is at or
    # above the company's procurement_approval_threshold) ---
    tier3_approver = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pr_tier3_decisions',
    )
    tier3_decision = models.CharField(max_length=10, choices=DECISION_CHOICES, blank=True)
    tier3_comment = models.TextField(blank=True)
    tier3_decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.code:
            last = (
                PurchaseRequest.objects
                .filter(project__company=self.project.company)
                .order_by('-id')
                .first()
            )
            next_num = (last.id + 1) if last else 1
            self.code = f'PR-{next_num:04d}'
        super().save(*args, **kwargs)

    @property
    def estimated_total(self):
        return sum(
            (item.estimated_unit_cost or 0) * item.quantity
            for item in self.items.all()
        )

    def __str__(self):
        return f'{self.code} — {self.title}'


class PurchaseRequestItem(models.Model):
    """
    A line item on a Purchase Request — what's actually being requested.

    approved_quantity is nullable and separate from `quantity` (what was
    asked for) — set by whichever tier makes the real call (Dipesh's
    "only 60 of 100"). Null means not yet decided; once set, it can be
    less than, equal to, or in rare cases more than the original ask.

    delivered_quantity / received_quantity are filled in later, by
    procurement (recording what the supplier's delivery note says) and
    whoever physically received it, respectively. All three numbers —
    requested, approved, delivered, received — sit side by side and are
    shown as-is: no field forces an explanation for any gap between
    them. The gap itself is the record.
    """
    purchase_request = models.ForeignKey(
        PurchaseRequest, on_delete=models.CASCADE, related_name='items'
    )
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30, blank=True, help_text='e.g. bags, tons, pieces.')
    estimated_unit_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    notes = models.CharField(max_length=255, blank=True)

    approved_quantity = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='What was actually authorized — may differ from quantity requested.',
    )
    delivered_quantity = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='What the supplier\'s delivery note says arrived.',
    )
    delivered_by = models.CharField(
        max_length=255, blank=True,
        help_text='Free text — supplier driver name, or "Company driver", etc.',
    )
    delivered_at = models.DateTimeField(null=True, blank=True)

    received_quantity = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='What was actually counted in on receipt — may differ from delivered_quantity.',
    )
    received_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    received_at = models.DateTimeField(null=True, blank=True)

    # Set once a real StockMovement (receipt) has been recorded for this
    # line — the answer to "does this actually reflect in the system's
    # inventory, or is it just paperwork". Null means: approved/delivered
    # on paper, but no real stock movement exists for it yet.
    stock_movement = models.ForeignKey(
        'inventory.StockMovement', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fulfilled_pr_items',
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.description} ({self.quantity} {self.unit})'

class LPO(TimeStampedModel):
    """
    A Local Purchase Order generated from a fully-approved PurchaseRequest.
    Snapshots company/supplier/item data at generation time — if the PR,
    supplier, or company details change afterward, this issued document
    doesn't silently drift with them (same reasoning as BaselineActivity
    freezing schedule data).

    Two ways to make it legally valid, chosen later by whoever's actually
    handling the signature — not decided at generation time:
      wet_ink  — printed, physically signed by the boss, then the signed
                 copy is scanned/photographed and uploaded back in.
      digital  — a director/company_admin clicks approve in-system; their
                 name + timestamp get stamped onto the PDF instead of ink.
    """
    STATUS_CHOICES = (
        ('awaiting_signature', 'Awaiting Signature'),
        ('signed', 'Signed'),
        ('sent', 'Sent to Supplier'),
        ('fulfilled', 'Fulfilled'),
        ('cancelled', 'Cancelled'),
    )
    SIGNATURE_MODE_CHOICES = (
        ('wet_ink', 'Wet-ink signature (scanned copy uploaded)'),
        ('digital', 'Digital approval'),
    )
    DELIVERY_LOCATION_CHOICES = (
        ('site', 'Project Site'),
        ('main_warehouse', 'Main Warehouse'),
    )

    code = models.CharField(max_length=20, blank=True, help_text='Auto-generated, e.g. LPO-0001.')
    purchase_request = models.OneToOneField(
        'PurchaseRequest', on_delete=models.PROTECT, related_name='lpo',
    )
    supplier = models.ForeignKey(
        'suppliers.Supplier', on_delete=models.PROTECT, related_name='lpos',
    )

    # --- Snapshot fields — filled in at generation, never recomputed live ---
    company_name = models.CharField(max_length=255)
    company_address = models.CharField(max_length=255, blank=True)
    company_po_box = models.CharField(max_length=100, blank=True)
    company_phone = models.CharField(max_length=32, blank=True)
    company_email = models.EmailField(blank=True)

    supplier_name = models.CharField(max_length=255)
    supplier_address = models.CharField(max_length=255, blank=True)
    supplier_email = models.EmailField(blank=True)
    supplier_phone = models.CharField(max_length=32, blank=True)

    vat_applicable = models.BooleanField(default=True)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=16)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='awaiting_signature')

    signature_mode = models.CharField(max_length=10, choices=SIGNATURE_MODE_CHOICES, blank=True)
    signed_document = models.FileField(upload_to='lpo_signed/%Y/%m/', null=True, blank=True)
    digitally_approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    digitally_approved_at = models.DateTimeField(null=True, blank=True)

    delivery_location = models.CharField(max_length=20, choices=DELIVERY_LOCATION_CHOICES, blank=True)

    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='+')
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.code:
            last = LPO.objects.filter(purchase_request__project__company=self.purchase_request.project.company).order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.code = f'LPO-{next_num:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.code} — {self.supplier_name}'


class LPOItem(models.Model):
    """
    Snapshot of the PR's approved items at LPO generation time —
    deliberately a separate copy from PurchaseRequestItem, same reasoning
    as the parent LPO snapshotting company/supplier fields.
    """
    lpo = models.ForeignKey(LPO, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30, blank=True)
    rate = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['id']

    @property
    def amount(self):
        return self.quantity * self.rate

    def __str__(self):
        return f'{self.description} x{self.quantity}'