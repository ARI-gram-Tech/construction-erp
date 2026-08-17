from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'client_type', 'contact_person', 'phone', 'created_at')
    list_filter = ('client_type', 'company')
    search_fields = ('name', 'contact_person', 'email', 'company__name')