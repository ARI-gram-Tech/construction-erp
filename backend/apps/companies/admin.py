"""
Admin registration for Company, Branch, Subscription.
"""
from django.contrib import admin
from django.core.mail import send_mail
from django.conf import settings
from .models import Company, Branch, Subscription, Invitation
from .utils import send_invite_email

class BranchInline(admin.TabularInline):
    """
    Lets you add/edit branches directly from the Company page.
    """
    model = Branch
    extra = 0


class SubscriptionInline(admin.StackedInline):
    """
    Lets you view/edit a company's subscription directly from the Company page.
    """
    model = Subscription
    extra = 0
    max_num = 1


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'email', 'phone', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'registration_no', 'email')
    inlines = [SubscriptionInline, BranchInline]

    actions = ['approve_companies', 'suspend_companies']

    @admin.action(description='Approve selected companies')
    def approve_companies(self, request, queryset):
        for company in queryset:
            company.status = 'active'
            company.save()
            invite, created = Invitation.objects.get_or_create(
                company=company, email=company.email, role='company_admin',
                is_used=False,
                defaults={},
            )
            send_invite_email(invite)

    @admin.action(description='Suspend selected companies')
    def suspend_companies(self, request, queryset):
        queryset.update(status='suspended')

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'is_main', 'phone')
    list_filter = ('is_main', 'company')
    search_fields = ('name', 'company__name')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('company', 'plan', 'max_users', 'max_projects', 'is_active', 'expires_at')
    list_filter = ('plan', 'is_active')
    search_fields = ('company__name',)



@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('email', 'company', 'role', 'is_used', 'created_at', 'expires_at')
    list_filter = ('is_used', 'role')
    search_fields = ('email', 'company__name')
    readonly_fields = ('token', 'created_at')

    actions = ['resend_invite_email']

    @admin.action(description='Send/resend invite email')
    def resend_invite_email(self, request, queryset):
        for invite in queryset:
            send_invite_email(invite)