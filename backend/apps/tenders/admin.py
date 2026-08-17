from django.contrib import admin

from .models import Tender, TenderBOQSection, TenderBOQItem


class TenderBOQItemInline(admin.TabularInline):
    model = TenderBOQItem
    extra = 0
    fields = ('item_code', 'description', 'unit', 'quantity', 'rate', 'section')


@admin.register(Tender)
class TenderAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'mode', 'status', 'assigned_qs', 'closing_date', 'created_at')
    list_filter = ('mode', 'status', 'company')
    search_fields = ('title', 'client_name')
    inlines = [TenderBOQItemInline]


admin.site.register(TenderBOQSection)