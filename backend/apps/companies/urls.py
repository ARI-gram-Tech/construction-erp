"""
URL routes for the companies app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AcceptInviteView, 
    CompanyRegisterView, 
    CompanyViewSet, 
    MyCompanyView,
    InviteEmployeeView,
    ResendEmployeeCredentialsView,
    );

router = DefaultRouter()
router.register('', CompanyViewSet, basename='company')


urlpatterns = [
    path('register/', CompanyRegisterView.as_view(), name='company-register'),
    path('accept-invite/', AcceptInviteView.as_view(), name='accept-invite'),
    path('my-company/', MyCompanyView.as_view(), name='my-company'),
    path('invite-employee/', InviteEmployeeView.as_view(), name='invite-employee'),
    path('employees/<int:user_id>/resend-credentials/', ResendEmployeeCredentialsView.as_view(), name='resend-employee-credentials'),
    path('', include(router.urls)),
]