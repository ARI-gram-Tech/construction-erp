"""
Clients: the entities a construction company builds projects for.
Every client belongs to exactly one company (tenant-scoped), matching
the CompanyOwnedModel pattern used elsewhere in the system.
"""
from django.db import models
from apps.common.models import CompanyOwnedModel


class Client(CompanyOwnedModel):
    """
    A client of the company — could be a private individual, a real
    estate developer, a government body, etc. Projects reference this.
    """
    CLIENT_TYPE_CHOICES = (
        ('individual', 'Individual'),
        ('private_company', 'Private Company'),
        ('government', 'Government'),
        ('ngo', 'NGO'),
        ('other', 'Other'),
    )

    name = models.CharField(max_length=255)
    client_type = models.CharField(max_length=20, choices=CLIENT_TYPE_CHOICES, default='private_company')
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name