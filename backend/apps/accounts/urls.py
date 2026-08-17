"""
URL routes for the accounts app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import RegisterView, LoginView, MeView, UserViewSet, MyCompanyUsersView, RoleChoicesView, ChangePasswordView

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='login-refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('company-users/', MyCompanyUsersView.as_view(), name='my-company-users'),
    path('', include(router.urls)),
    path('roles/', RoleChoicesView.as_view(), name='role-choices'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]