from django.urls import path
from .views import MyNotificationsView, MarkNotificationReadView, UnreadCountView

urlpatterns = [
    path('', MyNotificationsView.as_view(), name='my-notifications'),
    path('unread-count/', UnreadCountView.as_view(), name='notifications-unread-count'),
    path('<int:pk>/read/', MarkNotificationReadView.as_view(), name='notification-mark-read'),
]