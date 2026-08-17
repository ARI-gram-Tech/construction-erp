from django.contrib import admin
from .models import Warehouse, StockItem, StockLevel, StockMovement


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'location_type', 'project', 'is_active')
    list_filter = ('location_type', 'is_active', 'company')
    search_fields = ('name', 'company__name', 'project__name')


class StockLevelInline(admin.TabularInline):
    model = StockLevel
    extra = 0
    readonly_fields = ('warehouse', 'quantity')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        # Levels are created automatically the first time a movement
        # touches an item/warehouse pair — not hand-added here.
        return False


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'unit', 'reorder_level', 'company')
    list_filter = ('category', 'company')
    search_fields = ('code', 'name')
    readonly_fields = ('code',)
    inlines = [StockLevelInline]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        'movement_type', 'item', 'warehouse', 'quantity',
        'related_warehouse', 'reference', 'performed_by', 'created_at',
    )
    list_filter = ('movement_type', 'warehouse', 'company')
    search_fields = ('item__name', 'reference')
    readonly_fields = ('created_at',)