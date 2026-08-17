"""
Custom User model.

Now includes company linkage and role — needed for the invite-based
Company Admin flow. A user with company=None and is_superuser=True is
a platform Super Admin; a user with a company set has a role within it.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('super_admin', 'Super Admin'),
        ('company_admin', 'Company Admin'),
        ('director', 'Director'),
        ('operations_manager', 'Operations Manager'),
        ('finance_manager', 'Finance Manager'),
        ('accountant', 'Accountant'),
        ('procurement_manager', 'Procurement Manager'),
        ('main_store_manager', 'Main Store Manager'),
        ('hr_manager', 'HR Manager'),
        ('project_manager', 'Project Manager'),
        ('site_manager', 'Site Manager'),
        ('site_engineer', 'Site Engineer'),
        ('foreman', 'Foreman'),
        ('qs', 'Quantity Surveyor'),
        ('storekeeper', 'Site Storekeeper'),
        ('procurement', 'Procurement Officer'),
        ('safety_officer', 'Safety Officer'),
        ('qa_qc_engineer', 'QA/QC Engineer'),
        ('plant_equipment_officer', 'Plant & Equipment Officer'),
        ('document_controller', 'Document Controller'),
        ('management', 'Management'),
        ('site_supervisor', 'Site Supervisor'),
        ('subcontractor', 'Subcontractor'),
        ('client', 'Client'),
        ('employee', 'Employee'),
    )

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True)
    must_change_password = models.BooleanField(
        default=False,
        help_text='True until the user changes the temporary password issued at account creation.',
    )

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
        help_text='Null for platform Super Admins; set for company users.',
    )
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email