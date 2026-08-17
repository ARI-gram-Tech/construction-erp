from rest_framework import generics

from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.companies.permissions import IsSuperAdmin


class AuditLogListView(generics.ListAPIView):
    """
    GET /api/audit-logs/
    Super Admin only. Read-only — logs are never edited or deleted via API.
    """
    queryset = AuditLog.objects.select_related('actor', 'company').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]