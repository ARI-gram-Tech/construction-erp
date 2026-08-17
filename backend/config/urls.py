"""
Root URL configuration.

Phase 1: just admin + a health check so the frontend has something to ping.
Phase 2+ will mount each app's urls.py under /api/... as it's built.
"""
from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.static import serve


def health_check(request):
    return JsonResponse({"status": "ok", "service": "construction-erp-backend"})


# Serves media files without Django's default X-Frame-Options: DENY header,
# so the frontend's in-app document viewer (an <iframe> on a different
# origin, localhost:5173) can actually embed a PDF served from here
# (localhost:8000). Every other route in this file keeps the default
# clickjacking protection — only media serving is exempted.
media_serve = xframe_options_exempt(serve)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/', include('apps.common.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/companies/', include('apps.companies.urls')),
    path('api/clients/', include('apps.clients.urls')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/team/', include('apps.team.urls')),
    path('api/planning/', include('apps.planning.urls')),
    path('api/suppliers/', include('apps.suppliers.urls')),
    path('api/procurement/', include('apps.procurement.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/dashboards/', include('apps.dashboards.urls')),
    path('api/boq/', include('apps.boq.urls')),
    path('api/tenders/', include('apps.tenders.urls')),
    path('api/budget/', include('apps.budget.urls')),
    path('api/cashflow/', include('apps.cashflow.urls')),
    path('api/variations/', include('apps.variations.urls')),
]

if settings.DEBUG:
    urlpatterns += [
        path(
            'media/<path:path>',
            media_serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]