# apps/boq/services/import_parser.py
"""
Pure functions for turning an uploaded Excel/CSV file into a raw grid,
suggesting a column mapping, and validating+converting mapped rows into
BOQItem-ready dicts. Kept framework-light (no request/response objects)
so it's testable on its own and reusable from Module 5's AI import later
— AI import just needs to produce the same `column_mapping` shape and
can call `build_preview()` / `validate_rows()` unchanged.
"""
import csv
import io
from decimal import Decimal, InvalidOperation

import openpyxl

TARGET_FIELDS = ['item_code', 'description', 'unit', 'quantity', 'rate', 'section']

# Keyword hints used for auto-suggesting a mapping from header text.
# Checked in order; first match wins per header cell.
FIELD_HINTS = {
    'item_code': ['code', 'ref', 'item no', 'item number'],
    'description': ['description', 'desc', 'particular', 'item description'],
    'unit': ['unit', 'uom'],
    'quantity': ['qty', 'quantity'],
    'rate': ['rate', 'price', 'unit price', 'unit rate'],
    'section': ['section', 'division', 'trade', 'category'],
}


def extract_grid(file_obj, filename):
    """
    Returns a raw list-of-lists grid from an uploaded .xlsx or .csv file.
    Does NOT assume row 0 is the header — some BOQs have title rows above
    the real header, so header detection happens separately.
    """
    name = (filename or '').lower()

    if name.endswith('.csv'):
        content = file_obj.read()
        if isinstance(content, bytes):
            content = content.decode('utf-8-sig', errors='replace')
        reader = csv.reader(io.StringIO(content))
        return [row for row in reader]

    if name.endswith('.xlsx'):
        wb = openpyxl.load_workbook(file_obj, data_only=True)
        ws = wb.active
        return [
            ['' if cell is None else cell for cell in row]
            for row in ws.iter_rows(values_only=True)
        ]

    raise ValueError(f'Unsupported file type: {filename}. Only .xlsx and .csv are supported.')


def guess_header_row(grid, max_scan=10):
    """
    Scans the first `max_scan` rows for the one most likely to be a real
    header — the row with the most cells matching a known field hint.
    Falls back to row 0 if nothing scores above zero (common for BOQs
    with no recognizable header row at all).
    """
    best_index, best_score = 0, -1
    for i, row in enumerate(grid[:max_scan]):
        score = sum(
            1 for cell in row
            if any(hint in str(cell).lower() for hints in FIELD_HINTS.values() for hint in hints)
        )
        if score > best_score:
            best_index, best_score = i, score
    return best_index


def suggest_mapping(header_row):
    """
    Maps each TARGET_FIELD to a column index in `header_row`, or None if
    no header cell matched. Always returns all TARGET_FIELDS as keys so
    the frontend can render a picker for every field, mapped or not.
    """
    mapping = {field: None for field in TARGET_FIELDS}
    for col_index, cell in enumerate(header_row):
        cell_text = str(cell).lower().strip()
        for field, hints in FIELD_HINTS.items():
            if mapping[field] is None and any(hint in cell_text for hint in hints):
                mapping[field] = col_index
    return mapping


def build_preview(grid, header_row_index, mapping, limit=20):
    """
    Applies `mapping` (field -> column index) to the data rows (rows
    after the header) and returns up to `limit` mapped dict rows for
    the user to eyeball before committing to anything.
    """
    data_rows = grid[header_row_index + 1:]
    return [_map_row(row, mapping) for row in data_rows[:limit]]


def _map_row(row, mapping):
    mapped = {}
    for field, col_index in mapping.items():
        if col_index is None or col_index >= len(row):
            mapped[field] = None
        else:
            mapped[field] = row[col_index]
    return mapped


def validate_rows(grid, header_row_index, mapping, unit_lookup):
    """
    Converts every data row into either a valid BOQItem-ready dict or an
    error entry. Nothing is written to the DB here — this is pure
    validation so the caller can show a full error report before the
    user commits to anything.

    unit_lookup: dict of {lowercased unit code: Unit instance}, passed
    in so this function doesn't need to import Django models directly.

    Returns (valid_rows, errors) — see validate_mapped_rows() for the
    exact shape. This function just handles the grid->mapped_row step
    before delegating; the AI import path builds mapped_rows a
    different way (see ai_parser.ai_rows_to_mapped_rows) and calls
    validate_mapped_rows() directly, so both paths share one set of
    correctness rules.
    """
    missing = [f for f in ('description', 'quantity', 'rate', 'unit') if mapping.get(f) is None]
    if missing:
        raise ValueError(f"These required columns aren't mapped yet: {', '.join(missing)}")

    data_rows = grid[header_row_index + 1:]
    mapped_rows = [_map_row(row, mapping) for row in data_rows]
    return validate_mapped_rows(mapped_rows, unit_lookup)


def validate_mapped_rows(mapped_rows, unit_lookup):
    """
    Same validation rules as validate_rows(), but takes already-mapped
    row dicts directly — used by both the grid path (after column
    mapping is applied) and the AI import path (whose rows never went
    through column-index mapping in the first place).

    Each input row may optionally carry '_ai_confidence' (0-100); if
    present, it's carried through onto valid rows as 'ai_confidence'
    so the review UI can show it, but it never affects validity —
    a low-confidence row that's structurally correct still passes,
    and a high-confidence row with a bad unit still fails.

    Returns (valid_rows, errors) where:
      valid_rows = [{item_code, description, unit, quantity, rate,
                      section_title, ai_confidence}, ...]
      errors = [{row_number, reason}, ...]  (row_number is 1-based,
                counting data rows only)
    """
    valid_rows = []
    errors = []

    for i, mapped in enumerate(mapped_rows, start=1):
        description = str(mapped.get('description') or '').strip()
        if not description:
            continue  # silently skip fully blank trailing rows

        row_errors = []

        quantity = _to_decimal(mapped.get('quantity'))
        if quantity is None:
            row_errors.append(f"quantity '{mapped.get('quantity')}' is not a number")

        rate = _to_decimal(mapped.get('rate'))
        if rate is None:
            row_errors.append(f"rate '{mapped.get('rate')}' is not a number")

        unit_code = str(mapped.get('unit') or '').strip().lower()
        unit = unit_lookup.get(unit_code)
        if unit is None:
            row_errors.append(f"unit '{mapped.get('unit')}' not recognized")

        if row_errors:
            errors.append({'row_number': i, 'reason': '; '.join(row_errors)})
            continue

        valid_rows.append({
            'item_code': str(mapped.get('item_code') or '').strip(),
            'description': description,
            'unit': unit,
            'quantity': quantity,
            'rate': rate,
            'section_title': str(mapped.get('section') or '').strip() or None,
            'ai_confidence': mapped.get('_ai_confidence'),
        })

    return valid_rows, errors


def _to_decimal(value):
    if value is None or value == '':
        return None
    try:
        return Decimal(str(value).replace(',', '').strip())
    except (InvalidOperation, ValueError, TypeError):
        return None