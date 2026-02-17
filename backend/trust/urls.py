from django.urls import path
from .views import VerificationDocumentListCreateView, TrustProfileSubmissionView

urlpatterns = [
    path('documents/', VerificationDocumentListCreateView.as_view(), name='trust-documents'),
    path('status/', TrustProfileSubmissionView.as_view(), name='trust-status'),
    path('submit/', TrustProfileSubmissionView.as_view(), name='trust-submit'),
]
