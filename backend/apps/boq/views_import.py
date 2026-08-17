# apps/boq/views_import.py
"""
Module 2 (manual mapping) + Module 5 (AI import), same flow.

Three-step flow, matching the "never auto-import without review" rule:
  1. POST  .../import-sessions/               upload file. Grid files
                                               (.xlsx/.csv) get a
                                               guessed column mapping;
                                               PDF/image files get AI
                                               extraction automatically
                                               (see ai_parser.py).
  2. POST  .../import-sessions/{id}/preview/  re-run preview after the
                                               user edits the mapping
                                               (grid path) or edits
                                               individual rows (AI
                                               path). No DB writes.
  3. POST  .../import-sessions/{id}/confirm/  validate for real and,
                                               if clean (or forced),
                                               commit BOQSection/
                                               BOQItem rows.

Nothing in steps 1-2 touches BOQSection/BOQItem — only confirm() does,
and only after zero errors or an explicit force=true. This is
identical between the grid and AI paths on purpose: the reviewer gets
the same guarantees regardless of how the rows were produced.
"""
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from apps.projects.models import Project
from .models import BOQ, BOQImportSession, Unit
from .permissions import BOQImportSessionPermission
from .serializers import BOQImportSessionSerializer, BOQSerializer
from .services import import_parser, import_commit, ai_parser


class BOQImportSessionViewSet(viewsets.ModelViewSet):
    """
    Nested under a project: /api/boq/projects/{project_pk}/import-sessions/
    List/retrieve double as import history for the project.
    """
    serializer_class = BOQImportSessionSerializer
    permission_classes = [BOQImportSessionPermission]
    http_method_names = ['get', 'post']  # sessions are never edited directly, only via actions

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], company=self.request.user.company
        )

    def get_queryset(self):
        return BOQImportSession.objects.filter(project=self.get_project())

    def create(self, request, project_pk=None):
        """
        Upload step. Accepts multipart: file=<upload>.
        Branches automatically on file type:
          - .xlsx/.csv           -> grid parsing + guessed column mapping
          - .pdf/.png/.jpg/.jpeg -> AI extraction (ai_parser.py)
        Either way, nothing is written to BOQSection/BOQItem yet.
        """
        project = self.get_project()
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

        filename = uploaded_file.name

        if ai_parser.is_ai_required(filename):
            return self._create_ai_session(request, project, uploaded_file)
        return self._create_grid_session(request, project, uploaded_file)

    def _create_grid_session(self, request, project, uploaded_file):
        try:
            grid = import_parser.extract_grid(uploaded_file, uploaded_file.name)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if not grid:
            return Response({'detail': 'File appears to be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        header_row_index = import_parser.guess_header_row(grid)
        suggested_mapping = import_parser.suggest_mapping(grid[header_row_index])

        uploaded_file.seek(0)  # extract_grid() consumed the pointer; rewind before saving
        session = BOQImportSession.objects.create(
            project=project,
            file=uploaded_file,
            import_mode='manual_mapping',
            column_mapping={'source': 'grid', 'header_row_index': header_row_index, 'fields': suggested_mapping},
            status='pending_review',
            created_by=request.user,
        )

        preview = import_parser.build_preview(grid, header_row_index, suggested_mapping)

        return Response({
            'session': BOQImportSessionSerializer(session).data,
            'header_row_index': header_row_index,
            'available_columns': grid[header_row_index],
            'preview': preview,
        }, status=status.HTTP_201_CREATED)

    def _create_ai_session(self, request, project, uploaded_file):
        file_bytes = uploaded_file.read()
        try:
            result = ai_parser.extract_via_ai(file_bytes, uploaded_file.name)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        uploaded_file.seek(0)
        session = BOQImportSession.objects.create(
            project=project,
            file=uploaded_file,
            import_mode='ai_import',
            column_mapping={'source': 'ai', 'rows': result['rows']},
            confidence_score=result.get('overall_confidence'),
            status='pending_review',
            created_by=request.user,
        )

        mapped_rows = ai_parser.ai_rows_to_mapped_rows(result['rows'])

        return Response({
            'session': BOQImportSessionSerializer(session).data,
            'preview': mapped_rows[:20],
            'overall_confidence': result.get('overall_confidence'),
            'notes': result.get('notes', ''),
        }, status=status.HTTP_201_CREATED)

    def _get_session(self, project_pk, pk):
        return get_object_or_404(
            BOQImportSession, pk=pk, project__company=self.request.user.company, project_id=project_pk,
        )

    def _load_grid(self, session):
        session.file.open('rb')
        try:
            return import_parser.extract_grid(session.file, session.file.name)
        finally:
            session.file.close()

    @action(detail=True, methods=['post'])
    def preview(self, request, project_pk=None, pk=None):
        """
        Re-runs preview WITHOUT writing anything to the DB.

        Grid sessions: body may include {"fields": {...}, "header_row_index": N}
        to correct the column mapping.

        AI sessions: body may include {"rows": [...]} — a full replacement
        of the AI's extracted rows, letting the reviewer fix individual
        field values (not just re-map columns, since there are no columns).
        Omit "rows" to just re-validate what's currently stored.
        """
        session = self._get_session(project_pk, pk)
        unit_lookup = {u.code.lower(): u for u in Unit.objects.all()}

        if session.column_mapping.get('source') == 'ai':
            rows = request.data.get('rows', session.column_mapping.get('rows', []))
            session.column_mapping = {'source': 'ai', 'rows': rows}
            session.save(update_fields=['column_mapping'])

            mapped_rows = ai_parser.ai_rows_to_mapped_rows(rows)
            valid_rows, errors = import_parser.validate_mapped_rows(mapped_rows, unit_lookup)

            return Response({
                'session': BOQImportSessionSerializer(session).data,
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
            'session': BOQImportSessionSerializer(session).data,
            'available_columns': grid[header_row_index] if header_row_index < len(grid) else [],
            'preview': preview,
            'validation': validation,
        })

    @action(detail=True, methods=['post'])
    def confirm(self, request, project_pk=None, pk=None):
        """
        Body:
          boq_id       (optional) import into an existing BOQ
          boq_title    (optional) create a new BOQ with this title instead
          force        (optional, default false) if true, skip invalid
                       rows and import the rest; if false, ANY row error
                       blocks the whole import so nothing partial gets
                       committed silently
        """
        session = self._get_session(project_pk, pk)
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

        boq_id = request.data.get('boq_id')
        if boq_id:
            boq = get_object_or_404(BOQ, pk=boq_id, project=session.project)
        else:
            title = request.data.get('boq_title') or f'Imported BOQ ({session.file.name})'
            boq = BOQ.objects.create(
                project=session.project,
                title=title,
                source='import_ai' if session.import_mode == 'ai_import' else 'import_excel',
                created_by=request.user,
            )

        imported_count = import_commit.commit_import(boq, valid_rows)

        session.boq = boq
        session.status = 'approved'
        session.row_count = imported_count
        session.error_count = len(errors)
        session.save(update_fields=['boq', 'status', 'row_count', 'error_count'])

        return Response({
            'boq': BOQSerializer(boq).data,
            'imported_count': imported_count,
            'skipped_count': len(errors),
            'skipped_rows': errors if force else [],
        }, status=status.HTTP_201_CREATED)