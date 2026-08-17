from django.urls import path

from .views import ProjectMemberViewSet

member_list = ProjectMemberViewSet.as_view({'get': 'list', 'post': 'create'})
member_detail = ProjectMemberViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})

urlpatterns = [
    path('projects/<int:project_pk>/members/', member_list, name='project-members'),
    path('projects/<int:project_pk>/members/<int:pk>/', member_detail, name='project-member-detail'),
]