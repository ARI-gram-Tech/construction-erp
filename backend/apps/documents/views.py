# apps/documents/views.py
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Document, DocumentVersion
from .serializers import DocumentSerializer, DocumentUploadSerializer, DocumentVersionSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    """
    GET  /api/documents/?project=12         — project-scoped
    GET  /api/documents/?company_only=true   — company-level only (no project)
    GET  /api/documents/                     — everything in the company
    POST /api/documents/                     — multipart upload, creates v1
    GET/POST /api/documents/{id}/versions/   — history / new version
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.company_id:
            return Document.objects.none()
        qs = Document.objects.filter(company_id=user.company_id)

        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        elif self.request.query_params.get('company_only') == 'true':
            qs = qs.filter(project__isnull=True)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentUploadSerializer
        return DocumentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        return Response(
            DocumentSerializer(document, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get', 'post'], url_path='versions')
    def versions(self, request, pk=None):
        document = self.get_object()

        if request.method == 'POST':
            file = request.data.get('file')
            if not file:
                return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)
            last_version = document.versions.first()
            next_number = (last_version.version_number if last_version else 0) + 1
            version = DocumentVersion.objects.create(
                document=document, file=file, version_number=next_number, uploaded_by=request.user,
            )
            return Response(
                DocumentVersionSerializer(version, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )

        versions = document.versions.all()
        return Response(DocumentVersionSerializer(versions, many=True, context={'request': request}).data)