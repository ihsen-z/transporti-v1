from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from users.permissions import RequireRole
from .models import TrustProfile, VerificationDocument
from .serializers import VerificationDocumentSerializer, TrustProfileSubmissionSerializer

class VerificationDocumentListCreateView(generics.ListCreateAPIView):
    """
    GET /api/trust/documents/ - List uploaded documents
    POST /api/trust/documents/ - Upload a new document
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]
    serializer_class = VerificationDocumentSerializer

    def get_queryset(self):
        return VerificationDocument.objects.filter(trust_profile__user=self.request.user)


class TrustProfileSubmissionView(generics.RetrieveUpdateAPIView):
    """
    GET /api/trust/status/ - Get current verification status
    PUT /api/trust/submit/ - Update vehicle info and submit for review
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]
    serializer_class = TrustProfileSubmissionSerializer

    def get_object(self):
        # Auto-create if missing (failsafe)
        profile, created = TrustProfile.objects.get_or_create(user=self.request.user)
        return profile
