# apps/boq/services/import_commit.py
"""
Takes the validated rows from import_parser.validate_rows() and writes
them to the database as BOQSection/BOQItem records. Kept separate from
validation so "show me what would happen" (preview) and "actually do
it" (confirm) can never accidentally share a code path.
"""
from ..models import BOQSection, BOQItem


def commit_import(boq, valid_rows):
    """
    Groups rows by `section_title` into flat, top-level BOQSections.
    Import produces one level of grouping, not a nested tree — a real
    multi-level hierarchy needs indentation/outline data most
    spreadsheets don't cleanly expose. Nested import is a Module 5+
    problem once AI parsing can infer structure, not a Module 2 one.
    Rows with no section_title land directly on the BOQ with no section.
    """
    section_cache = {}

    def get_section(title):
        if title is None:
            return None
        if title not in section_cache:
            section_cache[title], _ = BOQSection.objects.get_or_create(
                boq=boq, parent=None, title=title,
            )
        return section_cache[title]

    items = [
        BOQItem(
            boq=boq,
            section=get_section(row['section_title']),
            item_code=row['item_code'],
            description=row['description'],
            unit=row['unit'],
            quantity=row['quantity'],
            rate=row['rate'],
        )
        for row in valid_rows
    ]
    BOQItem.objects.bulk_create(items)
    return len(items)