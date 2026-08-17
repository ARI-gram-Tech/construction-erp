"""
Views for the accounts app: registration, login (JWT), and current-user info.
"""
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .serializers import (
      UserSerializer,
      RegisterSerializer,
      UserManageSerializer,
      RoleChoiceSerializer,
      ChangePasswordSerializer,
      );
from .permissions import IsSuperAdmin
from apps.common.utils import log_action
from django.contrib.auth import get_user_model
User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """
    POST /api/accounts/register/
    Creates a new user. Open to anyone (no auth required) — company
    assignment happens separately once apps.companies is wired in.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT serializer to confirm login works with
    email as the username field (already set via USERNAME_FIELD on User).
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        return token


class LoginView(TokenObtainPairView):
    """
    POST /api/accounts/login/
    Body: { "email": "...", "password": "..." }
    Returns: { "access": "...", "refresh": "..." }
    """
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    """
    GET /api/accounts/me/
    Returns the currently authenticated user's profile.
    Requires a valid JWT access token in the Authorization header.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    

class ChangePasswordView(APIView):
    """
    POST /api/accounts/change-password/
    Body: { current_password, new_password }
    Any authenticated user can change their own password. Also clears
    must_change_password, so this doubles as the endpoint the frontend
    hits after a first-login forced reset.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Password updated.'}, status=status.HTTP_200_OK)

        
class UserViewSet(viewsets.ModelViewSet):
    """
    Super Admin only. Full CRUD over all users on the platform,
    plus activate/deactivate (temporary suspend) actions.

    GET    /api/accounts/users/            list all users
    GET    /api/accounts/users/{id}/       view one user
    PATCH  /api/accounts/users/{id}/       edit a user (role, company, etc.)
    DELETE /api/accounts/users/{id}/       permanently remove a user
    POST   /api/accounts/users/{id}/deactivate/   temporarily disable login
    POST   /api/accounts/users/{id}/activate/     re-enable login
    """
    queryset = User.objects.all().order_by('email')
    serializer_class = UserManageSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(
            self.request.user, 'created_user', company=user.company,
            description=f'Created user {user.email} (role: {user.role or "none"})',
        )

    def perform_destroy(self, instance):
        log_action(self.request.user, 'deleted_user', company=instance.company,
                   description=f'Deleted user {instance.email}')
        instance.delete()

    def perform_update(self, serializer):
        user = serializer.save()
        log_action(self.request.user, 'updated_user', company=user.company,
                   description=f'Updated user {user.email}: {self.request.data}')

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        log_action(request.user, 'deactivated_user', company=user.company,
                   description=f'Deactivated {user.email}')
        return Response(UserManageSerializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        log_action(request.user, 'activated_user', company=user.company,
                   description=f'Activated {user.email}')
        return Response(UserManageSerializer(user).data, status=status.HTTP_200_OK)
    

class RoleChoicesView(APIView):
    """
    GET /api/accounts/roles/
    Returns the full ROLE_CHOICES taxonomy from the User model as
    {value, label} pairs, so frontend role dropdowns (Super Admin's
    Users page, Company Admin's Employees page, etc.) read from a
    single source of truth instead of being hand-copied and drifting
    out of sync with the model whenever a role is added or renamed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        choices = [{'value': v, 'label': l} for v, l in User.ROLE_CHOICES]
        return Response(RoleChoiceSerializer(choices, many=True).data)


class MyCompanyUsersView(generics.ListAPIView):
    """
    GET /api/accounts/company-users/
    Returns users belonging to the authenticated user's own company —
    used by Company Admin to see their team size and roster.
    """
    serializer_class = UserManageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        company = self.request.user.company
        if company is None:
            return User.objects.none()
        return User.objects.filter(company=company).order_by('email')