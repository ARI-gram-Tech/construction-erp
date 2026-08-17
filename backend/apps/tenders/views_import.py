"""
Same three-step flow as apps.boq.views_import, reusing
apps.boq.services.import_parser / ai_parser AS IMPORTED TOOLS ONLY —
neither of those files is touched. Writes go into TenderBOQItem via
apps.tenders.services.import_commit, never into apps.boq's models.

  1. POST  .../import-sessions/               upload file
  2. POST  .../import-sessions/{id}/preview/  re-map / re-validate, no write
  3. POST  .../import-sessions/{id}/confirm/  commit TenderBOQItem rows
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.boq.models import Unit
from apps.boq.services import import_parser, ai_parser
from .models import Tender, TenderBOQImportSession
from .permissions import TenderBOQNestedPermission
from .serializers import TenderBOQImportSessionSerializer, TenderSerializer
from .services import import_commit


class TenderBOQImportSessionViewSet(viewsets.ModelViewSet):
    """Nested under a tender: /api/tenders/{tender_pk}/import-sessions/"""
    serializer_class = TenderBOQImportSessionSerializer
    permission_classes = [TenderBOQNestedPermission]
    http_method_names = ['get', 'post']

    def get_tender(self):
        return get_object_or_404(
            Tender, pk=self.kwargs['tender_pk'], company=self.request.user.company
        )

    def get_queryset(self):
        return TenderBOQImportSession.objects.filter(tender=self.get_tender())

    def create(self, request, tender_pk=None):
        tender = self.get_tender()
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

        filename = uploaded_file.name

        if ai_parser.is_ai_required(filename):
            return self._create_ai_session(request, tender, uploaded_file)
        return self._create_grid_session(request, tender, uploaded_file)

    def _create_grid_session(self, request, tender, uploaded_file):
        try:
            grid = import_parser.extract_grid(uploaded_file, uploaded_file.name)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not grid:
            return Response({'detail': 'File appears to be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        header_row_index = import_parser.guess_header_row(grid)
        suggested_mapping = import_parser.suggest_mapping(grid[header_row_index])

        uploaded_file.seek(0)
        session = TenderBOQImportSession.objects.create(
            tender=tender,
            file=uploaded_file,
            import_mode='manual_mapping',
            column_mapping={'source': 'grid', 'header_row_index': header_row_index, 'fields': suggested_mapping},
            status='pending_review',
            created_by=request.user,
        )

        preview = import_parser.build_preview(grid, header_row_index, suggested_mapping)

        return Response({
            'session': TenderBOQImportSessionSerializer(session).data,
            'header_row_index': header_row_index,
            'available_columns': grid[header_row_index],
            'preview': preview,
        }, status=status.HTTP_201_CREATED)

    def _create_ai_session(self, request, tender, uploaded_file):
        file_bytes = uploaded_file.read()
        try:
            result = ai_parser.extract_via_ai(file_bytes, uploaded_file.name)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        uploaded_file.seek(0)
        session = TenderBOQImportSession.objects.create(
            tender=tender,
            file=uploaded_file,
            import_mode='ai_import',
            column_mapping={'source': 'ai', 'rows': result['rows']},
            confidence_score=result.get('overall_confidence'),
            status='pending_review',
            created_by=request.user,
        )

        mapped_rows = ai_parser.ai_rows_to_mapped_rows(result['rows'])

        return Response({
            'session': TenderBOQImportSessionSerializer(session).data,
            'preview': mapped_rows[:20],
            'overall_confidence': result.get('overall_confidence'),
            'notes': result.get('notes', ''),
        }, status=status.HTTP_201_CREATED)

    def _get_session(self, tender_pk, pk):
        return get_object_or_404(
            TenderBOQImportSession, pk=pk, tender__company=self.request.user.company, tender_id=tender_pk,
        )

    def _load_grid(self, session):
        session.file.open('rb')
        try:
            return import_parser.extract_grid(session.file, session.file.name)
        finally:
            session.file.close()

    @action(detail=True, methods=['post'])
    def preview(self, request, tender_pk=None, pk=None):
        session = self._get_session(tender_pk, pk)
        unit_lookup = {u.code.lower(): u for u in Unit.objects.all()}

        if session.column_mapping.get('source') == 'ai':
            rows = request.data.get('rows', session.column_mapping.get('rows', []))
            session.column_mapping = {'source': 'ai', 'rows': rows}
            session.save(update_fields=['column_mapping'])

            mapped_rows = ai_parser.ai_rows_to_mapped_rows(rows)
            valid_rows, errors = import_parser.validate_mapped_rows(mapped_rows, unit_lookup)

            return Response({
                'session': TenderBOQImportSessionSerializer(session).data,
                'preview': mapped_rows[:20],
                'validation': {'valid_count': len(valid_rows), 'error_count': len(errors), 'errors': errors[:50]},
            })

        grid = self._load_grid(session)
        header_row_index = request.data.get('header_row_index', session.column_mapping.get('header_row_index', 0))
        fields = request.data.get('fields', session.column_mapping.get('fields', {}))
        fields = {k: (int(v) if v not in (None, '') else None) for k, v in fields.items()}

        session.column_mapping = {'source': 'grid', 'header_row_index': header_row_index, 'fields': fields}
        session.save(update_fields=['column_mapping'])

        preview = import_parser.build_preview(grid, header_row_index, fields)

        try:
            valid_rows, errors = import_parser.validate_rows(grid, header_row_index, fields, unit_lookup)
            validation = {'valid_count': len(valid_rows), 'error_count': len(errors), 'errors': errors[:50]}
        except ValueError as e:
            validation = {'valid_count': 0, 'error_count': 0, 'errors': [], 'not_ready': str(e)}

        return Response({
            'session': TenderBOQImportSessionSerializer(session).data,
            'available_columns': grid[header_row_index] if header_row_index < len(grid) else [],
            'preview': preview,
            'validation': validation,
        })

    @action(detail=True, methods=['post'])
    def confirm(self, request, tender_pk=None, pk=None):
        """
        Body: force (optional, default false) — same all-or-nothing
        semantics as apps.boq's confirm(). No boq_id/boq_title here:
        a tender has at most one implicit "BOQ" (its own boq_items),
        so rows always land directly on the tender, no picker needed.
        """
        session = self._get_session(tender_pk, pk)
        if session.status == 'approved':
            return Response(
                {'detail': 'This import session was already approved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        unit_lookup = {u.code.lower(): u for u in Unit.objects.all()}

        if session.column_mapping.get('source') == 'ai':
            mapped_rows = ai_parser.ai_rows_to_mapped_rows(session.column_mapping.get('rows', []))
            valid_rows, errors = import_parser.validate_mapped_rows(mapped_rows, unit_lookup)
        else:
            grid = self._load_grid(session)
            header_row_index = session.column_mapping.get('header_row_index', 0)
            fields = session.column_mapping.get('fields', {})
            try:
                valid_rows, errors = import_parser.validate_rows(grid, header_row_index, fields, unit_lookup)
            except ValueError as e:
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        force = bool(request.data.get('force', False))
        if errors and not force:
            return Response({
                'detail': f'{len(errors)} row(s) failed validation. Fix them or re-submit with force=true to skip them.',
                'errors': errors,
                'valid_count': len(valid_rows),
            }, status=status.HTTP_400_BAD_REQUEST)

        imported_count = import_commit.commit_import(session.tender, valid_rows)

        session.status = 'approved'
        session.row_count = imported_count
        session.error_count = len(errors)
        session.save(update_fields=['status', 'row_count', 'error_count'])

        return Response({
            'tender': TenderSerializer(session.tender, context={'request': request}).data,
            'imported_count': imported_count,
            'skipped_count': len(errors),
            'skipped_rows': errors if force else [],
        }, status=status.HTTP_201_CREATED)