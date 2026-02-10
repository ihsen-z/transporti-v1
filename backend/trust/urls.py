from django.urls import path
from .views import VerificationDocumentListCreateView, TrustProfileSubmissionView

urlpatterns = [
    path('trust/documents/', VerificationDocumentListCreateView.as_view(), name='trust-documents'),
    path('trust/status/', TrustProfileSubmissionView.as_view(), name='trust-status'),
    path('trust/submit/', TrustProfileSubmissionView.as_view(), name='trust-submit'),
]
