# apps/budget/admin.py
from django.contrib import admin

from .models import Budget, BudgetLine, CostTransaction


class CostTransactionInline(admin.TabularInline):
    model = CostTransaction
    extra = 0
    fields = ('transaction_type', 'source_type', 'source_reference', 'amount', 'description', 'created_by')
    readonly_fields = ('created_by',)


class BudgetLineInline(admin.TabularInline):
    model = BudgetLine
    extra = 0
    fields = ('title', 'boq_section', 'original_amount', 'approved_amount', 'order')


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'boq', 'status', 'approved_by', 'approved_at', 'created_at')
    list_filter = ('status',)
    search_fields = ('title', 'project__name')
    inlines = [BudgetLineInline]


@admin.register(BudgetLine)
class BudgetLineAdmin(admin.ModelAdmin):
    list_display = ('title', 'budget', 'original_amount', 'approved_amount')
    list_filter = ('budget__status',)
    search_fields = ('title', 'budget__title')
    inlines = [CostTransactionInline]


@admin.register(CostTransaction)
class CostTransactionAdmin(admin.ModelAdmin):
    list_display = ('budget_line', 'transaction_type', 'source_type', 'source_reference', 'amount', 'created_at')
    list_filter = ('transaction_type', 'source_type')
    search_fields = ('source_reference', 'description')