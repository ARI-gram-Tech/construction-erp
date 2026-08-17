# apps/documents/models.py
"""
Phase 6 — Document Management.

Documents belong to a Company always, and optionally to a Project (null
project = company-level document, e.g. legal/policy/templates). The actual
file lives on DocumentVersion, not Document itself — every upload after the
first creates a new version rather than overwriting, per the roadmap's
"no more lost files, keep history" requirement.
"""
from django.db import models

from apps.common.models import TimeStampedModel


class Document(TimeStampedModel):
    CATEGORY_CHOICES = [
        ('contract', 'Contract'),
        ('drawing', 'Drawing'),
        ('boq', 'BOQ'),
        ('tender', 'Tender'),
        ('programme', 'Programme'),
        ('report', 'Report'),
        ('legal', 'Legal'),
        ('policy', 'Policy'),
        ('template', 'Template'),
        ('photo', 'Photo'),
        ('other', 'Other'),
    ]

    company = models.ForeignKey('companies.Company', on_delete=models.CASCADE, related_name='documents')
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='documents',
        null=True, blank=True,
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    name = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='uploaded_documents'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class DocumentVersion(TimeStampedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='versions')
    file = models.FileField(upload_to='documents/%Y/%m/')
    version_number = models.PositiveIntegerField()
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('document', 'version_number')

    def __str__(self):
        return f'{self.document.name} v{self.version_number}'