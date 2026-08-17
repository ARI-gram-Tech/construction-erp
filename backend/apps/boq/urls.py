# apps/boq/urls.py
"""
Mounted in config/urls.py as:
    path('api/boq/', include('apps.boq.urls')),

Resulting routes:
    GET/POST    /api/boq/units/
    GET/POST    /api/boq/projects/{project_pk}/boqs/
    GET/PATCH/DELETE  /api/boq/projects/{project_pk}/boqs/{pk}/
    POST        /api/boq/projects/{project_pk}/boqs/{pk}/duplicate/
    POST        /api/boq/projects/{project_pk}/boqs/{pk}/new-revision/
    GET         /api/boq/projects/{project_pk}/boqs/{boq_pk}/revisions/
    GET         /api/boq/projects/{project_pk}/boqs/{boq_pk}/revisions/{pk}/
    GET/POST    /api/boq/projects/{project_pk}/boqs/{boq_pk}/sections/
    GET/PATCH/DELETE  /api/boq/projects/{project_pk}/boqs/{boq_pk}/sections/{pk}/
    GET/POST    /api/boq/projects/{project_pk}/boqs/{boq_pk}/items/
    GET/PATCH/DELETE  /api/boq/projects/{project_pk}/boqs/{boq_pk}/items/{pk}/

    POST        /api/boq/projects/{project_pk}/import-sessions/                upload
    GET         /api/boq/projects/{project_pk}/import-sessions/                history
    GET         /api/boq/projects/{project_pk}/import-sessions/{pk}/          detail
    POST        /api/boq/projects/{project_pk}/import-sessions/{pk}/preview/  re-map, no write
    POST        /api/boq/projects/{project_pk}/import-sessions/{pk}/confirm/  commit

NOTE: written as plain path()s rather than a nested router, since I
haven't seen apps/planning/urls.py to confirm whether you're using
rest_framework_nested there. If you are, swap this for the same
NestedSimpleRouter pattern for consistency — the view logic doesn't
change either way.
"""
from django.urls import path

from .views import (
    BOQViewSet,
    BOQSectionViewSet,
    BOQItemViewSet,
    BOQRevisionViewSet,
    UnitViewSet,
    ActivityBOQView,
)
from .views_import import BOQImportSessionViewSet

unit_list = UnitViewSet.as_view({'get': 'list'})
unit_detail = UnitViewSet.as_view({'get': 'retrieve'})

boq_list = BOQViewSet.as_view({'get': 'list', 'post': 'create'})
boq_detail = BOQViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy',
})
boq_duplicate = BOQViewSet.as_view({'post': 'duplicate'})
boq_new_revision = BOQViewSet.as_view({'post': 'new_revision'})
boq_reference = BOQViewSet.as_view({'post': 'create_reference'})

revision_list = BOQRevisionViewSet.as_view({'get': 'list'})
revision_detail = BOQRevisionViewSet.as_view({'get': 'retrieve'})

section_list = BOQSectionViewSet.as_view({'get': 'list', 'post': 'create'})
section_detail = BOQSectionViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy',
})

item_list = BOQItemViewSet.as_view({'get': 'list', 'post': 'create'})
item_detail = BOQItemViewSet.as_view({
    'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy',
})

urlpatterns = [
    path('units/', unit_list, name='unit-list'),
    path('units/<int:pk>/', unit_detail, name='unit-detail'),

    path('projects/<int:project_pk>/boqs/', boq_list, name='boq-list'),
    path('projects/<int:project_pk>/boqs/reference/', boq_reference, name='boq-create-reference'),
    path('projects/<int:project_pk>/boqs/<int:pk>/', boq_detail, name='boq-detail'),
    path('projects/<int:project_pk>/boqs/<int:pk>/duplicate/', boq_duplicate, name='boq-duplicate'),
    path('projects/<int:project_pk>/boqs/<int:pk>/new-revision/', boq_new_revision, name='boq-new-revision'),

    path('projects/<int:project_pk>/boqs/<int:boq_pk>/revisions/', revision_list, name='boq-revision-list'),
    path('projects/<int:project_pk>/boqs/<int:boq_pk>/revisions/<int:pk>/', revision_detail, name='boq-revision-detail'),

    path('projects/<int:project_pk>/boqs/<int:boq_pk>/sections/', section_list, name='boq-section-list'),
    path('projects/<int:project_pk>/boqs/<int:boq_pk>/sections/<int:pk>/', section_detail, name='boq-section-detail'),

    path('projects/<int:project_pk>/boqs/<int:boq_pk>/items/', item_list, name='boq-item-list'),
    path('projects/<int:project_pk>/boqs/<int:boq_pk>/items/<int:pk>/', item_detail, name='boq-item-detail'),

    path(
        'projects/<int:project_pk>/import-sessions/',
        BOQImportSessionViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='boq-import-session-list',
    ),
    path(
        'projects/<int:project_pk>/import-sessions/<int:pk>/',
        BOQImportSessionViewSet.as_view({'get': 'retrieve'}),
        name='boq-import-session-detail',
    ),
    path(
        'projects/<int:project_pk>/import-sessions/<int:pk>/preview/',
        BOQImportSessionViewSet.as_view({'post': 'preview'}),
        name='boq-import-session-preview',
    ),
    path(
        'projects/<int:project_pk>/import-sessions/<int:pk>/confirm/',
        BOQImportSessionViewSet.as_view({'post': 'confirm'}),
        name='boq-import-session-confirm',
    ),
    path(
        'projects/<int:project_pk>/activities/<int:activity_pk>/boq-items/',
        ActivityBOQView.as_view({'get': 'list'}),
        name='activity-boq-items',
    ),
    path(
        'projects/<int:project_pk>/activities/<int:activity_pk>/boq-items/flag/',
        ActivityBOQView.as_view({'post': 'flag'}),
        name='activity-boq-flag',
    ),
]