"""
Views for the companies app: Super Admin management + public registration.
"""
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .utils import send_invite_email
from .models import Company, Subscription, Invitation

from .serializers import (
    CompanySerializer,
    CompanyRegisterSerializer,
    CompanyCreateSerializer,
    SubscriptionUpdateSerializer,
    AcceptInviteSerializer,
    CreateCompanyAdminSerializer,
    CreateEmployeeSerializer,
)
from .permissions import IsSuperAdmin, IsCompanyMember, IsCompanyAdmin
from .utils import send_invite_email, send_credentials_email
from apps.common.utils import log_action
from apps.notifications.utils import notify

class CompanyRegisterView(generics.CreateAPIView):
    """
    POST /api/companies/register/
    Public endpoint — anyone can register a new company. It's created
    with status='pending' until Super Admin approves it.
    """
    serializer_class = CompanyRegisterSerializer
    permission_classes = [permissions.AllowAny]


class CompanyViewSet(viewsets.ModelViewSet):
    """
    Super Admin only. Full CRUD over all companies on the platform,
    plus approve/suspend/subscription actions.

    GET    /api/companies/                  list all companies
    GET    /api/companies/{id}/             view one company
    POST   /api/companies/                 create + set up subscription
    PATCH  /api/companies/{id}/             edit company info
    DELETE /api/companies/{id}/             permanently remove a company
    POST   /api/companies/{id}/approve/     reversible: reactivate
    POST   /api/companies/{id}/suspend/     reversible: temporarily block
    PATCH  /api/companies/{id}/subscription/  change plan/limits/expiry
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return CompanyCreateSerializer
        return CompanySerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        company = self.get_object()
        company.status = 'active'
        company.save()
        log_action(request.user, 'approved_company', company=company,
                   description=f'Approved {company.name}')
        return Response(CompanySerializer(company).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        company = self.get_object()
        company.status = 'suspended'
        company.save()
        log_action(request.user, 'suspended_company', company=company,
                   description=f'Suspended {company.name}')
        return Response(CompanySerializer(company).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='subscription')
    def update_subscription(self, request, pk=None):
        company = self.get_object()
        subscription, _ = Subscription.objects.get_or_create(company=company)
        serializer = SubscriptionUpdateSerializer(subscription, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_action(request.user, 'updated_subscription', company=company,
                   description=f'Updated subscription for {company.name}: {request.data}')
        return Response(CompanySerializer(company).data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        company = serializer.save()
        log_action(self.request.user, 'created_company', company=company,
                   description=f'Created {company.name}')
        

    @action(detail=True, methods=['post'], url_path='create-admin')
    def create_admin(self, request, pk=None):
        company = self.get_object()
        serializer = CreateCompanyAdminSerializer(data=request.data, context={'company': company})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_credentials_email(user, serializer._temp_password)
        log_action(request.user, 'created_company_admin_directly', company=company,
                   description=f'Directly created Company Admin {user.email}')
        notify(user, title='Your Company Admin account is ready',
               message=f'You can now log in and manage {company.name}.',
               level='info', link='/company/dashboard')
        return Response({'id': user.id, 'email': user.email}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='resend-invite')
    def resend_invite(self, request, pk=None):
        company = self.get_object()
        invite, _ = Invitation.objects.get_or_create(
            company=company, email=company.email, role='company_admin', is_used=False,
            defaults={},
        )
        send_invite_email(invite)
        log_action(request.user, 'resent_invite', company=company,
                   description=f'Resent invite to {invite.email}')
        return Response({'detail': f'Invite resent to {invite.email}.'}, status=status.HTTP_200_OK)
    
class AcceptInviteView(generics.CreateAPIView):
    """
    POST /api/companies/accept-invite/
    Body: { token, first_name, last_name, username, password }
    Public — the person isn't authenticated yet, they're creating their account.
    """
    serializer_class = AcceptInviteSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(None, 'company_admin_activated', company=user.company,
                   description=f'{user.email} completed invite and activated Company Admin account')
        notify(
            user,
            title='Welcome to Construction ERP',
            message=f'Your Company Admin account for {user.company.name} is ready. Start by inviting your team.',
            level='info',
            link='/company/dashboard',
        )
        

class MyCompanyView(generics.RetrieveAPIView):
    """
    GET /api/companies/my-company/
    Returns the authenticated user's own company — used by Company Admin
    and employees. A user with no company (e.g. Super Admin) gets a 404.
    """
    serializer_class = CompanySerializer
    permission_classes = [IsCompanyMember]

    def get_object(self):
        company = self.request.user.company
        if company is None:
            from rest_framework.exceptions import NotFound
            raise NotFound("You are not linked to a company.")
        return company
    

class ResendEmployeeCredentialsView(APIView):
    """
    POST /api/companies/employees/{id}/resend-credentials/
    Company Admin/Director only, and only for someone in their own
    company. Generates a FRESH temporary password (never resends the
    original — that one may have already been read, forwarded, or sat
    in an inbox too long) and re-emails it. Also re-flags
    must_change_password in case it had already been cleared, so the
    new temp password is still forced to be replaced on next login.
    """
    permission_classes = [IsCompanyAdmin]

    def post(self, request, user_id):
        from apps.accounts.models import User
        from apps.common.utils import generate_temp_password

        try:
            user = User.objects.get(pk=user_id, company=request.user.company)
        except User.DoesNotExist:
            return Response({'detail': 'Employee not found in your company.'}, status=404)

        temp_password = generate_temp_password()
        user.set_password(temp_password)
        user.must_change_password = True
        user.save()

        send_credentials_email(user, temp_password)
        log_action(
            request.user, 'resent_employee_credentials', company=user.company,
            description=f'Resent login credentials to {user.email}.',
        )
        return Response({'detail': f'New credentials sent to {user.email}.'})


class InviteEmployeeView(generics.CreateAPIView):
    """
    POST /api/companies/invite-employee/
    Body: { email, first_name, last_name, phone?, role }
    Company Admin/Director only — creates a fully-formed employee
    account directly (replaces the old email-link self-registration:
    the account exists immediately, with a server-generated temporary
    password emailed to the recipient and must_change_password=True
    forcing a reset on their first login). Restricted to IsCompanyAdmin,
    not just any company member — regular employees cannot create
    other accounts.
    """
    serializer_class = CreateEmployeeSerializer
    permission_classes = [IsCompanyAdmin]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = self.request.user.company
        return context

    def perform_create(self, serializer):
        user = serializer.save()
        send_credentials_email(user, serializer._temp_password)
        log_action(self.request.user, 'created_employee', company=user.company,
                   description=f'Created employee {user.email} with role {user.role}')