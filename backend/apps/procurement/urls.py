# apps/procurement/urls.py
from django.urls import path

from .views import PurchaseRequestViewSet, LPOViewSet

pr_list = PurchaseRequestViewSet.as_view({'get': 'list', 'post': 'create'})
pr_detail = PurchaseRequestViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy',
})
pr_submit = PurchaseRequestViewSet.as_view({'post': 'submit'})
pr_cancel = PurchaseRequestViewSet.as_view({'post': 'cancel'})
pr_approve = PurchaseRequestViewSet.as_view({'post': 'approve'})
pr_reject = PurchaseRequestViewSet.as_view({'post': 'reject'})
pr_escalate = PurchaseRequestViewSet.as_view({'post': 'escalate'})
pr_record_delivery = PurchaseRequestViewSet.as_view({'post': 'record_delivery'})
pr_record_receipt = PurchaseRequestViewSet.as_view({'post': 'record_receipt'})

pr_inbox = PurchaseRequestViewSet.as_view({'get': 'inbox'})
pr_all = PurchaseRequestViewSet.as_view({'get': 'all_requests'})

lpo_generate = LPOViewSet.as_view({'post': 'generate'})
lpo_list = LPOViewSet.as_view({'get': 'list'})
lpo_detail = LPOViewSet.as_view({'get': 'retrieve'})
lpo_approve_digital = LPOViewSet.as_view({'post': 'approve_digital'})
lpo_upload_signed = LPOViewSet.as_view({'post': 'upload_signed'})
lpo_send = LPOViewSet.as_view({'post': 'send'})
lpo_pdf = LPOViewSet.as_view({'get': 'pdf'})

urlpatterns = [
    path('inbox/', pr_inbox, name='purchase-request-inbox'),
    path('all/', pr_all, name='purchase-request-all'),
    path('projects/<int:project_pk>/purchase-requests/', pr_list, name='purchase-request-list'),
    path('projects/<int:project_pk>/purchase-requests/<int:pk>/', pr_detail, name='purchase-request-detail'),
    path('projects/<int:project_pk>/purchase-requests/<int:pk>/submit/', pr_submit, name='purchase-request-submit'),
    path('projects/<int:project_pk>/purchase-requests/<int:pk>/cancel/', pr_cancel, name='purchase-request-cancel'),
    path('projects/<int:project_pk>/purchase-requests/<int:pk>/approve/', pr_approve, name='purchase-request-approve'),
    path('projects/<int:project_pk>/purchase-requests/<int:pk>/reject/', pr_reject, name='purchase-request-reject'),
    path('projects/<int:project_pk>/purchase-requests/<int:pk>/escalate/', pr_escalate, name='purchase-request-escalate'),
    path('projects/<int:project_pk>/purchase-requests/<int:pk>/record-delivery/', pr_record_delivery, name='purchase-request-record-delivery'),
    path('projects/<int:project_pk>/purchase-requests/<int:pk>/record-receipt/', pr_record_receipt, name='purchase-request-record-receipt'),
    path('lpos/', lpo_list, name='lpo-list'),
    path('lpos/generate/', lpo_generate, name='lpo-generate'),
    path('lpos/<int:pk>/', lpo_detail, name='lpo-detail'),
    path('lpos/<int:pk>/approve-digital/', lpo_approve_digital, name='lpo-approve-digital'),
    path('lpos/<int:pk>/upload-signed/', lpo_upload_signed, name='lpo-upload-signed'),
    path('lpos/<int:pk>/send/', lpo_send, name='lpo-send'),
    path('lpos/<int:pk>/pdf/', lpo_pdf, name='lpo-pdf'),
]