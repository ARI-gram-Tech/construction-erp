from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'actor', 'action', 'company', 'description')
    list_filter = ('action', 'company')
    search_fields = ('actor__email', 'description', 'action')
    readonly_fields = ('actor', 'action', 'company', 'description', 'created_at')

    def has_add_permission(self, request):
        return False  # audit logs are only ever created by log_action(), never by hand

    def has_change_permission(self, request, obj=None):
        return False  # read-only — an editable audit trail isn't a trail