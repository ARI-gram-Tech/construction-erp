from django.urls import path
from .views import CashFlowPlanViewSet, CashFlowEntryViewSet

plan_list = CashFlowPlanViewSet.as_view({'get': 'list', 'post': 'create'})
plan_detail = CashFlowPlanViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})
plan_summary = CashFlowPlanViewSet.as_view({'get': 'summary'})

entry_list = CashFlowEntryViewSet.as_view({'get': 'list', 'post': 'create'})
entry_detail = CashFlowEntryViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})
entry_generate_rows = CashFlowEntryViewSet.as_view({'post': 'generate_rows'})
entry_distribute = CashFlowEntryViewSet.as_view({'post': 'distribute'})

urlpatterns = [
    path('projects/<int:project_pk>/plans/', plan_list, name='cashflow-plan-list'),
    path('projects/<int:project_pk>/plans/<int:pk>/', plan_detail, name='cashflow-plan-detail'),
    path('projects/<int:project_pk>/plans/<int:pk>/summary/', plan_summary, name='cashflow-plan-summary'),

    path('projects/<int:project_pk>/plans/<int:plan_pk>/entries/', entry_list, name='cashflow-entry-list'),
    path('projects/<int:project_pk>/plans/<int:plan_pk>/entries/<int:pk>/', entry_detail, name='cashflow-entry-detail'),
    path('projects/<int:project_pk>/plans/<int:plan_pk>/entries/generate-rows/', entry_generate_rows, name='cashflow-entry-generate-rows'),
    path('projects/<int:project_pk>/plans/<int:plan_pk>/entries/distribute/', entry_distribute, name='cashflow-entry-distribute'),
]