# apps/tenders/apps.py
from django.apps import AppConfig


class PlanningConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.tenders'
    verbose_name = 'Tenders'