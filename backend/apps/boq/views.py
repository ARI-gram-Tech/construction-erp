# apps/boq/views.py
"""
Same project-scoping pattern as apps.planning and apps.team:
project_pk from the URL, get_project()/get_boq() confirm ownership
via request.user.company before anything is queried or created.
"""
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from apps.documents.models import Document, DocumentVersion
from apps.planning.models import Activity
from .models import BOQ, BOQRevision, BOQSection, BOQItem, Unit, BOQItemFlag
from .permissions import BOQPermission, BOQNestedPermission
from .permissions_activity import ActivityBOQPermission
from .serializers import (
    BOQSerializer,
    BOQRevisionSerializer,
    BOQSectionSerializer,
    BOQItemSerializer,
    UnitSerializer,
    BOQItemFlagSerializer,
)


class ProjectScopedMixin:
    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], company=self.request.user.company
        )

    def perform_create(self, serializer):
        serializer.save(project=self.get_project())


class UnitViewSet(viewsets.ReadOnlyModelViewSet):
    """Shared reference data — not project/company scoped."""
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [permissions.IsAuthenticated]


class BOQViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    serializer_class = BOQSerializer
    permission_classes = [BOQPermission]

    def get_queryset(self):
        return BOQ.objects.filter(project=self.get_project())

    def perform_create(self, serializer):
        serializer.save(project=self.get_project(), created_by=self.request.user, source='manual')

    @action(detail=False, methods=['post'], url_path='reference')
    def create_reference(self, request, project_pk=None):
        """
        Mode 1 from the original design: "just store the file, no cost
        tracking." Unlike the earlier version of this feature, this
        creates a REAL BOQ row (item-less, integration_mode='reference')
        rather than only a Document — so it actually shows up in
        "Total BOQs" / "Recent BOQs" instead of only existing in a
        different module the QS isn't looking at. The uploaded file
        itself is still stored as a normal Document (category='boq'),
        linked via reference_document, and rendered in-app by
        BOQDetailPage instead of a sections/items editor.
        """
        project = self.get_project()
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
        title = request.data.get('title') or uploaded_file.name

        document = Document.objects.create(
            company=project.company, project=project, category='boq',
            name=title, uploaded_by=request.user,
        )
        DocumentVersion.objects.create(
            document=document, file=uploaded_file, version_number=1, uploaded_by=request.user,
        )

        boq = BOQ.objects.create(
            project=project, title=title, source='manual',
            integration_mode='reference', reference_document=document,
            created_by=request.user,
        )
        return Response(
            BOQSerializer(boq, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def duplicate(self, request, project_pk=None, pk=None):
        """
        Deep-copies a BOQ: sections first (preserving parent/child
        relationships via an old-id -> new-section map), then items
        pointing at the new sections. The clone is fully independent —
        editing it never touches the original.

        wbs/activity links are deliberately NOT copied onto the clone's
        items: a duplicate is a new draft, and silently inheriting
        another BOQ's schedule linkage would be a surprising default.
        """
        original = self.get_object()
        clone = BOQ.objects.create(
            project=original.project,
            title=f'{original.title} (Copy)',
            currency=original.currency,
            status='draft',
            source=original.source,
            link_mode=original.link_mode,
            integration_mode=original.integration_mode,
            created_by=request.user,
        )

        section_map = {}
        for section in original.sections.order_by('parent_id', 'order'):
            new_section = BOQSection.objects.create(
                boq=clone,
                parent=section_map.get(section.parent_id),
                code=section.code,
                title=section.title,
                order=section.order,
            )
            section_map[section.id] = new_section

        BOQItem.objects.bulk_create([
            BOQItem(
                boq=clone,
                section=section_map.get(item.section_id),
                item_code=item.item_code,
                description=item.description,
                unit=item.unit,
                quantity=item.quantity,
                rate=item.rate,
                order=item.order,
            )
            for item in original.items.all()
        ])

        return Response(BOQSerializer(clone).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='new-revision')
    def new_revision(self, request, project_pk=None, pk=None):
        """
        Snapshots the current revision number forward. Unlike
        ProjectBaseline (which freezes activity data into
        BaselineActivity rows), this only stamps a new revision marker —
        sections/items aren't versioned per-revision yet. Good enough
        for "which revision are we on" today; revisit if you need to
        diff revision 2 against revision 3 later.
        """
        boq = self.get_object()
        last = boq.revisions.first()
        next_number = (last.revision_number if last else 0) + 1
        boq.revisions.update(is_current=False)
        revision = BOQRevision.objects.create(
            boq=boq,
            revision_number=next_number,
            reason=request.data.get('reason', ''),
            created_by=request.user,
            is_current=True,
        )
        return Response(BOQRevisionSerializer(revision).data, status=status.HTTP_201_CREATED)


class BOQRevisionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only — revisions are created via BOQViewSet.new_revision(), never edited directly."""
    serializer_class = BOQRevisionSerializer
    permission_classes = [BOQNestedPermission]

    def get_boq(self):
        # project_id=project_pk (not just project__company) matters: two
        # BOQs in the same company but different projects must never be
        # reachable through the wrong project's URL — the project_pk in
        # the path has to actually mean something, not just be decorative.
        return get_object_or_404(
            BOQ,
            pk=self.kwargs['boq_pk'],
            project_id=self.kwargs['project_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return BOQRevision.objects.filter(boq=self.get_boq())


class BOQSectionViewSet(viewsets.ModelViewSet):
    serializer_class = BOQSectionSerializer
    permission_classes = [BOQNestedPermission]

    def get_boq(self):
        return get_object_or_404(
            BOQ,
            pk=self.kwargs['boq_pk'],
            project_id=self.kwargs['project_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return BOQSection.objects.filter(boq=self.get_boq())

    def perform_create(self, serializer):
        serializer.save(boq=self.get_boq())


class BOQItemViewSet(viewsets.ModelViewSet):
    serializer_class = BOQItemSerializer
    permission_classes = [BOQNestedPermission]

    def get_boq(self):
        return get_object_or_404(
            BOQ,
            pk=self.kwargs['boq_pk'],
            project_id=self.kwargs['project_pk'],
            project__company=self.request.user.company,
        )

    def get_queryset(self):
        return BOQItem.objects.filter(boq=self.get_boq()).select_related('unit', 'wbs', 'activity')

    def _validate_planning_links(self, serializer, boq):
        """
        wbs/activity are optional cross-app links into apps.planning —
        but if set, they MUST belong to the same project as this BOQ.
        Without this check, someone could link a BOQItem to another
        project's WBS node or Activity, which would both corrupt the
        data and leak the existence/naming of another project's
        schedule structure to whoever can see this BOQ item.
        """
        wbs = serializer.validated_data.get('wbs')
        if wbs is not None and wbs.project_id != boq.project_id:
            raise ValidationError({'wbs': 'This WBS section belongs to a different project.'})

        activity = serializer.validated_data.get('activity')
        if activity is not None and activity.project_id != boq.project_id:
            raise ValidationError({'activity': 'This activity belongs to a different project.'})

    def perform_create(self, serializer):
        boq = self.get_boq()
        self._validate_planning_links(serializer, boq)
        serializer.save(boq=boq)

    def perform_update(self, serializer):
        boq = self.get_boq()
        self._validate_planning_links(serializer, boq)
        serializer.save()



class ActivityBOQView(viewsets.ViewSet):
    """
    Two read-only-ish endpoints scoped to a single planning Activity,
    not a specific BOQ — an activity's linked items can come from any
    BOQ in the project, so this can't nest under BOQViewSet.
    """
    permission_classes = [ActivityBOQPermission]

    def get_activity(self):
        return get_object_or_404(
            Activity, pk=self.kwargs['activity_pk'],
            project_id=self.kwargs['project_pk'],
            project__company=self.request.user.company,
        )

    def list(self, request, project_pk=None, activity_pk=None):
        """GET — linked BOQ items for this activity, across all BOQs in the project."""
        activity = self.get_activity()
        items = BOQItem.objects.filter(
            boq__project_id=project_pk, activity=activity,
        ).select_related('unit', 'boq')
        return Response(BOQItemSerializer(items, many=True, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def flag(self, request, project_pk=None, activity_pk=None):
        """POST — planner raises a concern; notifies every QS on the project's company."""
        activity = self.get_activity()
        note = request.data.get('note', '').strip()
        if not note:
            return Response({'detail': 'note is required.'}, status=400)

        boq_item_id = request.data.get('boq_item')
        flag = BOQItemFlag.objects.create(
            activity=activity,
            boq_item_id=boq_item_id or None,
            note=note,
            raised_by=request.user,
        )

        from apps.notifications.utils import notify
        from apps.accounts.models import User
        for qs_user in User.objects.filter(company=activity.project.company, role='qs'):
            notify(
                qs_user, title=f'BOQ concern flagged on "{activity.name}"',
                message=note, level='warning',
                link=f'/projects/{activity.project_id}/boq',
            )
        return Response(BOQItemFlagSerializer(flag).data, status=201)