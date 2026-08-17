# apps/variations/urls.py
"""
Mounted in config/urls.py as:
    path('api/variations/', include('apps.variations.urls')),

Resulting routes:
    GET/POST          /api/variations/projects/{project_pk}/variations/
    GET/PATCH/DELETE  /api/variations/projects/{project_pk}/variations/{pk}/
    POST              /api/variations/projects/{project_pk}/variations/{pk}/submit/
    POST              /api/variations/projects/{project_pk}/variations/{pk}/approve/
    POST              /api/variations/projects/{project_pk}/variations/{pk}/reject/

    GET/POST          /api/variations/projects/{project_pk}/ipcs/
    GET/PATCH         /api/variations/projects/{project_pk}/ipcs/{pk}/
    POST              /api/variations/projects/{project_pk}/ipcs/{pk}/issue/
    GET               /api/variations/projects/{project_pk}/ipcs/{pk}/pdf/
"""
from django.urls import path

from .views import VariationViewSet, InterimPaymentCertificateViewSet

variation_list = VariationViewSet.as_view({'get': 'list', 'post': 'create'})
variation_detail = VariationViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})
variation_submit = VariationViewSet.as_view({'post': 'submit'})
variation_approve = VariationViewSet.as_view({'post': 'approve'})
variation_reject = VariationViewSet.as_view({'post': 'reject'})

ipc_list = InterimPaymentCertificateViewSet.as_view({'get': 'list', 'post': 'create'})
ipc_detail = InterimPaymentCertificateViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'})
ipc_issue = InterimPaymentCertificateViewSet.as_view({'post': 'issue'})
ipc_pdf = InterimPaymentCertificateViewSet.as_view({'get': 'pdf'})

urlpatterns = [
    path('projects/<int:project_pk>/variations/', variation_list, name='variation-list'),
    path('projects/<int:project_pk>/variations/<int:pk>/', variation_detail, name='variation-detail'),
    path('projects/<int:project_pk>/variations/<int:pk>/submit/', variation_submit, name='variation-submit'),
    path('projects/<int:project_pk>/variations/<int:pk>/approve/', variation_approve, name='variation-approve'),
    path('projects/<int:project_pk>/variations/<int:pk>/reject/', variation_reject, name='variation-reject'),

    path('projects/<int:project_pk>/ipcs/', ipc_list, name='ipc-list'),
    path('projects/<int:project_pk>/ipcs/<int:pk>/', ipc_detail, name='ipc-detail'),
    path('projects/<int:project_pk>/ipcs/<int:pk>/issue/', ipc_issue, name='ipc-issue'),
    path('projects/<int:project_pk>/ipcs/<int:pk>/pdf/', ipc_pdf, name='ipc-pdf'),
]