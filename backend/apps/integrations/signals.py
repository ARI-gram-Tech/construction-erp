# apps/integrations/signals.py
"""
Wires Procurement and Inventory into the Budget cost ledger without
either app needing to import or know Budget exists. Both source apps
stay exactly as they were built — this module listens from the
outside via Django's signal dispatcher, which is the whole point of
using signals instead of editing PurchaseRequest.save() or
StockMovement creation directly.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.procurement.models import PurchaseRequest
from apps.inventory.models import StockMovement
from . import services


@receiver(post_save, sender=PurchaseRequest)
def on_purchase_request_saved(sender, instance, **kwargs):
    services.sync_committed_cost_for_purchase_request(instance)


@receiver(post_save, sender=StockMovement)
def on_stock_movement_saved(sender, instance, **kwargs):
    services.sync_actual_cost_for_stock_movement(instance)