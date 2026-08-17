# apps/team/models.py
"""
Phase 5 follow-up — ProjectMember.

Kept as its own small app rather than folded into apps.projects, since I
don't have your actual projects app files to safely edit — this only
references apps.projects.Project by string FK, so it drops in cleanly
regardless of what else is in that app.

role_on_project is a plain string, not tied to your Employees module's
24-role taxonomy — someone's role ON a project (e.g. "Site Engineer",
"QS") is often different from their company-wide job title, and the
roadmap explicitly calls for custom/flexible roles. If you'd rather this
FK straight into your existing Role model instead, tell me its shape and
I'll swap this to a ForeignKey.
"""
from django.db import models

from apps.common.models import TimeStampedModel


class ProjectMember(TimeStampedModel):
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='members'
    )
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='project_memberships'
    )
    role_on_project = models.CharField(max_length=100)

    class Meta:
        ordering = ['role_on_project']
        unique_together = ('project', 'user')

    def __str__(self):
        return f'{self.user.email} — {self.role_on_project} on {self.project.name}'