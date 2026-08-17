"""
Company-level models: Company, Branch, Subscription.
Super Admin (platform owner, is_superuser=True) manages these directly.
Regular company users only see their own company's record.
"""
import secrets
from django.utils import timezone
from datetime import timedelta
from django.db import models


class Company(models.Model):
    """
    A tenant on the platform. Every company-owned record elsewhere
    (projects, inventory, etc.) will eventually scope to this.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('active', 'Active'),
        ('suspended', 'Suspended'),
    )

    name = models.CharField(max_length=255)
    registration_no = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    address = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    procurement_approval_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, default=100000,
        help_text='Purchase requests at or above this amount require Director approval, '
                   'in addition to Procurement Manager approval.',
    )

    procurement_approval_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, default=100000,
        help_text='Purchase requests at or above this amount require Director approval, '
                   'in addition to Procurement Manager approval.',
    )

    procurement_approval_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, default=100000,
        help_text='Purchase requests at or above this amount require Director approval, '
                   'in addition to Procurement Manager approval.',
    )

    procurement_approval_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, default=100000,
        help_text='Purchase requests at or above this amount require Director approval, '
                   'in addition to Procurement Manager approval.',
    )

    procurement_approval_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, default=100000,
        help_text='Purchase requests at or above this amount require Director approval, '
                   'in addition to Procurement Manager approval.',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Companies'

    def __str__(self):
        return self.name


class Branch(models.Model):
    """
    A physical office/branch belonging to a company.
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='branches')
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    is_main = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_main', 'name']

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class Subscription(models.Model):
    """
    A company's plan on the platform. Super Admin controls this —
    company users can view but not edit their own subscription.
    """
    PLAN_CHOICES = (
        ('trial', 'Trial'),
        ('basic', 'Basic'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    )

    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='subscription')
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='trial')
    max_users = models.PositiveIntegerField(default=5)
    max_projects = models.PositiveIntegerField(default=3)

    is_active = models.BooleanField(default=True)
    starts_at = models.DateField(auto_now_add=True)
    expires_at = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.company.name} — {self.get_plan_display()}"


class Invitation(models.Model):
    """
    An invite sent to a company's email so they can set up their
    Company Admin account. Single-use, expires after a set window.
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    role = models.CharField(max_length=20, default='company_admin')

    token = models.CharField(max_length=64, unique=True, editable=False)
    is_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"Invite for {self.email} ({self.company.name})"