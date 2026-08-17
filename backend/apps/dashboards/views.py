# apps/dashboards/views.py
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import SiteEngineerDashboardService, QSDashboardService, ProcurementDashboardService

class SiteEngineerDashboardView(APIView):
    """
    GET /api/dashboards/site-engineer/
    Only accessible to users whose account role is 'site_engineer'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'site_engineer':
            raise PermissionDenied('This dashboard is for Site Engineers only.')
        data = SiteEngineerDashboardService(request.user).get_data()
        return Response(data)


class QSDashboardView(APIView):
    """
    GET /api/dashboards/qs/
    Only accessible to users whose account role is 'qs'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'qs':
            raise PermissionDenied('This dashboard is for Quantity Surveyors only.')
        data = QSDashboardService(request.user).get_data()
        return Response(data)


PROCUREMENT_DASHBOARD_ROLES = {
    'company_admin', 'director', 'procurement_manager', 'procurement', 'project_manager',
}


class ProcurementDashboardView(APIView):
    """
    GET /api/dashboards/procurement/
    Accessible to every role that has genuine company-wide-or-own-
    project visibility into procurement — mirrors apps.procurement's
    own COMPANY_WIDE_PROCUREMENT_ROLES plus project_manager (who
    is scoped to their own projects inside the service itself).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in PROCUREMENT_DASHBOARD_ROLES:
            raise PermissionDenied('This dashboard is for procurement-involved roles only.')
        data = ProcurementDashboardService(request.user).get_data()
        return Response(data)