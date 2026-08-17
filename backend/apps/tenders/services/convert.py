"""
Kept separate from views.py so this can be unit-tested and reused
without going through the HTTP layer — same reasoning as
apps.boq.services.import_commit being split from views_import.py.
"""
from django.utils import timezone


def convert_tender_to_project(tender, extra_data, user):
    from apps.projects.models import Project
    from apps.boq.models import BOQ, BOQSection, BOQItem, Unit

    project = Project.objects.create(
        company=tender.company,
        name=extra_data.get('project_name') or tender.title,
        client_id=extra_data.get('client'),
        project_manager_id=extra_data.get('project_manager'),
        start_date=extra_data.get('start_date'),
    )

    # COPY, not reassign — tender.boq_items/boq_sections live in their
    # own tables (TenderBOQItem/TenderBOQSection), completely separate
    # from apps.boq.BOQ. This creates a brand new, perfectly normal
    # BOQ for the project — same pattern as BOQViewSet.duplicate().
    if tender.boq_item_count > 0:
        boq = BOQ.objects.create(
            project=project,
            title=f'{tender.title} — BOQ',
            source='manual',
            integration_mode='cost_tracking',
            status='active',
            created_by=user,
        )

        section_map = {}
        for section in tender.boq_sections.order_by('parent_id', 'order'):
            new_section = BOQSection.objects.create(
                boq=boq,
                parent=section_map.get(section.parent_id),
                code=section.code,
                title=section.title,
                order=section.order,
            )
            section_map[section.id] = new_section

        # TenderBOQItem.unit is a plain CharField; real BOQItem.unit is
        # a FK to apps.boq.Unit — look up (or create) the matching Unit
        # row per distinct code used, rather than one query per item.
        unit_codes = set(tender.boq_items.values_list('unit', flat=True))
        unit_lookup = {}
        for code in unit_codes:
            unit_obj, _ = Unit.objects.get_or_create(code=code, defaults={'name': code})
            unit_lookup[code] = unit_obj

        BOQItem.objects.bulk_create([
            BOQItem(
                boq=boq,
                section=section_map.get(item.section_id),
                item_code=item.item_code,
                description=item.description,
                unit=unit_lookup[item.unit],
                quantity=item.quantity,
                rate=item.rate,
                order=item.order,
            )
            for item in tender.boq_items.all()
        ])

        from apps.budget.services.generate import generate_budget_from_boq
        generate_budget_from_boq(project, boq)

    tender.converted_project = project
    tender.converted_at = timezone.now()
    tender.save(update_fields=['converted_project', 'converted_at'])

    return project