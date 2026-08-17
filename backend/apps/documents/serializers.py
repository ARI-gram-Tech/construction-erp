# apps/documents/serializers.py
from rest_framework import serializers

from .models import Document, DocumentVersion


class DocumentVersionSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.email', read_only=True)

    class Meta:
        model = DocumentVersion
        fields = ['id', 'document', 'file', 'version_number', 'uploaded_by', 'uploaded_by_name', 'created_at']
        read_only_fields = ['document', 'version_number', 'uploaded_by']


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.email', read_only=True)
    latest_version = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'company', 'project', 'category', 'name',
            'uploaded_by', 'uploaded_by_name', 'latest_version',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['company', 'uploaded_by']

    def get_latest_version(self, obj):
        version = obj.versions.first()
        return DocumentVersionSerializer(version, context=self.context).data if version else None


class DocumentUploadSerializer(serializers.Serializer):
    """
    Used only for POST /api/documents/ — creates the Document AND its first
    DocumentVersion in one call, same pattern as CompanyRegistrationSerializer.
    """
    name = serializers.CharField(max_length=255)
    category = serializers.ChoiceField(choices=Document.CATEGORY_CHOICES)
    project = serializers.IntegerField(required=False, allow_null=True)
    file = serializers.FileField()

    def create(self, validated_data):
        request = self.context['request']
        project_id = validated_data.pop('project', None)
        file = validated_data.pop('file')

        document = Document.objects.create(
            company=request.user.company,
            project_id=project_id,
            uploaded_by=request.user,
            **validated_data,
        )
        DocumentVersion.objects.create(
            document=document, file=file, version_number=1, uploaded_by=request.user,
        )
        return document