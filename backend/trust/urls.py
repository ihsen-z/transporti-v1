from django.urls import path
from .views import (
    VerificationDocumentListCreateView,
    TrustProfileSubmissionView,
    AdminVerificationListView,
    AdminVerificationApproveView,
    AdminVerificationRejectView,
    AdminDocumentListView,
    AdminDocumentReviewView,
    AdminTrustProfileListView,
)

urlpatterns = [
    # Transporter endpoints
    path('documents/', VerificationDocumentListCreateView.as_view(), name='trust-documents'),
    path('status/', TrustProfileSubmissionView.as_view(), name='trust-status'),
    path('submit/', TrustProfileSubmissionView.as_view(), name='trust-submit'),

    # Admin endpoints (global request-level)
    path('admin/verifications/', AdminVerificationListView.as_view(), name='admin-verifications-list'),
    path('admin/verifications/<int:pk>/approve/', AdminVerificationApproveView.as_view(), name='admin-verification-approve'),
    path('admin/verifications/<int:pk>/reject/', AdminVerificationRejectView.as_view(), name='admin-verification-reject'),

    # Admin endpoints (per-document review)
    path('admin/verifications/<int:profile_id>/documents/', AdminDocumentListView.as_view(), name='admin-document-list'),
    path('admin/documents/<int:doc_id>/review/', AdminDocumentReviewView.as_view(), name='admin-document-review'),

    # Admin endpoints (all profiles)
    path('admin/profiles/', AdminTrustProfileListView.as_view(), name='admin-profiles-list'),
]
