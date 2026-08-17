"""
Platform-wide notifications. Designed to be triggered from any app
(companies, projects, inventory, etc.) via the create_notification helper,
so every new module can plug into this without adding its own system.
"""
from django.db import models


class Notification(models.Model):
    LEVEL_CHOICES = (
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    )

    recipient = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='info')
    link = models.CharField(
        max_length=255, blank=True,
        help_text='Optional in-app path to navigate to, e.g. /company/projects/12',
    )

    # Nullable: platform-level and company-level notifications (e.g.
    # "your subscription is expiring") aren't tied to any one project.
    # Project-scoped notifications (procurement alerts, safety incidents,
    # cost overruns — Phase 9 onward) set this so the project header bell
    # can filter to exactly what belongs on that project.
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
    )

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.email} — {self.title}"