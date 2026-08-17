"""
Shared base models.

Every business model added from Phase 2 onward should inherit from
TimeStampedModel, and every model that belongs to a single company should
inherit from CompanyOwnedModel. This is the multi-tenant guardrail flagged
in the roadmap: get it right here once, instead of re-adding company_id
scoping ad hoc in every app later.
"""
from django.db import models


class TimeStampedModel(models.Model):
    """Adds created_at / updated_at to any model that inherits it."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class CompanyOwnedManager(models.Manager):
    """
    Default manager for tenant-scoped models. Use
    `Model.objects.for_company(company)` in views instead of `Model.objects.all()`
    so it's never possible to accidentally leak another tenant's rows.
    """

    def for_company(self, company):
        return self.get_queryset().filter(company=company)


class CompanyOwnedModel(TimeStampedModel):
    """
    Abstract base for any model that belongs to exactly one company.
    Project-level models should instead scope via their Project FK
    (Project itself inherits CompanyOwnedModel).
    """
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='%(class)ss',
    )

    objects = CompanyOwnedManager()

    class Meta:
        abstract = True


class AuditLog(TimeStampedModel):
    """
    Records significant platform actions for accountability — who did what,
    to what, and when. Company is nullable since some actions (e.g. creating
    a company) don't yet have one, or the actor may be a Super Admin acting
    across companies rather than within one.
    """
    actor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
        help_text='Who performed the action. Null if the user was later deleted.',
    )
    action = models.CharField(max_length=100)
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text='The company this action affected, if any.',
    )
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        who = self.actor.email if self.actor else 'Unknown user'
        return f"{who} — {self.action} ({self.created_at:%Y-%m-%d %H:%M})"