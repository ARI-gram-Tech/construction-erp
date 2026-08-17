# apps/budget/services/generate.py
"""
Turns a BOQ into a Budget: one BudgetLine per top-level BOQSection,
summing every BOQItem under that section (including nested
sub-sections) into `original_amount`. Items with no section, or under
a section whose top-level ancestor can't be resolved, land in a single
"Unallocated" line — nothing from the BOQ silently disappears.

Kept as a standalone function (not a viewset method) so it can be
called from a management command or a test without going through HTTP.
"""
from decimal import Decimal

from apps.boq.models import BOQSection, BOQItem
from ..models import Budget, BudgetLine

UNALLOCATED_TITLE = 'Unallocated'


def _top_level_ancestor(section):
    """Walks up parent links to find the top-level (parent=None) section."""
    while section.parent_id is not None:
        section = section.parent
    return section


def generate_budget_from_boq(boq, title, created_by):
    """
    Creates a new Budget + BudgetLines from `boq`'s current items.
    Does not touch the BOQ itself and does not delete any prior budget
    for this project — if you re-generate, you get a second Budget you
    can compare against or discard, never a silent overwrite.
    """
    budget = Budget.objects.create(
        project=boq.project,
        boq=boq,
        title=title,
        currency=boq.currency,
        status='draft',
        created_by=created_by,
    )

    top_sections = list(boq.sections.filter(parent__isnull=True))
    totals = {section.id: Decimal('0') for section in top_sections}
    unallocated_total = Decimal('0')

    all_sections = {s.id: s for s in boq.sections.all()}
    items = boq.items.select_related('section').all()

    for item in items:
        section = item.section
        if section is None:
            unallocated_total += item.amount
            continue
        top = _resolve_top_level(section, all_sections)
        if top is None or top.id not in totals:
            unallocated_total += item.amount
        else:
            totals[top.id] += item.amount

    lines = []
    for order, section in enumerate(top_sections):
        amount = totals[section.id]
        lines.append(BudgetLine(
            budget=budget,
            boq_section=section,
            title=section.title,
            original_amount=amount,
            approved_amount=amount,
            order=order,
        ))

    if unallocated_total > 0:
        lines.append(BudgetLine(
            budget=budget,
            boq_section=None,
            title=UNALLOCATED_TITLE,
            original_amount=unallocated_total,
            approved_amount=unallocated_total,
            order=len(top_sections),
        ))

    BudgetLine.objects.bulk_create(lines)
    return budget


def _resolve_top_level(section, all_sections):
    """
    Same as _top_level_ancestor() but works off a preloaded dict instead
    of hitting the DB for every parent lookup — matters once a BOQ has
    a few hundred items each triggering a section walk.
    """
    seen = set()
    current = section
    while current.parent_id is not None:
        if current.id in seen:
            return None  # defensive: broken/circular parent chain, don't loop forever
        seen.add(current.id)
        parent = all_sections.get(current.parent_id)
        if parent is None:
            return None
        current = parent
    return current