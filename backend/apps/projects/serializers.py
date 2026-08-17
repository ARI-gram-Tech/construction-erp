from rest_framework import serializers
from .models import Project
from apps.clients.serializers import ClientSerializer


class ProjectSerializer(serializers.ModelSerializer):
    """
    Full representation — includes nested client details for display.
    """
    client_detail = ClientSerializer(source='client', read_only=True)
    project_manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            'id', 'name', 'client', 'client_detail', 'location', 'description',
            'contract_value', 'budget', 'start_date', 'end_date', 'status',
            'project_manager', 'project_manager_name',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def get_project_manager_name(self, obj):
        if obj.project_manager:
            return f"{obj.project_manager.first_name} {obj.project_manager.last_name}".strip() or obj.project_manager.email
        return None

    def validate_project_manager(self, user):
        # A project's PM must already hold the project_manager role on
        # their account — this field designates WHICH of the company's
        # PMs runs this specific project, it never reassigns someone's
        # underlying role. That's fixed at the account level (Employees/
        # Users), not decided per-project.
        if user is not None and user.role != 'project_manager':
            raise serializers.ValidationError(
                f'{user.email} cannot be set as Project Manager — their '
                f'account role is "{user.get_role_display()}", not Project '
                f'Manager. Change their role in Employees first if this is '
                f'genuinely their job, or pick someone whose account is '
                f'already a Project Manager.'
            )
        return user