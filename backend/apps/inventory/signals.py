# apps/inventory/signals.py
"""
Auto-creates Warehouses on creation of their parent record, so nobody
has to remember to set one up manually:
  - Company created  -> one Main Warehouse
  - Project created  -> one Project Store, tied to that project

Only fires on CREATE (created=True), not on every save — so editing an
existing Company or Project won't touch its Warehouse.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.companies.models import Company
from apps.projects.models import Project
from .models import Warehouse


@receiver(post_save, sender=Company)
def create_main_warehouse(sender, instance, created, **kwargs):
    if created:
        Warehouse.objects.get_or_create(
            company=instance,
            location_type='main',
            project=None,
            defaults={'name': f'{instance.name} — Main Warehouse'},
        )


@receiver(post_save, sender=Project)
def create_project_store(sender, instance, created, **kwargs):
    if created:
        Warehouse.objects.get_or_create(
            project=instance,
            defaults={
                'company': instance.company,
                'location_type': 'project',
                'name': f'{instance.name} — Site Store',
            },
        )