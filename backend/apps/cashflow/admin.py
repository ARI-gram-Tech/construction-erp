from django.contrib import admin
from .models import CashFlowPlan, CashFlowEntry


class CashFlowEntryInline(admin.TabularInline):
    model = CashFlowEntry
    extra = 0
    fields = ('activity', 'category', 'entry_type', 'period_start', 'amount', 'source')


@admin.register(CashFlowPlan)
class CashFlowPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'budget', 'period_type', 'is_current', 'created_at')
    list_filter = ('period_type', 'is_current')
    search_fields = ('title', 'project__name')
    inlines = [CashFlowEntryInline]


@admin.register(CashFlowEntry)
class CashFlowEntryAdmin(admin.ModelAdmin):
    list_display = ('activity', 'category', 'entry_type', 'period_start', 'amount', 'source')
    list_filter = ('entry_type', 'category', 'source')
    search_fields = ('activity__name',)