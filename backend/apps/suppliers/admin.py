from django.contrib import admin
from .models import Supplier, SupplierContact


class SupplierContactInline(admin.TabularInline):
    model = SupplierContact
    extra = 0


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'company', 'supplier_type', 'status', 'city', 'contact_person', 'phone')
    list_filter = ('supplier_type', 'status', 'company')
    search_fields = ('code', 'name', 'contact_person', 'email', 'company__name')
    inlines = [SupplierContactInline]
    readonly_fields = ('code',)