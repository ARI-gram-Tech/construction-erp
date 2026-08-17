# apps/integrations/services.py
"""
Idempotent sync functions — safe to call from a signal on every save,
since each checks whether it already wrote a CostTransaction for this
source before writing another. That matters because a Django post_save
signal fires on every .save() call, not just the one where a status
"actually changed" — e.g. re-saving an already-approved PurchaseRequest
for an unrelated reason would otherwise create a duplicate transaction.
"""
from apps.budget.models import CostTransaction


def sync_committed_cost_for_purchase_request(pr):
    """
    Books the full estimated_total as 'committed' the moment a
    PurchaseRequest reaches status='approved' — not on creation, not on
    any intermediate tier, matching the "committed = approved, not just
    requested" convention. No-ops if the PR isn't linked to a
    budget_line, since there's nothing to attribute the cost to.

    KNOWN LIMITATION: this never relieves the committed amount when
    actual costs land later (e.g. from goods received or an invoice).
    A production system would reduce committed as actual spend
    replaces it, to avoid Budget vs Actual double-counting the same
    money. That relief logic isn't built yet — noted here rather than
    silently shipped as if it were solved.
    """
    if pr.status != 'approved':
        return
    if pr.budget_line_id is None:
        return

    already_recorded = CostTransaction.objects.filter(
        source_type='procurement', source_reference=pr.code,
    ).exists()
    if already_recorded:
        return

    CostTransaction.objects.create(
        budget_line=pr.budget_line,
        transaction_type='committed',
        source_type='procurement',
        source_reference=pr.code,
        amount=pr.estimated_total,
        description=f'Purchase Request approved: {pr.title}',
    )


def sync_actual_cost_for_stock_movement(movement):
    """
    Books 'actual' cost only for movement_type='issue' (material
    genuinely leaving a warehouse for use) with both a budget_line and
    a resolvable unit_cost. No-ops otherwise — plenty of issues won't
    be tied to project cost tracking at all (e.g. issuing tools that
    get returned, or issues from a warehouse with no budget_line
    supplied on the request).

    unit_cost resolution: prefers movement.unit_cost (set explicitly at
    issue time); falls back to movement.item.standard_cost. If neither
    is available, skips rather than guessing a cost.
    """
    if movement.movement_type != 'issue':
        return
    if movement.budget_line_id is None:
        return

    unit_cost = movement.unit_cost or movement.item.standard_cost
    if not unit_cost:
        return

    source_reference = f'STK-{movement.id}'
    already_recorded = CostTransaction.objects.filter(
        source_type='inventory', source_reference=source_reference,
    ).exists()
    if already_recorded:
        return

    amount = unit_cost * movement.quantity
    CostTransaction.objects.create(
        budget_line=movement.budget_line,
        transaction_type='actual',
        source_type='inventory',
        source_reference=source_reference,
        amount=amount,
        description=f'Material issued: {movement.item.name} x {movement.quantity}',
    )