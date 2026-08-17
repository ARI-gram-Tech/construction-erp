"""
Run once a day (via cron / scheduled task). Checks every approved
RequirementGroup with a required_on_site date. If today is the alert
day, message the project's storekeeper — not the main store — asking
them to have the approved materials ready in the project store.

Alert day = required_on_site minus alert_days_before (PM-set, or 2
if the PM never set one). Sends once per group — alert_sent_at is
stamped so a second run the same day (or any day after) doesn't
repeat it.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.planning.models import RequirementGroup
from apps.team.models import ProjectMember
from apps.notifications.utils import notify

DEFAULT_ALERT_DAYS = 2


class Command(BaseCommand):
    help = 'Sends store-readiness alerts to project storekeepers for approved requirement groups.'

    def handle(self, *args, **options):
        today = timezone.localdate()
        sent_count = 0

        groups = RequirementGroup.objects.filter(
            status=RequirementGroup.STATUS_APPROVED,
            required_on_site__isnull=False,
            alert_sent_at__isnull=True,
        ).select_related('activity', 'activity__project')

        for group in groups:
            days_before = group.alert_days_before or DEFAULT_ALERT_DAYS
            alert_day = group.required_on_site - timedelta(days=days_before)

            if today < alert_day:
                continue  # not time yet

            project = group.activity.project
            storekeeper_ids = ProjectMember.objects.filter(
                project=project, user__role='storekeeper',
            ).values_list('user_id', flat=True)

            if not storekeeper_ids:
                # No storekeeper on this project yet — skip silently,
                # don't stamp alert_sent_at so it retries once one is added.
                continue

            from django.contrib.auth import get_user_model
            User = get_user_model()
            storekeepers = User.objects.filter(id__in=storekeeper_ids)

            for sk in storekeepers:
                notify(
                    sk,
                    title=f'Get "{group.get_group_type_display()}" ready — {group.activity.name}',
                    message=(
                        f'Needed on site by {group.required_on_site}. '
                        f'Make sure these are in the project store, not just approved.'
                    ),
                    level='warning',
                    link=f'/projects/{project.id}/planning',
                )

            group.alert_sent_at = timezone.now()
            group.save(update_fields=['alert_sent_at'])
            sent_count += 1

        self.stdout.write(self.style.SUCCESS(f'Sent {sent_count} store-readiness alert(s).'))