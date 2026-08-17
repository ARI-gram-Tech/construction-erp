"""
Serializers for the companies app.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Company, Branch, Subscription, Invitation

User = get_user_model()

class CompanyCreateSerializer(serializers.ModelSerializer):
    """
    Used by Super Admin to onboard a new company directly — unlike
    CompanyRegisterSerializer (public, always 'pending'), companies
    created here are considered vetted and go 'active' immediately,
    with a subscription set up in the same step.
    """
    plan = serializers.ChoiceField(choices=Subscription.PLAN_CHOICES, default='trial')
    max_users = serializers.IntegerField(default=5)
    max_projects = serializers.IntegerField(default=3)
    expires_at = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Company
        fields = (
            'name', 'registration_no', 'email', 'phone', 'address', 'logo',
            'plan', 'max_users', 'max_projects', 'expires_at',
        )

    def create(self, validated_data):
        plan = validated_data.pop('plan')
        max_users = validated_data.pop('max_users')
        max_projects = validated_data.pop('max_projects')
        expires_at = validated_data.pop('expires_at', None)

        company = Company.objects.create(status='active', **validated_data)
        Subscription.objects.create(
            company=company,
            plan=plan,
            max_users=max_users,
            max_projects=max_projects,
            expires_at=expires_at,
        )
        return company
    
class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ('id', 'plan', 'max_users', 'max_projects', 'is_active', 'starts_at', 'expires_at')


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ('id', 'name', 'address', 'phone', 'is_main')


class CompanySerializer(serializers.ModelSerializer):
    """
    Full company representation — used by Super Admin to list/view/manage
    all companies on the platform.
    """
    subscription = SubscriptionSerializer(read_only=True)
    branches = BranchSerializer(many=True, read_only=True)

    class Meta:
        model = Company
        fields = (
            'id', 'name', 'registration_no', 'email', 'phone', 'address',
            'logo', 'status', 'created_at', 'updated_at',
            'subscription', 'branches',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class CompanyRegisterSerializer(serializers.ModelSerializer):
    """
    Used when a new company registers itself on the platform.
    Status always starts as 'pending' — Super Admin approves separately.
    """
    class Meta:
        model = Company
        fields = ('name', 'registration_no', 'email', 'phone', 'address', 'logo')

    def create(self, validated_data):
        validated_data['status'] = 'pending'
        return super().create(validated_data)
    

class SubscriptionUpdateSerializer(serializers.ModelSerializer):
    """
    Used by Super Admin to upgrade/downgrade a company's plan,
    change limits, or extend/shorten expiry — after creation.
    """
    class Meta:
        model = Subscription
        fields = ('plan', 'max_users', 'max_projects', 'is_active', 'expires_at')


def _generate_unique_username(email):
    """
    Derives a username from the email's local part (before the @),
    stripping characters Django's default username validator disallows,
    and disambiguating with a numeric suffix if that base is taken.
    Login never uses this — it exists only because AbstractUser still
    requires a unique, non-null username column.
    """
    import re
    base = re.sub(r'[^\w.@+-]', '', email.split('@')[0]) or 'user'
    username = base
    counter = 1
    while User.objects.filter(username=username).exists():
        counter += 1
        username = f'{base}{counter}'
    return username


class AcceptInviteSerializer(serializers.Serializer):
    token = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_token(self, value):
        try:
            invite = Invitation.objects.get(token=value)
        except Invitation.DoesNotExist:
            raise serializers.ValidationError("Invalid invite link.")
        if not invite.is_valid():
            raise serializers.ValidationError("This invite has expired or already been used.")
        if User.objects.filter(email=invite.email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists. Contact support if you believe this is an error."
            )
        self.invite = invite
        return value

    def create(self, validated_data):
        invite = self.invite
        user = User(
            email=invite.email,
            username=_generate_unique_username(invite.email),
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            company=invite.company,
            role=invite.role,
        )
        user.set_password(validated_data['password'])
        user.save()

        invite.is_used = True
        invite.save()

        return user

    def to_representation(self, instance):
        return {
            'id': instance.id,
            'email': instance.email,
            'username': instance.username,
        }
    

class CreateCompanyAdminSerializer(serializers.Serializer):
    """
    Used by Super Admin to create a Company Admin account directly,
    without going through the email-invite flow. Same
    generate-temp-password + forced-reset pattern as
    CreateEmployeeSerializer, for consistency across both admin tiers.
    """
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        from apps.common.utils import generate_temp_password

        company = self.context['company']
        temp_password = generate_temp_password()

        user = User(
            email=validated_data['email'],
            username=_generate_unique_username(validated_data['email']),
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            company=company,
            role='company_admin',
            must_change_password=True,
        )
        user.set_password(temp_password)
        user.save()

        self._temp_password = temp_password
        return user


class CreateEmployeeSerializer(serializers.Serializer):
    """
    Used by a Company Admin (or Director) to directly create a new
    employee account in their own company — replaces the old invite-link
    self-registration flow. The server generates a temporary password,
    emails it to the recipient, and forces a password change on first
    login (User.must_change_password). No token, no self-service
    account creation: the admin controls exactly who gets an account
    and with what details from the start.
    """
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    phone = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=[c[0] for c in User.ROLE_CHOICES], default='employee')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        from apps.common.utils import generate_temp_password

        company = self.context['company']
        temp_password = generate_temp_password()

        user = User(
            email=validated_data['email'],
            username=_generate_unique_username(validated_data['email']),
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            company=company,
            role=validated_data['role'],
            must_change_password=True,
        )
        user.set_password(temp_password)
        user.save()

        self._temp_password = temp_password  # stashed for the view to email
        return user