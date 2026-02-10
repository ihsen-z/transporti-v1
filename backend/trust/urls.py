"""
Trust URL Routes - Transporti V1
Admin trust moderation endpoints.
"""
from django.urls import path
from .views_admin import (
    AdminTrustListView,
    AdminTrustDetailView,
    AdminTrustHistoryView,
    AdminTrustVerifyView,
    AdminTrustRejectView,
    AdminTrustSuspendView,
    AdminTrustRestoreView,
    AdminTrustPolicyListCreateView,
    AdminTrustPolicyDetailView,
    AdminTrustPolicyActivateView,
)

urlpatterns = [
    # Admin Trust Moderation
    path('admin/users/', AdminTrustListView.as_view(), name='admin_trust_list'),
    path('admin/users/<int:user_id>/', AdminTrustDetailView.as_view(), name='admin_trust_detail'),
    path('admin/users/<int:user_id>/history/', AdminTrustHistoryView.as_view(), name='admin_trust_history'),
    path('admin/users/<int:user_id>/verify/', AdminTrustVerifyView.as_view(), name='admin_trust_verify'),
    path('admin/users/<int:user_id>/reject/', AdminTrustRejectView.as_view(), name='admin_trust_reject'),
    path('admin/users/<int:user_id>/suspend/', AdminTrustSuspendView.as_view(), name='admin_trust_suspend'),
    path('admin/users/<int:user_id>/restore/', AdminTrustRestoreView.as_view(), name='admin_trust_restore'),
    
    # Admin Trust Policy CRUD
    path('admin/policies/', AdminTrustPolicyListCreateView.as_view(), name='admin_trust_policy_list'),
    path('admin/policies/<int:policy_id>/', AdminTrustPolicyDetailView.as_view(), name='admin_trust_policy_detail'),
    path('admin/policies/<int:policy_id>/activate/', AdminTrustPolicyActivateView.as_view(), name='admin_trust_policy_activate'),
]
