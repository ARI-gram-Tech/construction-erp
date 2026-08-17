# apps/variations/services/ipc_calc.py
"""
Pure calculation, no Django models touched — makes the money math
testable on its own and keeps the formula in exactly one place.

Standard interim-certificate sequence:
  1. Work done to date (cumulative gross)
  2. Less retention (%)                    -> amount after retention
  3. Add VAT (%) on the retained amount     -> gross amount payable to date
  4. Less amount already certified (previous cumulative gross)
  5. Less advance recovery
  = Net payable this certificate

This assumes VAT is charged on the amount AFTER retention is deducted
— that's the common convention, but confirm it matches your contracts'
actual terms before relying on this for a real payment run; some
contracts charge VAT on the full work-done amount before retention.
"""
from decimal import Decimal, ROUND_HALF_UP

TWO_PLACES = Decimal('0.01')


def _round(value):
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_ipc(work_done_amount, retention_percent, vat_percent, previous_gross_certified, advance_recovery_amount):
    work_done_amount = Decimal(work_done_amount)
    retention_percent = Decimal(retention_percent)
    vat_percent = Decimal(vat_percent)
    previous_gross_certified = Decimal(previous_gross_certified)
    advance_recovery_amount = Decimal(advance_recovery_amount)

    retention_amount = _round(work_done_amount * retention_percent / Decimal('100'))
    amount_after_retention = work_done_amount - retention_amount
    vat_amount = _round(amount_after_retention * vat_percent / Decimal('100'))
    gross_amount = amount_after_retention + vat_amount
    net_payable = gross_amount - previous_gross_certified - advance_recovery_amount

    return {
        'retention_amount': retention_amount,
        'amount_after_retention': amount_after_retention,
        'vat_amount': vat_amount,
        'gross_amount': gross_amount,
        'net_payable': net_payable,
    }