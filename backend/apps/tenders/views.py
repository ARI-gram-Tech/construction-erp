"""
Company-scoped — no project_pk anywhere, matching apps.inventory's
CompanyScopedMixin pattern rather than apps.boq's ProjectScopedMixin.
"""
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.documents.models import Document, DocumentVersion
from .models import Tender, TenderBOQSection, TenderBOQItem
from .permissions import TenderPermission, TenderBOQNestedPermission, can_view_tender
from .serializers import (
    TenderSerializer,
    TenderBOQSectionSerializer,
    TenderBOQItemSerializer,
    TenderReferenceUploadSerializer,
    ConvertToProjectSerializer,
    RecordOutcomeSerializer,
)


class CompanyScopedMixin:
    def get_company(self):
        return self.request.user.company


class TenderViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    serializer_class = TenderSerializer
    permission_classes = [TenderPermission]

    def get_queryset(self):
        company = self.get_company()
        if company is None:
            return Tender.objects.none()
        qs = Tender.objects.filter(company=company).select_related(
            'assigned_qs', 'reference_document', 'converted_project',
        )
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        mode_param = self.request.query_params.get('mode')
        if mode_param:
            qs = qs.filter(mode=mode_param)
        return qs

    def perform_create(self, serializer):
        # Company-wide managers can create a tender pre-assigned to any
        # QS; a QS creating their own tender is auto-assigned to
        # themselves unless they explicitly hand it to someone else.
        assigned_qs = serializer.validated_data.get('assigned_qs')
        if assigned_qs is None and self.request.user.role == 'qs':
            serializer.save(
                company=self.get_company(), created_by=self.request.user,
                assigned_qs=self.request.user, mode='active', status='opportunity',
            )
        else:
            serializer.save(company=self.get_company(), created_by=self.request.user)

    @action(detail=False, methods=['post'], url_path='reference')
    def create_reference(self, request):
        """
        Mode: 'reference' — just file the tender document. Same shape
        as BOQViewSet.create_reference(): stores the file as a real
        Document (category='tender'), then a real Tender row so it
        shows up in the Tenders list, not just Documents.
        """
        company = self.get_company()
        serializer = TenderReferenceUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        document = Document.objects.create(
            company=company, project=None, category='tender',
            name=data['title'], uploaded_by=request.user,
        )
        DocumentVersion.objects.create(
            document=document, file=data['file'], version_number=1, uploaded_by=request.user,
        )

        tender = Tender.objects.create(
            company=company, title=data['title'], client_name=data.get('client_name', ''),
            mode='reference', status='filed',
            reference_document=document, created_by=request.user,
        )
        return Response(
            TenderSerializer(tender, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def promote(self, request, pk=None):
        """
        Reference-only -> active pricing pipeline. Doesn't touch the
        reference_document — it stays attached for context (the
        original tender notice/RFP), it just stops being the ONLY
        thing this tender is.
        """
        tender = self.get_object()
        if tender.mode != 'reference':
            raise ValidationError('Only a reference-only tender can be promoted.')
        tender.mode = 'active'
        tender.status = 'opportunity'
        if tender.assigned_qs_id is None and request.user.role == 'qs':
            tender.assigned_qs = request.user
        tender.save(update_fields=['mode', 'status', 'assigned_qs'])
        return Response(TenderSerializer(tender, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        tender = self.get_object()
        if tender.mode != 'active':
            raise ValidationError('Only an active tender can be submitted.')
        if tender.status != 'pricing':
            raise ValidationError(f'Cannot submit from status "{tender.status}".')

        submitted_price = request.data.get('submitted_price')
        if submitted_price is None:
            submitted_price = TenderSerializer(tender).data['tender_price']

        tender.submitted_price = submitted_price
        tender.submitted_at = timezone.now()
        tender.status = 'submitted'
        tender.save(update_fields=['submitted_price', 'submitted_at', 'status'])
        return Response(TenderSerializer(tender, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='record-outcome')
    def record_outcome(self, request, pk=None):
        """
        Body: { outcome: 'won'|'lost'|'withdrawn', loss_reason?, loss_notes? }
        Matches the roadmap's "require/allow reason for loss" feature —
        loss_reason is only meaningful when outcome='lost', but not
        enforced as required so a quick "mark lost" doesn't get blocked
        on filling in a reason immediately.

        two legal starting points, not one:
          mode='active'    -> must be 'submitted' first (went through
                               real pricing/submission).
          mode='reference' -> can jump straight from 'filed', since a
                               reference-only tender never goes through
                               pricing at all (e.g. a negotiated award
                               logged after the fact, no competitive
                               submission to record).
        """
        tender = self.get_object()
        if tender.mode == 'active' and tender.status != 'submitted':
            raise ValidationError('Only a submitted tender can have its outcome recorded.')
        if tender.mode == 'reference' and tender.status != 'filed':
            raise ValidationError(f'Cannot record an outcome from status "{tender.status}".')

        serializer = RecordOutcomeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tender.status = data['outcome']
        tender.outcome_decided_at = timezone.now()
        if data['outcome'] == 'lost':
            tender.loss_reason = data.get('loss_reason', '')
            tender.loss_notes = data.get('loss_notes', '')
        tender.save(update_fields=['status', 'outcome_decided_at', 'loss_reason', 'loss_notes'])
        return Response(TenderSerializer(tender, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='convert-to-project')
    def convert_to_project(self, request, pk=None):
        """
        One-click: Won tender -> new Project -> BOQ reassigned onto it
        -> initial Budget generated from that BOQ. See services/convert.py
        for the actual logic — kept out of the view so it's testable and
        reusable without going through the HTTP layer.
        """
        tender = self.get_object()
        if tender.status != 'won':
            raise ValidationError('Only a won tender can be converted to a project.')
        if tender.converted_project_id is not None:
            raise ValidationError(f'This tender was already converted (project #{tender.converted_project_id}).')

        serializer = ConvertToProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from .services.convert import convert_tender_to_project
        with transaction.atomic():
            project = convert_tender_to_project(tender, serializer.validated_data, request.user)

        return Response(TenderSerializer(tender, context={'request': request}).data, status=201)


class TenderBOQSectionViewSet(viewsets.ModelViewSet):
    serializer_class = TenderBOQSectionSerializer
    permission_classes = [TenderBOQNestedPermission]

    def get_tender(self):
        return get_object_or_404(
            Tender, pk=self.kwargs['tender_pk'], company=self.request.user.company
        )

    def get_queryset(self):
        return TenderBOQSection.objects.filter(tender=self.get_tender())

    def perform_create(self, serializer):
        serializer.save(tender=self.get_tender())


class TenderBOQItemViewSet(viewsets.ModelViewSet):
    serializer_class = TenderBOQItemSerializer
    permission_classes = [TenderBOQNestedPermission]

    def get_tender(self):
        return get_object_or_404(
            Tender, pk=self.kwargs['tender_pk'], company=self.request.user.company
        )

    def get_queryset(self):
        return TenderBOQItem.objects.filter(tender=self.get_tender()).select_related('section')

    def _validate_section(self, serializer, tender):
        """
        Same cross-tenant guard as apps.boq.BOQItemViewSet._validate_planning_links —
        a section FK must belong to THIS tender, not another one.
        """
        section = serializer.validated_data.get('section')
        if section is not None and section.tender_id != tender.id:
            raise ValidationError({'section': 'This section belongs to a different tender.'})

    def perform_create(self, serializer):
        tender = self.get_tender()
        self._validate_section(serializer, tender)
        serializer.save(tender=tender)

    def perform_update(self, serializer):
        tender = self.get_tender()
        self._validate_section(serializer, tender)
        serializer.save()