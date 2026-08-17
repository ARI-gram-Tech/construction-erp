from django.urls import path

from .views import TenderViewSet, TenderBOQSectionViewSet, TenderBOQItemViewSet
from .views_import import TenderBOQImportSessionViewSet

tender_list = TenderViewSet.as_view({'get': 'list', 'post': 'create'})
tender_detail = TenderViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy',
})
tender_reference = TenderViewSet.as_view({'post': 'create_reference'})
tender_promote = TenderViewSet.as_view({'post': 'promote'})
tender_submit = TenderViewSet.as_view({'post': 'submit'})
tender_record_outcome = TenderViewSet.as_view({'post': 'record_outcome'})
tender_convert = TenderViewSet.as_view({'post': 'convert_to_project'})

section_list = TenderBOQSectionViewSet.as_view({'get': 'list', 'post': 'create'})
section_detail = TenderBOQSectionViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy',
})

item_list = TenderBOQItemViewSet.as_view({'get': 'list', 'post': 'create'})
item_detail = TenderBOQItemViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy',
})

urlpatterns = [
    path('', tender_list, name='tender-list'),
    path('reference/', tender_reference, name='tender-create-reference'),
    path('<int:pk>/', tender_detail, name='tender-detail'),
    path('<int:pk>/promote/', tender_promote, name='tender-promote'),
    path('<int:pk>/submit/', tender_submit, name='tender-submit'),
    path('<int:pk>/record-outcome/', tender_record_outcome, name='tender-record-outcome'),
    path('<int:pk>/convert-to-project/', tender_convert, name='tender-convert-to-project'),

    path('<int:tender_pk>/boq-sections/', section_list, name='tender-boq-section-list'),
    path('<int:tender_pk>/boq-sections/<int:pk>/', section_detail, name='tender-boq-section-detail'),
    path('<int:tender_pk>/boq-items/', item_list, name='tender-boq-item-list'),
    path('<int:tender_pk>/boq-items/<int:pk>/', item_detail, name='tender-boq-item-detail'),

    path(
        '<int:tender_pk>/import-sessions/',
        TenderBOQImportSessionViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='tender-boq-import-session-list',
    ),
    path(
        '<int:tender_pk>/import-sessions/<int:pk>/',
        TenderBOQImportSessionViewSet.as_view({'get': 'retrieve'}),
        name='tender-boq-import-session-detail',
    ),
    path(
        '<int:tender_pk>/import-sessions/<int:pk>/preview/',
        TenderBOQImportSessionViewSet.as_view({'post': 'preview'}),
        name='tender-boq-import-session-preview',
    ),
    path(
        '<int:tender_pk>/import-sessions/<int:pk>/confirm/',
        TenderBOQImportSessionViewSet.as_view({'post': 'confirm'}),
        name='tender-boq-import-session-confirm',
    ),
]