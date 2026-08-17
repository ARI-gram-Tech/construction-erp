# apps/team/serializers.py
from rest_framework import serializers

from .models import ProjectMember


class ProjectMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = ProjectMember
        fields = [
            'id', 'project', 'user', 'user_name', 'user_email', 'role',
            'role_on_project', 'created_at',
        ]
        read_only_fields = ['project']