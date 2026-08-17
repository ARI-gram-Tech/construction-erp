"""
Projects: the core unit of work for a construction company. Every
project belongs to a company and references the client it's being
built for.
"""
from django.db import models
from apps.common.models import CompanyOwnedModel


class Project(CompanyOwnedModel):
    """
    A single construction project — e.g. "Nairobi Mall Project".
    """
    STATUS_CHOICES = (
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.PROTECT,
        related_name='projects',
        help_text='Every project must belong to a client.',
    )
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)

    contract_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')

    project_manager = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.client.name})"