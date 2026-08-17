# apps/inventory/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    WarehouseViewSet,
    StockItemViewSet,
    StockLevelViewSet,
    StockMovementViewSet,
    PendingStockItemRequestViewSet,
    StockRestockRequestViewSet,
)

router = DefaultRouter()
router.register('warehouses', WarehouseViewSet, basename='warehouse')
router.register('items', StockItemViewSet, basename='stock-item')
router.register('levels', StockLevelViewSet, basename='stock-level')
router.register('movements', StockMovementViewSet, basename='stock-movement')
router.register('pending-item-requests', PendingStockItemRequestViewSet, basename='pending-stock-item-request')
router.register('restock-requests', StockRestockRequestViewSet, basename='stock-restock-request')

urlpatterns = [
    path('', include(router.urls)),
]