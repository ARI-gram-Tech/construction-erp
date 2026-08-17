# apps/variations/views.py
"""
Same project-scoping pattern as apps.budget/apps.boq/apps.planning.
"""
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from .models import Variation, InterimPaymentCertificate
from .serializers import VariationSerializer, InterimPaymentCertificateSerializer
from .services.apply import apply_variation
from .services.ipc_calc import calculate_ipc
from .services.ipc_pdf import generate_ipc_pdf


class ProjectScopedMixin:
    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], company=self.request.user.company
        )


class VariationViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    serializer_class = VariationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        return Variation.objects.filter(project=self.get_project())

    def perform_create(self, serializer):
        project = self.get_project()
        last = Variation.objects.filter(project=project).order_by('-number').first()
        next_number = (last.number if last else 0) + 1
        serializer.save(project=project, number=next_number, requested_by=self.request.user, status='draft')

    def perform_update(self, serializer):
        variation = self.get_object()
        if variation.status in ('approved', 'rejected'):
            raise ValidationError('Decided variations cannot be edited. Create a new variation instead.')
        serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, project_pk=None, pk=None):
        """draft -> pending_approval. Optional step — approve() also works directly from draft."""
        variation = self.get_object()
        if variation.status != 'draft':
            return Response({'detail': 'Only draft variations can be submitted.'}, status=400)
        variation.status = 'pending_approval'
        variation.save(update_fields=['status'])
        return Response(VariationSerializer(variation).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, project_pk=None, pk=None):
        """
        The one sanctioned way to change a locked budget line's
        approved_amount — see services/apply.py. Works regardless of
        whether the parent Budget is locked; that's the entire point
        of a variation existing.
        """
        variation = self.get_object()
        if variation.status not in ('draft', 'pending_approval'):
            return Response({'detail': f'Cannot approve a variation with status "{variation.status}".'}, status=400)

        variation.status = 'approved'
        variation.decided_by = request.user
        variation.decided_at = timezone.now()
        variation.save(update_fields=['status', 'decided_by', 'decided_at'])

        apply_variation(variation)

        return Response(VariationSerializer(variation).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, project_pk=None, pk=None):
        variation = self.get_object()
        if variation.status not in ('draft', 'pending_approval'):
            return Response({'detail': f'Cannot reject a variation with status "{variation.status}".'}, status=400)

        variation.status = 'rejected'
        variation.decided_by = request.user
        variation.decided_at = timezone.now()
        variation.save(update_fields=['status', 'decided_by', 'decided_at'])
        return Response(VariationSerializer(variation).data)


class InterimPaymentCertificateViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    """
    POST here doubles as "generate" — the computed fields aren't
    user-supplied, they're derived from work_done_amount/retention/VAT
    plus the previous certificate's snapshot, at creation time.
    """
    serializer_class = InterimPaymentCertificateSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'patch']  # certificates are never deleted, only issued or left draft

    def get_queryset(self):
        return InterimPaymentCertificate.objects.filter(project=self.get_project())

    def perform_create(self, serializer):
        project = self.get_project()
        last = InterimPaymentCertificate.objects.filter(project=project).order_by('-certificate_number').first()
        next_number = (last.certificate_number if last else 0) + 1
        previous_gross = last.gross_amount if last else 0

        data = serializer.validated_data
        computed = calculate_ipc(
            work_done_amount=data['work_done_amount'],
            retention_percent=data.get('retention_percent', 10),
            vat_percent=data.get('vat_percent', 16),
            previous_gross_certified=previous_gross,
            advance_recovery_amount=data.get('advance_recovery_amount', 0),
        )

        serializer.save(
            project=project,
            certificate_number=next_number,
            previous_gross_certified=previous_gross,
            created_by=self.request.user,
            status='draft',
            **computed,
        )

    def perform_update(self, serializer):
        ipc = self.get_object()
        if ipc.status == 'issued':
            raise ValidationError('Issued certificates cannot be edited.')
        # Re-run the calculation if any input changed, so a draft edit
        # doesn't leave stale computed figures sitting alongside new inputs.
        data = {**serializer.instance.__dict__, **serializer.validated_data}
        computed = calculate_ipc(
            work_done_amount=data['work_done_amount'],
            retention_percent=data['retention_percent'],
            vat_percent=data['vat_percent'],
            previous_gross_certified=ipc.previous_gross_certified,
            advance_recovery_amount=data['advance_recovery_amount'],
        )
        serializer.save(**computed)

    @action(detail=True, methods=['post'])
    def issue(self, request, project_pk=None, pk=None):
        ipc = self.get_object()
        if ipc.status == 'issued':
            return Response({'detail': 'Already issued.'}, status=400)
        ipc.status = 'issued'
        ipc.issued_at = timezone.now()
        ipc.save(update_fields=['status', 'issued_at'])
        return Response(InterimPaymentCertificateSerializer(ipc).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, project_pk=None, pk=None):
        ipc = self.get_object()
        if ipc.status != 'issued':
            return Response(
                {'detail': 'Issue the certificate before exporting a PDF — draft figures can still change.'},
                status=400,
            )
        buffer = generate_ipc_pdf(ipc)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="IPC-{ipc.certificate_number}-{ipc.project.name}.pdf"'
        return response