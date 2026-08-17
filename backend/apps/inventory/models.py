"""
Inventory: knows what materials exist, and exactly where — Main
Warehouse (company-wide) or a specific Project Store. Procurement will
check this before deciding whether a request needs a real purchase.
"""
from django.db import models
from apps.common.models import CompanyOwnedModel


class Warehouse(CompanyOwnedModel):
    """
    A physical stock location. Every company gets one Main Warehouse
    (created automatically), and every project gets its own store,
    so it's always clear what's at head office versus on site.
    """
    LOCATION_TYPE_CHOICES = (
        ('main', 'Main Warehouse'),
        ('project', 'Project Store'),
    )

    name = models.CharField(max_length=255)
    location_type = models.CharField(max_length=10, choices=LOCATION_TYPE_CHOICES)
    project = models.OneToOneField(
        'projects.Project', on_delete=models.CASCADE, null=True, blank=True,
        related_name='store',
        help_text='Set only for project stores; null for the Main Warehouse.',
    )
    address = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['location_type', 'name']

    def __str__(self):
        return self.name


class StockItem(CompanyOwnedModel):
    """
    A material/item type in the company's catalog — e.g. "Cement 50kg".
    This is the master record; StockLevel tracks how much of it exists
    at each warehouse.
    """
    CATEGORY_CHOICES = (
        ('materials', 'Building Materials'),
        ('electrical', 'Electrical'),
        ('plumbing', 'Plumbing'),
        ('tools', 'Tools'),
        ('safety', 'Safety Equipment'),
        ('other', 'Other'),
    )

    code = models.CharField(max_length=20, blank=True, help_text='Auto-generated, e.g. ITM-0001.')
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='materials')
    unit = models.CharField(max_length=30, help_text='e.g. bags, tons, pieces, meters.')
    reorder_level = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text='Alert when total stock falls at or below this level.',
    )
    standard_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Reference unit cost, used as a fallback when a StockMovement '
                   'doesn\'t specify its own unit_cost.',
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.code:
            last = StockItem.objects.filter(company=self.company).order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.code = f'ITM-{next_num:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.code} — {self.name}'


class StockLevel(models.Model):
    """
    How much of a given StockItem currently sits at a given Warehouse.
    This is the number that actually changes as stock moves — never
    edited directly, only through StockMovement so there's always an
    audit trail of how a quantity got there.
    """
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stock_levels')
    item = models.ForeignKey(StockItem, on_delete=models.CASCADE, related_name='stock_levels')
    quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        unique_together = ('warehouse', 'item')

    def __str__(self):
        return f'{self.item.name} @ {self.warehouse.name}: {self.quantity}'


class PendingStockItemRequest(CompanyOwnedModel):
    """
    Raised automatically when someone (typically a site engineer logging
    an ActivityMaterial) searches the catalog for something that
    doesn't exist yet. This is NOT a StockItem — it's a request that
    sits in a review queue until Main Store Manager (or a company-wide
    manager) approves it, at which point a real StockItem gets created
    and any ActivityMaterial rows waiting on it get linked automatically.

    Kept deliberately lightweight: just enough for the reviewer to
    correct a typo/unit/category and approve in bulk, not a full second
    catalog-entry form to fill in one at a time.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pending_stock_requests',
        help_text='The project this was requested from, if any.',
    )
    requested_name = models.CharField(max_length=255)
    suggested_unit = models.CharField(max_length=30, blank=True)
    suggested_category = models.CharField(
        max_length=20, choices=StockItem.CATEGORY_CHOICES, default='other',
    )
    quantity_requested = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    requested_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='stock_item_requests',
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    resolved_item = models.ForeignKey(
        StockItem, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_from_requests',
        help_text='Set once approved — the real catalog item this request became.',
    )
    reviewed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.requested_name} ({self.get_status_display()})'


class StockMovement(CompanyOwnedModel):
    """
    Every change to stock is recorded here — the audit trail. Receiving
    from a supplier, issuing to a project, or transferring between
    warehouses all create a StockMovement, which then updates the
    relevant StockLevel row(s).
    """
    MOVEMENT_TYPE_CHOICES = (
        ('receipt', 'Goods Received'),
        ('issue', 'Issued Out'),
        ('transfer_out', 'Transfer Out'),
        ('transfer_in', 'Transfer In'),
        ('adjustment', 'Stock Adjustment'),
    )

    movement_type = models.CharField(max_length=15, choices=MOVEMENT_TYPE_CHOICES)
    item = models.ForeignKey(StockItem, on_delete=models.PROTECT, related_name='movements')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='movements')
    quantity = models.DecimalField(max_digits=14, decimal_places=2)

    related_warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='related_movements',
        help_text='For transfers: the other warehouse involved.',
    )
    reference = models.CharField(
        max_length=100, blank=True,
        help_text='e.g. a Purchase Request code or delivery note number.',
    )
    unit_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Cost per unit for THIS movement. Falls back to item.standard_cost '
                   'if not set. Only meaningful for movement_type=\'issue\'.',
    )
    budget_line = models.ForeignKey(
        'budget.BudgetLine', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='stock_movements',
        help_text='Which budget line this movement\'s cost applies to. Only used '
                   'for movement_type=\'issue\' — see apps.integrations.',
    )
    performed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='stock_movements',
    )
    notes = models.CharField(max_length=255, blank=True)

    # For transfer_out/transfer_in pairs created together — lets a reversal
    # find and undo both sides correctly instead of guessing by timestamp.
    paired_movement = models.OneToOneField(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='paired_movement_rev',
    )
    # Set on a NEW movement that undoes an OLDER one. A movement can only
    # be reversed once (checked in the view), and a reversal itself can't
    # be reversed — that would just be "doing the original thing again",
    # which the user can do by creating a fresh movement instead.
    reverses = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reversed_by',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_movement_type_display()} — {self.item.name} ({self.quantity})'


class StockRestockRequest(CompanyOwnedModel):
    """
    Raised by a storekeeper who's running low on something that already
    exists in the catalog. Two-step lifecycle, mirroring PurchaseRequest's
    delivered-vs-received split:

      pending -> in_transit (dispatch: stock leaves source, transfer_out
                 movement created) -> received (receipt: stock lands at
                 destination, transfer_in movement created) -> rejected
                 (only reachable from pending)

    Previously this was a single 'approved' step that moved stock both
    ways atomically — no gap for "it's on the truck but hasn't arrived."
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('received', 'Received'),
        ('rejected', 'Rejected'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE,
        related_name='restock_requests',
        help_text='The project whose store needs restocking.',
    )
    item = models.ForeignKey(
        StockItem, on_delete=models.PROTECT, related_name='restock_requests',
        help_text='Must already exist in the catalog — this is not for new items.',
    )
    quantity_requested = models.DecimalField(max_digits=14, decimal_places=2)
    source_warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='outgoing_restock_requests',
        help_text='Where the stock should come from. Left blank to let the '
                   'dispatcher decide (defaults to Main Warehouse in that case).',
    )
    notes = models.CharField(
        max_length=255, blank=True,
        help_text='Optional context from the requester, e.g. "need by Friday".',
    )
    requested_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True,
        related_name='restock_requests',
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')

    # --- Dispatch leg (pending -> in_transit) ---
    dispatched_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    dispatched_at = models.DateTimeField(null=True, blank=True)
    dispatch_notes = models.CharField(max_length=255, blank=True)
    resulting_movement = models.OneToOneField(
        StockMovement, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='restock_request',
        help_text='The transfer_out movement created on dispatch.',
    )

    # --- Receipt leg (in_transit -> received) ---
    received_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    received_at = models.DateTimeField(null=True, blank=True)
    receipt_movement = models.OneToOneField(
        StockMovement, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='restock_request_receipt',
        help_text='The transfer_in movement created on receipt.',
    )

    # --- Rejection (pending -> rejected only) ---
    reviewed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.item.name} x{self.quantity_requested} for {self.project} ({self.get_status_display()})'