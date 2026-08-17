# apps/projects/views.py
"""
Views for the projects app. Scoped to the authenticated user's own
company — no user should ever see another company's projects.

Beyond company scoping, visibility is further narrowed per-user via
permissions.visible_projects_queryset(): company-wide managers see
everything, everyone else only sees projects they're assigned to or a
member of. See permissions.py for the full reasoning.
"""
from rest_framework import viewsets

from .models import Project
from .serializers import ProjectSerializer
from .permissions import ProjectPermission, visible_projects_queryset


class ProjectViewSet(viewsets.ModelViewSet):
    """
    GET    /api/projects/            list projects visible to this user
    POST   /api/projects/            create a project (company-wide managers only)
    GET    /api/projects/{id}/       view one project (if visible to this user)
    PATCH  /api/projects/{id}/       edit a project (managers or the assigned PM)
    DELETE /api/projects/{id}/       remove a project (company_admin/director only)
    """
    serializer_class = ProjectSerializer
    permission_classes = [ProjectPermission]

    def get_queryset(self):
        company = self.request.user.company
        if company is None:
            return Project.objects.none()
        base = Project.objects.for_company(company).select_related('client', 'project_manager')
        return visible_projects_queryset(base, self.request.user)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)