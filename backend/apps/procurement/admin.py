from django.contrib import admin
from .models import PurchaseRequest, PurchaseRequestItem


class PurchaseRequestItemInline(admin.TabularInline):
    model = PurchaseRequestItem
    extra = 1
    fields = ('description', 'quantity', 'unit', 'estimated_unit_cost', 'notes')


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = (
        'code', 'title', 'project', 'requested_by', 'priority', 'status',
        'required_date',
    )
    list_filter = ('status', 'priority', 'project__company')
    search_fields = ('code', 'title', 'requested_by__email', 'project__name')
    readonly_fields = ('code',)
    inlines = [PurchaseRequestItemInline]