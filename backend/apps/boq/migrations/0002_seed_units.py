# apps/boq/migrations/0002_seed_units.py
"""
Seeds the Unit table with the measurement units that show up in almost
every construction BOQ regardless of format (FIDIC/NCA/KeRRA/custom).
Reversible: migrating backward deletes exactly these rows, so it's
safe to run in dev/staging repeatedly without leaving orphans.
"""
from django.db import migrations

UNITS = [
    ('m', 'Metre'),
    ('m2', 'Square metre'),
    ('m3', 'Cubic metre'),
    ('mm', 'Millimetre'),
    ('km', 'Kilometre'),
    ('kg', 'Kilogram'),
    ('ton', 'Tonne'),
    ('l', 'Litre'),
    ('no', 'Number / Each'),
    ('Ls', 'Lump sum'),
    ('hr', 'Hour'),
    ('day', 'Day'),
    ('bag', 'Bag'),
    ('roll', 'Roll'),
    ('set', 'Set'),
    ('pair', 'Pair'),
]


def seed_units(apps, schema_editor):
    Unit = apps.get_model('boq', 'Unit')
    for code, name in UNITS:
        Unit.objects.get_or_create(code=code, defaults={'name': name})


def remove_units(apps, schema_editor):
    Unit = apps.get_model('boq', 'Unit')
    codes = [code for code, _ in UNITS]
    Unit.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('boq', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_units, remove_units),
    ]