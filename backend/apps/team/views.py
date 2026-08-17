# apps/team/views.py
"""
Same project-scoping pattern as apps.planning: project_pk comes from the
URL, and get_project() double-checks it belongs to request.user.company
so tenant isolation holds even if someone guesses a project ID.
"""
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import User
from apps.projects.models import Project
from .models import ProjectMember
from .permissions import ProjectMemberPermission
from .serializers import ProjectMemberSerializer


class ProjectMemberViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMemberSerializer
    permission_classes = [ProjectMemberPermission]

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], company=self.request.user.company
        )

    def get_queryset(self):
        return ProjectMember.objects.filter(project=self.get_project())

    def perform_create(self, serializer):
        project = self.get_project()
        user_id = self.request.data.get('user')
        try:
            user = User.objects.get(pk=user_id, company=self.request.user.company)
        except User.DoesNotExist:
            raise PermissionDenied('That user is not part of your company.')
        serializer.save(project=project, user=user)