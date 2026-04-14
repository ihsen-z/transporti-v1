"""
URL configuration for transporti_core project.
Production-hardened with health check endpoint.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from .views_admin import (
    AdminStatsView, AdminJobListView, AdminJobDetailView, AdminUserListView,
    AdminActivityView, AdminAlertsView,
)


def health_check(request):
    """
    Health check endpoint for load balancers and monitoring.
    Returns 200 OK with basic system status.
    """
    from django.db import connection
    from django.utils import timezone
    
    status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0',
    }
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        status['database'] = 'connected'
    except Exception as e:
        status['database'] = 'error'
        status['status'] = 'degraded'
    
    return JsonResponse(status)


urlpatterns = [
    # Health Check (unauthenticated)
    path('health/', health_check, name='health_check'),
    
    path('admin/', admin.site.urls),
    
    # API Schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # Auth Module
    path('api/auth/', include('users.urls')),
    
    # Logistics Module (Jobs & Offers)
    path('api/', include('logistics.urls')),
    
    # Payments Module
    path('api/', include('payments.urls')),
    
    # Support Module (Disputes)
    path('api/', include('support.urls')),
    
    # Messaging Module
    path('api/', include('messaging.urls')),
    
    # Trust Module (Admin Moderation)
    path('api/trust/', include('trust.urls')),
    
    # Notifications Module
    path('api/notifications/', include('notifications.urls')),
    
    # Reviews Module
    path('api/', include('reviews.urls')),
    
    # Realtime DB Access API (Read-Only)
    path('api/realtime/', include('realtime_api.urls')),

    # Admin Panel API (Sprint 2)
    path('api/admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('api/admin/jobs/', AdminJobListView.as_view(), name='admin_jobs'),
    path('api/admin/jobs/<int:pk>/', AdminJobDetailView.as_view(), name='admin_job_detail'),
    path('api/admin/users/', AdminUserListView.as_view(), name='admin_users'),
    path('api/admin/activity/', AdminActivityView.as_view(), name='admin_activity'),
    path('api/admin/alerts/', AdminAlertsView.as_view(), name='admin_alerts'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
