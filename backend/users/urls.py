from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import RegisterView, LoginView, ProfileView, ChangePasswordView, DashboardStatsView, AvatarUploadView, NotificationPreferenceView, PasswordResetRequestView, PasswordResetConfirmView, seed_db_view
from .views_admin_auth import AdminLoginView, AdminLogoutView, AdminSessionStatusView
from .social_auth import GoogleLoginView, FacebookLoginView, SocialUserSetRoleView

urlpatterns = [
    # User Auth
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),

    # Social Auth (Google & Facebook)
    path('social/google/', GoogleLoginView.as_view(), name='social_google'),
    path('social/facebook/', FacebookLoginView.as_view(), name='social_facebook'),
    path('social/set-role/', SocialUserSetRoleView.as_view(), name='social_set_role'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='auth_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('dashboard/', DashboardStatsView.as_view(), name='auth_dashboard'),
    path('avatar/', AvatarUploadView.as_view(), name='auth_avatar'),
    path('notification-preferences/', NotificationPreferenceView.as_view(), name='auth_notification_prefs'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='auth_password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth_password_reset_confirm'),
    path('seed/', seed_db_view, name='seed_db'),
    
    # Admin Auth (separate flow)
    path('admin/login/', AdminLoginView.as_view(), name='admin_login'),
    path('admin/logout/', AdminLogoutView.as_view(), name='admin_logout'),
    path('admin/session/', AdminSessionStatusView.as_view(), name='admin_session'),
]
