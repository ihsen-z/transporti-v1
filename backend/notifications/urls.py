"""
Notifications URL Routes - Transporti V1
"""
from django.urls import path
from .views import (
    MyNotificationsListView,
    MyNotificationsUnreadView,
    NotificationDetailView,
    NotificationReadView,
    NotificationReadAllView,
    UnreadCountView,
    DeviceTokenRegisterView,
    DeviceTokenUnregisterView,
    DeviceTokenListView,
)

urlpatterns = [
    # User notification endpoints
    path('my/', MyNotificationsListView.as_view(), name='my_notifications'),
    path('my/unread/', MyNotificationsUnreadView.as_view(), name='my_notifications_unread'),
    path('unread-count/', UnreadCountView.as_view(), name='unread_count'),
    path('read-all/', NotificationReadAllView.as_view(), name='read_all'),
    path('<int:pk>/', NotificationDetailView.as_view(), name='notification_detail'),
    path('<int:pk>/read/', NotificationReadView.as_view(), name='notification_read'),

    # Device token management (mobile push notifications)
    path('devices/', DeviceTokenListView.as_view(), name='device_list'),
    path('devices/register/', DeviceTokenRegisterView.as_view(), name='device_register'),
    path('devices/<str:token>/', DeviceTokenUnregisterView.as_view(), name='device_unregister'),
]
