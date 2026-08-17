# apps/boq/services/ai_parser.py
"""
AI-assisted BOQ extraction for messy/scanned/unstructured documents
(PDF, images) that the deterministic grid parser (import_parser.py)
can't handle — there's no reliable column grid to map because there
is no reliable grid at all (scanned pages, merged cells, inconsistent
layouts, photographed pages).

This NEVER writes to the database and NEVER auto-imports. It only
produces the same row shape import_parser.validate_mapped_rows()
already knows how to validate, so preview, the error report, confirm,
and force-skip all behave identically regardless of whether a row
came from a spreadsheet column or an AI reading a scanned page. The
AI's self-reported per-row confidence is surfaced to the reviewer —
it never substitutes for the structural validation (unit resolves,
quantity/rate are numeric) that still runs on every row afterward.

Requires: pip install anthropic, and ANTHROPIC_API_KEY set in settings/env.
"""
import base64
import json

from django.conf import settings

AI_SUPPORTED_EXTENSIONS = ('.pdf', '.png', '.jpg', '.jpeg', '.webp')

SYSTEM_PROMPT = """You are extracting line items from a Bill of Quantities (BOQ) \
document for a construction company. The document may be a scanned PDF, a \
photographed page, or an unusually formatted spreadsheet export.

Return ONLY a JSON object, no prose, no markdown fences, in this exact shape:

{
  "rows": [
    {
      "item_code": "<string, may be empty>",
      "description": "<string, required>",
      "unit": "<string, e.g. m3, m2, kg, no, Ls>",
      "quantity": <number>,
      "rate": <number, or null if not present in the document>,
      "section": "<string, the section/division/trade heading this row falls under, or null>",
      "confidence": <number 0-100, your own confidence that this row was read correctly>
    }
  ],
  "overall_confidence": <number 0-100, your confidence in the extraction as a whole>,
  "notes": "<any warnings, e.g. 'page 3 was too blurry to read reliably'>"
}

Rules:
- Skip section/division heading rows themselves (e.g. "SECTION A - EARTHWORKS") — \
  instead attach that text as the "section" value for the item rows underneath it.
- If a value is genuinely absent from the source, use null rather than guessing.
- Do not invent item codes, rates, or quantities that aren't actually in the document.
- If the document is not a BOQ at all, return an empty "rows" list and explain why in "notes".
"""


def is_ai_required(filename):
    return (filename or '').lower().endswith(AI_SUPPORTED_EXTENSIONS)


def extract_via_ai(file_bytes, filename):
    """
    Calls the Anthropic API with the document as a base64 attachment
    and returns the parsed {"rows": [...], "overall_confidence": ...,
    "notes": ...} dict.

    Raises ValueError with a user-facing message on any failure (bad
    response shape, missing API key, unparseable JSON) — callers
    should surface that as a 400/502, never silently import nothing.
    """
    try:
        import anthropic
    except ImportError:
        raise ValueError('AI import requires the "anthropic" package: pip install anthropic')

    api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY is not configured on the server.')

    client = anthropic.Anthropic(api_key=api_key)

    name = (filename or '').lower()
    if name.endswith('.pdf'):
        content_block = {
            'type': 'document',
            'source': {
                'type': 'base64',
                'media_type': 'application/pdf',
                'data': base64.b64encode(file_bytes).decode('utf-8'),
            },
        }
    else:
        media_type = 'image/png' if name.endswith('.png') else 'image/jpeg'
        content_block = {
            'type': 'image',
            'source': {
                'type': 'base64',
                'media_type': media_type,
                'data': base64.b64encode(file_bytes).decode('utf-8'),
            },
        }

    # Model choice: check docs.claude.com for the current recommended
    # model before deploying — this is a reasonable default balance of
    # accuracy vs. cost for document extraction, not a hardcoded
    # requirement. Swap freely.
    try:
        message = client.messages.create(
            model='claude-sonnet-5',
            max_tokens=8000,
            system=SYSTEM_PROMPT,
            messages=[{
                'role': 'user',
                'content': [
                    content_block,
                    {'type': 'text', 'text': 'Extract the BOQ line items from this document as instructed.'},
                ],
            }],
        )
    except anthropic.APIStatusError as e:
        # The SDK raises its own exception types (APIStatusError,
        # APIConnectionError, etc.) — these are NOT ValueError, so an
        # `except ValueError` around the call site never catches them
        # and the request 500s instead of failing gracefully. Convert
        # every failure mode into a ValueError with a message the
        # frontend can actually act on (e.g. offer "store as reference
        # instead" when the account is out of credits).
        body_message = ''
        if isinstance(e.body, dict):
            body_message = (e.body.get('error') or {}).get('message', '')
        if 'credit balance' in body_message.lower():
            raise ValueError(
                'AI import is temporarily unavailable — the AI service account is out of '
                'credits. You can still import this file using manual column mapping '
                '(if it\'s a spreadsheet), or store it as a reference document.'
            )
        raise ValueError(f'AI import failed: {body_message or str(e)}')
    except anthropic.APIConnectionError:
        raise ValueError('Could not reach the AI service. Check your connection and try again.')

    raw_text = ''.join(block.text for block in message.content if getattr(block, 'type', None) == 'text')

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        # Occasionally wraps JSON in fences despite instructions not to — one cleanup retry.
        cleaned = raw_text.strip().strip('`')
        if cleaned.startswith('json'):
            cleaned = cleaned[4:].strip()
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            raise ValueError('AI response was not valid JSON. Try again, or use manual mapping instead.')

    if 'rows' not in parsed:
        raise ValueError('AI response was missing the expected "rows" field.')

    return parsed


def ai_rows_to_mapped_rows(ai_rows):
    """
    Converts the AI's row shape into the same mapped-row shape
    import_parser._map_row() produces from a spreadsheet, so
    validate_mapped_rows() handles both paths identically.
    """
    return [
        {
            'item_code': row.get('item_code') or '',
            'description': row.get('description') or '',
            'unit': row.get('unit') or '',
            'quantity': row.get('quantity'),
            'rate': row.get('rate'),
            'section': row.get('section'),
            '_ai_confidence': row.get('confidence'),
        }
        for row in ai_rows
    ]