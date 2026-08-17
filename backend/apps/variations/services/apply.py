# apps/variations/services/apply.py
"""
The one sanctioned way to change a locked Budget's approved_amount.
apps.budget.views blocks direct edits to BudgetLine.approved_amount
once the parent Budget is locked — this function is deliberately the
exception, called only from Variation.approve() in views.py, never
from a raw PATCH endpoint.
"""


def apply_variation(variation):
    """
    No-op if the variation isn't tied to a specific budget_line — a
    variation can exist purely as a record (e.g. time-impact-only, or
    not yet allocated to a line) without touching any budget figures.
    """
    if variation.budget_line_id is None:
        return

    line = variation.budget_line
    line.approved_amount = line.approved_amount + variation.cost_impact
    line.save(update_fields=['approved_amount'])