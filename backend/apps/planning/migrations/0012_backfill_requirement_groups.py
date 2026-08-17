from django.db import migrations


def backfill_groups(apps, schema_editor):
    RequirementGroup = apps.get_model('planning', 'RequirementGroup')
    ActivityMaterial = apps.get_model('planning', 'ActivityMaterial')
    ActivityLabourRequirement = apps.get_model('planning', 'ActivityLabourRequirement')
    ActivityEquipmentRequirement = apps.get_model('planning', 'ActivityEquipmentRequirement')

    TYPE_MAP = [
        (ActivityMaterial, 'materials'),
        (ActivityLabourRequirement, 'labour'),
        (ActivityEquipmentRequirement, 'plant_equipment'),
    ]

    for Model, group_type in TYPE_MAP:
        orphaned = Model.objects.filter(group__isnull=True)
        activity_ids = set(orphaned.values_list('activity_id', flat=True))

        groups_by_activity = {}
        for activity_id in activity_ids:
            group, _ = RequirementGroup.objects.get_or_create(
                activity_id=activity_id, group_type=group_type,
                defaults={'status': 'assigned'},
            )
            groups_by_activity[activity_id] = group.id

        for item in orphaned:
            item.group_id = groups_by_activity[item.activity_id]
            item.save(update_fields=['group'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('planning', '0011_activityequipmentrequirement_required_from_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_groups, noop_reverse),
    ]