# apps/planning/models.py
"""
Phase 7 — Planning & Scheduling.

Activities belong to a Project. depends_on lets the frontend draw simple
dependency arrows on the Gantt view later, without needing a separate
dependency-graph table yet. ProgressUpdate is kept separate from
Activity.percent_complete so there's a real history of who changed what
and when, not just the current snapshot.
"""
from django.db import models
from django.utils import timezone
from apps.common.models import TimeStampedModel


class Activity(TimeStampedModel):
    STATUS_CHOICES = [
        ('not_started', 'Not started'),
        ('in_progress', 'In progress'),
        ('delayed', 'Delayed'),
        ('completed', 'Completed'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='activities'
    )
    # --- Recycle bin fields ---
    # Deleting an Activity/WBS section is a soft delete: it drops out of
    # the live plan but isn't destroyed. Recoverable for 30 days. A future
    # phase adds PM approval before the delete lands here, and an admin-PIN
    # step to permanently empty the bin — not built yet, this is the
    # foundation for that.
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )
    wbs = models.ForeignKey(
        'WBS', on_delete=models.SET_NULL, null=True, blank=True, related_name='activities'
    )
    code = models.CharField(max_length=30, blank=True, help_text='e.g. A1010')
    name = models.CharField(max_length=255)
    responsible = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='responsible_activities',
    )
    planned_start = models.DateField()
    planned_end = models.DateField()
    actual_start = models.DateField(null=True, blank=True)
    actual_end = models.DateField(null=True, blank=True)
    percent_complete = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    depends_on = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='blocks'
    )

    class Meta:
        ordering = ['planned_start']

    def __str__(self):
        return f'{self.name} ({self.project.name})'

    PLANNING_STATUS_CHOICES = [
        ('not_planned', 'Not Planned'),
        ('in_progress', 'Planning In Progress'),
        ('submitted', 'Submitted for Approval'),
        ('approved', 'Approved for Execution'),
        ('changes_requested', 'Changes Requested'),
    ]

    # Who's responsible for FILLING IN materials/labour/equipment/
    # requirements — deliberately separate from `responsible` (who
    # executes it on site). A company without a dedicated Site
    # Engineer role can assign this to anyone; assignment is what
    # grants planning access, not the person's company-wide role.
    assigned_planner = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='activities_to_plan',
    )
    planning_status = models.CharField(
        max_length=20, choices=PLANNING_STATUS_CHOICES, default='not_planned'
    )
    planning_submitted_at = models.DateTimeField(null=True, blank=True)

    pm_approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    pm_approved_at = models.DateTimeField(null=True, blank=True)
    qs_approved_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    qs_approved_at = models.DateTimeField(null=True, blank=True)
    qs_budget_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        help_text='QS-confirmed budget for this activity\'s planned resources.',
    )
    changes_requested_note = models.TextField(blank=True)

    def recompute_planning_readiness(self):
        """
        Derives an overall readiness signal from all applicable
        RequirementGroups. Doesn't replace planning_status yet (that
        still drives the existing submit/approve flow) — this is
        additive, callable from anywhere a group changes, and is what
        the new Requirements-tab UI reads.
        """
        groups = self.requirement_groups.exclude(status=RequirementGroup.STATUS_NOT_REQUIRED)
        if not groups.exists():
            return 'no_groups_assigned'
        statuses = set(groups.values_list('status', flat=True))
        if statuses == {RequirementGroup.STATUS_APPROVED}:
            return 'ready'
        if RequirementGroup.STATUS_CHANGES_REQUESTED in statuses:
            return 'blocked'
        return 'planning_incomplete'


class Milestone(TimeStampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('achieved', 'Achieved'),
        ('missed', 'Missed'),
    ]

    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='milestones'
    )
    name = models.CharField(max_length=255)
    target_date = models.DateField()
    achieved_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    class Meta:
        ordering = ['target_date']

    def __str__(self):
        return f'{self.name} ({self.project.name})'


class ProgressUpdate(TimeStampedModel):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='updates')
    updated_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    percent_complete = models.PositiveSmallIntegerField()
    notes = models.TextField(blank=True)
    progress_date = models.DateField(
        default=timezone.localdate,
        help_text='The day this progress reflects — may differ from created_at if backfilled.'
    )

    class Meta:
        ordering = ['-progress_date', '-created_at']

    def __str__(self):
        return f'{self.activity.name} — {self.percent_complete}% on {self.progress_date}'    

class WBS(TimeStampedModel):
    """
    Work Breakdown Structure — the hierarchy Activities attach to.
    parent=null means a top-level node (e.g. "Foundations").
    order controls display sequence within the same parent, for manual
    reordering without renumbering everything.
    """
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='wbs_nodes'
    )
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True, related_name='children'
    )
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=255)
    order = models.IntegerField(default=0)
    # --- Recycle bin fields — same soft-delete pattern as Activity ---
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )

    class Meta:
        ordering = ['order', 'code']

    def __str__(self):
        return f'{self.code} {self.name}'


class ProjectBaseline(TimeStampedModel):
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='baselines'
    )
    name = models.CharField(max_length=255)
    remarks = models.TextField(blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.project.name})'


class BaselineActivity(TimeStampedModel):
    """
    Frozen copy of one activity's schedule at the moment a baseline was
    taken. `activity` is nullable+SET_NULL so if the real Activity is later
    deleted, this snapshot row survives — history should never disappear.
    `name` is denormalized for the same reason (activity could be renamed).
    """
    baseline = models.ForeignKey(
        ProjectBaseline, on_delete=models.CASCADE, related_name='snapshot_activities'
    )
    activity = models.ForeignKey(
        Activity, on_delete=models.SET_NULL, null=True, related_name='baseline_snapshots'
    )
    name = models.CharField(max_length=255)
    planned_start = models.DateField()
    planned_end = models.DateField()
    status_at_snapshot = models.CharField(max_length=20, choices=Activity.STATUS_CHOICES)

    class Meta:
        ordering = ['planned_start']


class RequirementGroup(TimeStampedModel):
    GROUP_MATERIALS = 'materials'
    GROUP_LABOUR = 'labour'
    GROUP_PLANT_EQUIPMENT = 'plant_equipment'
    GROUP_TOOLS = 'tools'
    GROUP_PPE_SAFETY = 'ppe_safety'
    GROUP_SERVICES = 'services'

    GROUP_TYPE_CHOICES = [
        (GROUP_MATERIALS, 'Materials'),
        (GROUP_LABOUR, 'Labour'),
        (GROUP_PLANT_EQUIPMENT, 'Plant & Equipment'),
        (GROUP_TOOLS, 'Tools'),
        (GROUP_PPE_SAFETY, 'PPE & Safety'),
        (GROUP_SERVICES, 'Services / Subcontracting'),
    ]

    STATUS_NOT_REQUIRED = 'not_required'
    STATUS_PENDING_ASSIGNMENT = 'pending_assignment'
    STATUS_ASSIGNED = 'assigned'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_SUBMITTED = 'submitted'
    STATUS_CHANGES_REQUESTED = 'changes_requested'
    STATUS_APPROVED = 'approved'

    STATUS_CHOICES = [
        (STATUS_NOT_REQUIRED, 'Not Required'),
        (STATUS_PENDING_ASSIGNMENT, 'Pending Assignment'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_CHANGES_REQUESTED, 'Changes Requested'),
        (STATUS_APPROVED, 'Approved'),
    ]

    activity = models.ForeignKey(
        Activity, on_delete=models.CASCADE, related_name='requirement_groups',
    )
    group_type = models.CharField(max_length=30, choices=GROUP_TYPE_CHOICES)

    responsible = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='requirement_groups_owned',
        help_text='Who is responsible for preparing this group\'s requirements.',
    )
    status = models.CharField(
        max_length=25, choices=STATUS_CHOICES, default=STATUS_PENDING_ASSIGNMENT,
    )

    required_on_site = models.DateField(
        null=True, blank=True,
        help_text='When this resource must physically be available on site.',
    )
    procurement_deadline = models.DateField(
        null=True, blank=True,
        help_text='Latest date Procurement must act by to hit required_on_site.',
    )

    # Store-readiness alert — separate from procurement. This is a
    # reminder to the PROJECT storekeeper (not main store) to have
    # already-approved materials physically ready on site in time.
    # PM sets how many days before required_on_site the alert fires;
    # if they never set it, the daily check falls back to 2 days.
    alert_days_before = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Days before required_on_site to alert the project storekeeper. Defaults to 2 if not set.',
    )
    alert_sent_at = models.DateTimeField(null=True, blank=True)

    reviewed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    class Meta:
        unique_together = ('activity', 'group_type')
        ordering = ['activity_id', 'group_type']

    def __str__(self):
        return f'{self.get_group_type_display()} — {self.activity.name}'

    ITEM_RELATED_NAME = {
        GROUP_MATERIALS: 'materials',
        GROUP_LABOUR: 'labour_items',
        GROUP_PLANT_EQUIPMENT: 'equipment_items',
        GROUP_TOOLS: 'tool_items',
        GROUP_PPE_SAFETY: 'ppe_items',
        GROUP_SERVICES: 'service_items',
    }

    def items_queryset(self):
        related_name = self.ITEM_RELATED_NAME[self.group_type]
        return getattr(self, related_name).all()

    def recompute_status_from_items(self):
        if self.status == self.STATUS_NOT_REQUIRED:
            return
        items = list(self.items_queryset())
        if not items:
            if self.status not in (self.STATUS_PENDING_ASSIGNMENT, self.STATUS_ASSIGNED):
                self.status = self.STATUS_ASSIGNED if self.responsible_id else self.STATUS_PENDING_ASSIGNMENT
                self.save(update_fields=['status'])
            return

        statuses = {i.review_status for i in items}
        if statuses == {'approved'}:
            new_status = self.STATUS_APPROVED
        elif 'changes_requested' in statuses:
            new_status = self.STATUS_CHANGES_REQUESTED
        elif statuses <= {'submitted', 'approved'}:
            new_status = self.STATUS_SUBMITTED
        else:
            new_status = self.STATUS_IN_PROGRESS

        if new_status != self.status:
            self.status = new_status
            self.save(update_fields=['status'])
            self.activity.recompute_planning_readiness()


class RequirementItemBase(TimeStampedModel):
    REVIEW_DRAFT = 'draft'
    REVIEW_SUBMITTED = 'submitted'
    REVIEW_CHANGES_REQUESTED = 'changes_requested'
    REVIEW_APPROVED = 'approved'
    REVIEW_CANCELLED = 'cancelled'

    REVIEW_STATUS_CHOICES = [
        (REVIEW_DRAFT, 'Draft'),
        (REVIEW_SUBMITTED, 'Submitted'),
        (REVIEW_CHANGES_REQUESTED, 'Changes Requested'),
        (REVIEW_APPROVED, 'Approved'),
        (REVIEW_CANCELLED, 'Cancelled'),
    ]

    quantity_required = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.CharField(max_length=255, blank=True)
    review_status = models.CharField(
        max_length=20, choices=REVIEW_STATUS_CHOICES, default=REVIEW_DRAFT,
    )
    revision_number = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )

    class Meta:
        abstract = True
        ordering = ['id']


class RequirementRevisionBase(TimeStampedModel):
    revision_number = models.PositiveIntegerField()
    quantity_required = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.CharField(max_length=255, blank=True)
    changed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='+',
    )
    reason = models.CharField(max_length=255, blank=True)
    status_at_time = models.CharField(max_length=20)

    class Meta:
        abstract = True
        ordering = ['-revision_number']


class ActivityMaterial(TimeStampedModel):
    """
    A material an Activity needs, referencing the company's real
    StockItem catalog (from apps.inventory). Once submitted, a batch of
    these can generate a real PurchaseRequest automatically — no
    retyping the same items into a separate form.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('requested', 'Requested'),
        ('fulfilled', 'Fulfilled'),
    ]

    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='materials')
    # Nullable now: a material can point at a real catalog StockItem, OR
    # sit on a pending_request while the catalog entry is being reviewed.
    # Exactly one of (item, pending_request) should be set at any time.
    item = models.ForeignKey(
        'inventory.StockItem', on_delete=models.PROTECT, null=True, blank=True,
        related_name='activity_requirements',
    )
    pending_request = models.ForeignKey(
        'inventory.PendingStockItemRequest', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='activity_materials',
        help_text='Set when this material was requested before the catalog item existed. '
                   'Cleared (item gets populated instead) once Main Store Manager approves it.',
    )
    quantity_required = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    purchase_request = models.ForeignKey(
        'procurement.PurchaseRequest', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='source_activity_materials',
        help_text='Set once this material has been rolled into a Purchase Request.',
    )
    notes = models.CharField(max_length=255, blank=True)
    group = models.ForeignKey(
        'RequirementGroup', on_delete=models.CASCADE, related_name='materials',
        null=True, blank=True,
    )
    review_status = models.CharField(
        max_length=20, choices=RequirementItemBase.REVIEW_STATUS_CHOICES,
        default=RequirementItemBase.REVIEW_DRAFT,
    )
    revision_number = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
        help_text='Who added this requirement — site execution roles can only remove their own entries.',
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.item.name} x{self.quantity_required} — {self.activity.name}'


class ActivityMaterialRevision(RequirementRevisionBase):
    material = models.ForeignKey(
        ActivityMaterial, on_delete=models.CASCADE, related_name='revisions',
    )

    def __str__(self):
        return f'{self.material} — rev {self.revision_number}'


class ActivityLabourRequirement(TimeStampedModel):
    """
    A labour need on an Activity — kept as free-text role + headcount for
    now, since there's no dedicated workforce/HR master-data app yet.
    """
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='labour_requirements')
    role = models.CharField(max_length=100, help_text='e.g. Mason, Carpenter, Steel Fixer.')
    quantity_required = models.PositiveIntegerField(help_text='Number of people needed.')
    notes = models.CharField(max_length=255, blank=True)
    group = models.ForeignKey(
        RequirementGroup, on_delete=models.CASCADE, related_name='labour_items',
        null=True, blank=True,
    )
    review_status = models.CharField(
        max_length=20, choices=RequirementItemBase.REVIEW_STATUS_CHOICES,
        default=RequirementItemBase.REVIEW_DRAFT,
    )
    revision_number = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.quantity_required} x {self.role} — {self.activity.name}'


class ActivityLabourRevision(RequirementRevisionBase):
    labour = models.ForeignKey(
        ActivityLabourRequirement, on_delete=models.CASCADE, related_name='revisions',
    )

    def __str__(self):
        return f'{self.labour} — rev {self.revision_number}'


class ActivityEquipmentRequirement(TimeStampedModel):
    """
    An equipment need on an Activity — free-text for now, since there's
    no dedicated Equipment/Fleet master-data app yet.
    """
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='equipment_requirements')
    equipment_name = models.CharField(max_length=150, help_text='e.g. Poker Vibrator, Concrete Mixer.')
    quantity_required = models.PositiveIntegerField(default=1)
    notes = models.CharField(max_length=255, blank=True)
    group = models.ForeignKey(
        RequirementGroup, on_delete=models.CASCADE, related_name='equipment_items',
        null=True, blank=True,
    )
    review_status = models.CharField(
        max_length=20, choices=RequirementItemBase.REVIEW_STATUS_CHOICES,
        default=RequirementItemBase.REVIEW_DRAFT,
    )
    revision_number = models.PositiveIntegerField(default=1)
    required_from = models.DateField(null=True, blank=True)
    required_until = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+',
    )

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.quantity_required} x {self.equipment_name} — {self.activity.name}'


class ActivityEquipmentRevision(RequirementRevisionBase):
    equipment = models.ForeignKey(
        ActivityEquipmentRequirement, on_delete=models.CASCADE, related_name='revisions',
    )

    def __str__(self):
        return f'{self.equipment} — rev {self.revision_number}'


class ActivityToolRequirement(RequirementItemBase):
    group = models.ForeignKey(
        RequirementGroup, on_delete=models.CASCADE, related_name='tool_items',
    )
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='tool_requirements')
    tool_name = models.CharField(max_length=150, help_text='e.g. Wheelbarrow, Shovel, Angle Grinder.')

    def __str__(self):
        return f'{self.quantity_required} x {self.tool_name} — {self.activity.name}'


class ActivityToolRevision(RequirementRevisionBase):
    tool = models.ForeignKey(
        ActivityToolRequirement, on_delete=models.CASCADE, related_name='revisions',
    )

    def __str__(self):
        return f'{self.tool} — rev {self.revision_number}'


class ActivityPPERequirement(RequirementItemBase):
    group = models.ForeignKey(
        RequirementGroup, on_delete=models.CASCADE, related_name='ppe_items',
    )
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='ppe_requirements')
    ppe_name = models.CharField(max_length=150, help_text='e.g. Helmet, Safety Boots, Harness.')

    def __str__(self):
        return f'{self.quantity_required} x {self.ppe_name} — {self.activity.name}'


class ActivityPPERevision(RequirementRevisionBase):
    ppe = models.ForeignKey(
        ActivityPPERequirement, on_delete=models.CASCADE, related_name='revisions',
    )

    def __str__(self):
        return f'{self.ppe} — rev {self.revision_number}'


class ActivityServiceRequirement(RequirementItemBase):
    group = models.ForeignKey(
        RequirementGroup, on_delete=models.CASCADE, related_name='service_items',
    )
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='service_requirements')
    service_name = models.CharField(max_length=150, help_text='e.g. Concrete Pumping, Scaffolding, Soil Testing.')
    provider_notes = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f'{self.service_name} — {self.activity.name}'


class ActivityServiceRevision(RequirementRevisionBase):
    service = models.ForeignKey(
        ActivityServiceRequirement, on_delete=models.CASCADE, related_name='revisions',
    )

    def __str__(self):
        return f'{self.service} — rev {self.revision_number}'