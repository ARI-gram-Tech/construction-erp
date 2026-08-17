# apps/boq/migrations/0004_importsession_health_fields.py
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('boq', '0003_boqitem_budget_line'),
    ]

    operations = [
        migrations.AddField(
            model_name='boqimportsession',
            name='row_count',
            field=models.PositiveIntegerField(blank=True, help_text='Rows successfully imported.', null=True),
        ),
        migrations.AddField(
            model_name='boqimportsession',
            name='error_count',
            field=models.PositiveIntegerField(blank=True, help_text='Rows skipped due to validation errors.', null=True),
        ),
    ]