from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import RegisterView, LoginView, ProfileView, ChangePasswordView, DashboardStatsView, AvatarUploadView
from .views_admin_auth import AdminLoginView, AdminLogoutView, AdminSessionStatusView

urlpatterns = [
    # User Auth
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('dashboard/', DashboardStatsView.as_view(), name='auth_dashboard'),
    path('avatar/', AvatarUploadView.as_view(), name='auth_avatar'),
    
    # Admin Auth (separate flow)
    path('admin/login/', AdminLoginView.as_view(), name='admin_login'),
    path('admin/logout/', AdminLogoutView.as_view(), name='admin_logout'),
    path('admin/session/', AdminSessionStatusView.as_view(), name='admin_session'),
]
