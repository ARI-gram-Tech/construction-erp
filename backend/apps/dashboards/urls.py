# apps/dashboards/urls.py
from django.urls import path

from .views import SiteEngineerDashboardView, QSDashboardView, ProcurementDashboardView

urlpatterns = [
    path('site-engineer/', SiteEngineerDashboardView.as_view(), name='site-engineer-dashboard'),
    path('qs/', QSDashboardView.as_view(), name='qs-dashboard'),
    path('procurement/', ProcurementDashboardView.as_view(), name='procurement-dashboard'),
]