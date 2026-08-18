# backend/apps/procurement/services/lpo_pdf.py
"""
Renders an LPO to PDF using reportlab (Platypus). Called from
LPOViewSet.pdf() and from _email_lpo_to_supplier() once digitally-
approved LPOs need a real attachment too.
"""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def generate_lpo_pdf(lpo):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('LPOTitle', parent=styles['Title'], fontSize=16, spaceAfter=2)
    small = ParagraphStyle('Small', parent=styles['Normal'], fontSize=9, leading=12)
    bold_small = ParagraphStyle('BoldSmall', parent=small, fontName='Helvetica-Bold')

    story = []

    # --- Header: company info + LPO code/date ---
    story.append(Paragraph(lpo.company_name, title_style))
    company_lines = [lpo.company_address, lpo.company_po_box, lpo.company_phone, lpo.company_email]
    for line in filter(None, company_lines):
        story.append(Paragraph(line, small))
    story.append(Spacer(1, 10 * mm))

    story.append(Paragraph(f'LOCAL PURCHASE ORDER — {lpo.code}', bold_small))
    story.append(Paragraph(f'Date: {lpo.created_at.strftime("%d %B %Y")}', small))
    story.append(Spacer(1, 4 * mm))

    # --- Supplier block ---
    story.append(Paragraph('To:', bold_small))
    story.append(Paragraph(lpo.supplier_name, small))
    for line in filter(None, [lpo.supplier_address, lpo.supplier_phone, lpo.supplier_email]):
        story.append(Paragraph(line, small))
    story.append(Spacer(1, 8 * mm))

    # --- Items table ---
    header = ['#', 'Description', 'Unit', 'Qty', 'Rate', 'Amount']
    rows = [header]
    for i, item in enumerate(lpo.items.all(), start=1):
        rows.append([
            str(i), item.description, item.unit or '',
            f'{item.quantity:,.2f}', f'{item.rate:,.2f}', f'{item.amount:,.2f}',
        ])

    table = Table(rows, colWidths=[10 * mm, 70 * mm, 20 * mm, 25 * mm, 25 * mm, 30 * mm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))
    story.append(table)
    story.append(Spacer(1, 6 * mm))

    # --- Totals ---
    totals_rows = [['Subtotal', f'{lpo.subtotal:,.2f}']]
    if lpo.vat_applicable:
        totals_rows.append([f'VAT ({lpo.vat_percent}%)', f'{lpo.vat_amount:,.2f}'])
    else:
        totals_rows.append(['VAT', 'N/A'])
    totals_rows.append(['TOTAL', f'{lpo.total:,.2f}'])

    totals_table = Table(totals_rows, colWidths=[130 * mm, 50 * mm])
    totals_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 0.75, colors.black),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 14 * mm))

    # --- Signature / authorization block ---
    if lpo.signature_mode == 'digital' and lpo.digitally_approved_by_id:
        story.append(Paragraph(
            f'Digitally approved by {lpo.digitally_approved_by.get_full_name()} '
            f'on {lpo.digitally_approved_at.strftime("%d %B %Y, %H:%M")}.',
            bold_small,
        ))
    elif lpo.signature_mode == 'wet_ink':
        story.append(Paragraph(
            'This order is valid only when accompanied by an authorized signature. '
            'See attached signed copy.',
            small,
        ))
    else:
        story.append(Paragraph(
            'This order is not yet authorized — pending signature.',
            small,
        ))

    doc.build(story)
    buffer.seek(0)
    return buffer