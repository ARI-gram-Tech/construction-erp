"""
Suppliers: company-wide vendor master records. Treated as long-term
business partners with their own profile — not just a name and phone
number — since one supplier can span many projects, POs, and years.
"""
from django.db import models
from apps.common.models import CompanyOwnedModel


class Supplier(CompanyOwnedModel):
    """
    A vendor the company has an ongoing or one-off buying relationship
    with. Used when raising Purchase Orders in the procurement flow.
    """
    SUPPLIER_TYPE_CHOICES = (
        ('materials', 'Materials Supplier'),
        ('equipment', 'Equipment Supplier'),
        ('services', 'Services Provider'),
        ('other', 'Other'),
        # Note: Subcontractors are intentionally excluded — they involve
        # contracts, valuations, retention, and payment schedules that go
        # far beyond a vendor record. They get their own dedicated app later.
    )

    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('blacklisted', 'Blacklisted'),
    )

    # Identity
    code = models.CharField(max_length=20, blank=True, help_text='Auto-generated, e.g. SUP-0001.')
    name = models.CharField(max_length=255)
    supplier_type = models.CharField(max_length=20, choices=SUPPLIER_TYPE_CHOICES, default='materials')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    # Registration / tax
    registration_no = models.CharField(max_length=100, blank=True, help_text='Company registration / CR12 number.')
    tax_pin = models.CharField(max_length=50, blank=True, help_text='KRA PIN or equivalent tax ID.')
    website = models.URLField(blank=True)

    # Primary contact (quick-reference; full contacts live in SupplierContact)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)

    # Address
    country = models.CharField(max_length=100, blank=True, default='Kenya')
    city = models.CharField(max_length=100, blank=True)
    physical_address = models.CharField(max_length=255, blank=True)

    # Financial
    currency = models.CharField(max_length=10, default='KES')
    payment_terms = models.CharField(max_length=100, blank=True, help_text='e.g. "Net 30", "Cash on delivery".')
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.code:
            # Simple sequential code per company, e.g. SUP-0001
            last = Supplier.objects.filter(company=self.company).order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.code = f'SUP-{next_num:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.code} — {self.name}'


class SupplierContact(models.Model):
    """
    A supplier can have several contacts — sales, accounts, management —
    unlike the single contact_person quick-reference field above.
    """
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=255)
    position = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ['-is_primary', 'name']

    def __str__(self):
        return f'{self.name} ({self.supplier.name})'