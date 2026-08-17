from django.contrib import admin
from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'client', 'company', 'status', 'contract_value', 'start_date', 'created_at')
    list_filter = ('status', 'company')
    search_fields = ('name', 'client__name', 'location', 'company__name')