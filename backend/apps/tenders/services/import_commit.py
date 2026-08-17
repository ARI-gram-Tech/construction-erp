"""
Mirrors apps.boq.services.import_commit exactly, but writes into
TenderBOQSection/TenderBOQItem instead of BOQSection/BOQItem. Kept
separate for the same reason the original is separate from
views_import.py: "show what would happen" (preview) and "actually do
it" (confirm) must never share a code path.
"""
from ..models import TenderBOQSection, TenderBOQItem


def commit_import(tender, valid_rows):
    """
    Groups rows by `section_title` into flat, top-level
    TenderBOQSections. Same one-level-of-grouping limitation as the
    real BOQ importer — a full nested hierarchy needs indentation data
    most spreadsheets don't cleanly expose.

    Note: valid_rows come from apps.boq.services.import_parser /
    ai_parser, which resolve `unit` to an apps.boq.Unit INSTANCE (see
    import_parser.validate_mapped_rows). TenderBOQItem.unit is a plain
    CharField, not a FK — so here we take `unit.code`, not the Unit
    object itself.
    """
    section_cache = {}

    def get_section(title):
        if title is None:
            return None
        if title not in section_cache:
            section_cache[title], _ = TenderBOQSection.objects.get_or_create(
                tender=tender, parent=None, title=title,
            )
        return section_cache[title]

    items = [
        TenderBOQItem(
            tender=tender,
            section=get_section(row['section_title']),
            item_code=row['item_code'],
            description=row['description'],
            unit=row['unit'].code,
            quantity=row['quantity'],
            rate=row['rate'],
        )
        for row in valid_rows
    ]
    TenderBOQItem.objects.bulk_create(items)
    return len(items)