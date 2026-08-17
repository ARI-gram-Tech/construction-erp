# /apps/team/admin.py
from django.contrib import admin

from .models import ProjectMember


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'project', 'role_on_project', 'created_at')
    list_filter = ('project__company', 'role_on_project')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'project__name')
    autocomplete_fields = ('project', 'user')