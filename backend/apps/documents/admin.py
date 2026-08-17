# apps/documents/admin.py
from django.contrib import admin

from .models import Document, DocumentVersion


class DocumentVersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'project', 'category', 'uploaded_by', 'created_at')
    list_filter = ('category', 'company')
    search_fields = ('name',)
    inlines = [DocumentVersionInline]