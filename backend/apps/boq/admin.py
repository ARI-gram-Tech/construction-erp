# apps/boq/admin.py
from django.contrib import admin

from .models import BOQ, BOQRevision, BOQSection, BOQItem, Unit, BOQImportSession


class BOQSectionInline(admin.TabularInline):
    model = BOQSection
    extra = 0
    fields = ('code', 'title', 'parent', 'order')


class BOQItemInline(admin.TabularInline):
    model = BOQItem
    extra = 0
    fields = ('item_code', 'description', 'unit', 'quantity', 'rate', 'section')


@admin.register(BOQ)
class BOQAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'status', 'source', 'link_mode', 'integration_mode', 'created_at')
    list_filter = ('status', 'source', 'link_mode', 'integration_mode')
    search_fields = ('title', 'project__name')
    inlines = [BOQSectionInline, BOQItemInline]


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')


admin.site.register(BOQRevision)


@admin.register(BOQImportSession)
class BOQImportSessionAdmin(admin.ModelAdmin):
    list_display = ('project', 'boq', 'import_mode', 'status', 'confidence_score', 'created_at')
    list_filter = ('status', 'import_mode')
    readonly_fields = ('column_mapping',)  # JSON is easier to read than edit here; use the API to change it