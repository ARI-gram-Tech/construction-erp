# apps/variations/admin.py
from django.contrib import admin

from .models import Variation, InterimPaymentCertificate


@admin.register(Variation)
class VariationAdmin(admin.ModelAdmin):
    list_display = ('number', 'title', 'project', 'cost_impact', 'time_impact_days', 'status', 'decided_by')
    list_filter = ('status',)
    search_fields = ('title', 'project__name')


@admin.register(InterimPaymentCertificate)
class InterimPaymentCertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_number', 'project', 'period_start', 'period_end', 'net_payable', 'status')
    list_filter = ('status',)
    search_fields = ('project__name',)
    readonly_fields = (
        'previous_gross_certified', 'retention_amount', 'amount_after_retention',
        'vat_amount', 'gross_amount', 'net_payable',
    )