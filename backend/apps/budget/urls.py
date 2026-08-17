# apps/budget/urls.py
"""
Mounted in config/urls.py as:
    path('api/budget/', include('apps.budget.urls')),

Resulting routes:
    GET/POST          /api/budget/projects/{project_pk}/budgets/
    GET/PATCH/DELETE  /api/budget/projects/{project_pk}/budgets/{pk}/
    POST              /api/budget/projects/{project_pk}/budgets/generate-from-boq/
    POST              /api/budget/projects/{project_pk}/budgets/{pk}/approve/
    POST              /api/budget/projects/{project_pk}/budgets/{pk}/lock/

    GET/POST          /api/budget/projects/{project_pk}/budgets/{budget_pk}/lines/
    GET/PATCH/DELETE  /api/budget/projects/{project_pk}/budgets/{budget_pk}/lines/{pk}/

    GET/POST          /api/budget/projects/{project_pk}/budgets/{budget_pk}/lines/{line_pk}/transactions/

Plain path()s, matching apps.boq.urls — same note applies: swap for
rest_framework_nested if that's what apps.planning.urls actually uses.
"""
from django.urls import path

from .views import BudgetViewSet, BudgetLineViewSet, CostTransactionViewSet

budget_list = BudgetViewSet.as_view({'get': 'list', 'post': 'create'})
budget_detail = BudgetViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})
budget_generate = BudgetViewSet.as_view({'post': 'generate_from_boq'})
budget_approve = BudgetViewSet.as_view({'post': 'approve'})
budget_lock = BudgetViewSet.as_view({'post': 'lock'})

line_list = BudgetLineViewSet.as_view({'get': 'list', 'post': 'create'})
line_detail = BudgetLineViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})

transaction_list = CostTransactionViewSet.as_view({'get': 'list', 'post': 'create'})
transaction_detail = CostTransactionViewSet.as_view({'get': 'retrieve'})

urlpatterns = [
    path('projects/<int:project_pk>/budgets/', budget_list, name='budget-list'),
    path('projects/<int:project_pk>/budgets/generate-from-boq/', budget_generate, name='budget-generate-from-boq'),
    path('projects/<int:project_pk>/budgets/<int:pk>/', budget_detail, name='budget-detail'),
    path('projects/<int:project_pk>/budgets/<int:pk>/approve/', budget_approve, name='budget-approve'),
    path('projects/<int:project_pk>/budgets/<int:pk>/lock/', budget_lock, name='budget-lock'),

    path('projects/<int:project_pk>/budgets/<int:budget_pk>/lines/', line_list, name='budget-line-list'),
    path('projects/<int:project_pk>/budgets/<int:budget_pk>/lines/<int:pk>/', line_detail, name='budget-line-detail'),

    path(
        'projects/<int:project_pk>/budgets/<int:budget_pk>/lines/<int:line_pk>/transactions/',
        transaction_list, name='cost-transaction-list',
    ),
    path(
        'projects/<int:project_pk>/budgets/<int:budget_pk>/lines/<int:line_pk>/transactions/<int:pk>/',
        transaction_detail, name='cost-transaction-detail',
    ),
]