# apps/variations/services/ipc_pdf.py
"""
Renders an issued InterimPaymentCertificate as a PDF. Uses reportlab
rather than WeasyPrint/wkhtmltopdf deliberately — reportlab is pure
Python with no system-level binary dependency, which matters a lot on
a Windows dev machine where GTK/Cairo installs for WeasyPrint are a
known pain. Requires: pip install reportlab
"""
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_RIGHT


def generate_ipc_pdf(ipc):
    """
    Returns a BytesIO buffer containing the rendered PDF. Caller is
    responsible for wrapping it in an HTTP response with the right
    content type and filename.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('IPCTitle', parent=styles['Title'], fontSize=16, spaceAfter=4)
    normal = styles['Normal']
    right_align = ParagraphStyle('RightAlign', parent=normal, alignment=TA_RIGHT)

    elements = []

    elements.append(Paragraph(f'Interim Payment Certificate No. {ipc.certificate_number}', title_style))
    elements.append(Paragraph(ipc.project.name, styles['Heading3']))
    elements.append(Spacer(1, 4 * mm))

    meta_table = Table([
        ['Period', f'{ipc.period_start} to {ipc.period_end}'],
        ['Status', ipc.get_status_display()],
        ['Issued', ipc.issued_at.strftime('%Y-%m-%d') if ipc.issued_at else '—'],
    ], colWidths=[40 * mm, 120 * mm])
    meta_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 8 * mm))

    currency = ipc.budget.currency if ipc.budget else ''

    def money(value):
        return f'{currency} {value:,.2f}'.strip()

    rows = [
        ['Description', 'Amount'],
        ['Work done to date (cumulative, gross)', money(ipc.work_done_amount)],
        [f'Less retention @ {ipc.retention_percent}%', f'({money(ipc.retention_amount)})'],
        ['Amount after retention', money(ipc.amount_after_retention)],
        [f'Add VAT @ {ipc.vat_percent}%', money(ipc.vat_amount)],
        ['Gross amount payable to date', money(ipc.gross_amount)],
        ['Less previously certified', f'({money(ipc.previous_gross_certified)})'],
        ['Less advance recovery', f'({money(ipc.advance_recovery_amount)})'],
        ['NET PAYABLE THIS CERTIFICATE', money(ipc.net_payable)],
    ]

    table = Table(rows, colWidths=[110 * mm, 50 * mm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2b2b2b')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.grey),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#eeeeee')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f7f7f7')]),
    ]))
    elements.append(table)

    if ipc.notes:
        elements.append(Spacer(1, 8 * mm))
        elements.append(Paragraph('Notes', styles['Heading4']))
        elements.append(Paragraph(ipc.notes, normal))

    doc.build(elements)
    buffer.seek(0)
    return buffer