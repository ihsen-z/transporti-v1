from django.urls import path
from .views import (
    VerificationDocumentListCreateView,
    TrustProfileSubmissionView,
    AdminVerificationListView,
    AdminVerificationApproveView,
    AdminVerificationRejectView,
)

urlpatterns = [
    # Transporter endpoints
    path('documents/', VerificationDocumentListCreateView.as_view(), name='trust-documents'),
    path('status/', TrustProfileSubmissionView.as_view(), name='trust-status'),
    path('submit/', TrustProfileSubmissionView.as_view(), name='trust-submit'),

    # Admin endpoints
    path('admin/verifications/', AdminVerificationListView.as_view(), name='admin-verifications-list'),
    path('admin/verifications/<int:pk>/approve/', AdminVerificationApproveView.as_view(), name='admin-verification-approve'),
    path('admin/verifications/<int:pk>/reject/', AdminVerificationRejectView.as_view(), name='admin-verification-reject'),
]
