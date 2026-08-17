from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True, default=None)
    company_name = serializers.CharField(source='company.name', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = ('id', 'actor_email', 'action', 'company_name', 'description', 'created_at')