from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from users.permissions import RequireRole
from .models import TrustProfile, VerificationDocument, TrustVerificationRequest
from .serializers import (
    VerificationDocumentUploadSerializer,
    VerificationDocumentReadSerializer,
    TrustProfileSubmissionSerializer,
    AdminVerificationRequestSerializer,
)


class VerificationDocumentListCreateView(generics.GenericAPIView):
    """
    GET /api/trust/documents/ - List uploaded documents
    POST /api/trust/documents/ - Upload a new document (multipart/form-data)
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return VerificationDocument.objects.filter(profile__user=self.request.user)

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = VerificationDocumentReadSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = VerificationDocumentUploadSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            doc = serializer.save()
            read_serializer = VerificationDocumentReadSerializer(doc)
            return Response(
                {'message': 'Document uploadé avec succès.', 'document': read_serializer.data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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


# =============================================================================
# Admin Verification Endpoints
# =============================================================================

class AdminVerificationListView(APIView):
    """
    GET /api/trust/admin/verifications/
    List all verification requests for admin review.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request):
        qs = TrustVerificationRequest.objects.select_related(
            'trust_profile__user', 'reviewed_by'
        ).order_by('-submitted_at')

        # Optional status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            # Map frontend status to backend status
            backend_status = {'PENDING_REVIEW': 'PENDING'}.get(status_filter, status_filter)
            qs = qs.filter(status=backend_status)

        serializer = AdminVerificationRequestSerializer(qs, many=True)
        return Response(serializer.data)


class AdminVerificationApproveView(APIView):
    """
    POST /api/trust/admin/verifications/{id}/approve/
    Approve a verification request.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def post(self, request, pk):
        verification = get_object_or_404(TrustVerificationRequest, pk=pk)

        if verification.status != 'PENDING':
            return Response(
                {'error': f'Cannot approve request in status {verification.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = request.data.get('notes', '')
        verification.approve(admin_user=request.user, notes=notes)

        return Response({
            'message': f'Vérification #{pk} approuvée.',
            'verification': AdminVerificationRequestSerializer(verification).data,
        })


class AdminVerificationRejectView(APIView):
    """
    POST /api/trust/admin/verifications/{id}/reject/
    Reject a verification request with a reason.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def post(self, request, pk):
        verification = get_object_or_404(TrustVerificationRequest, pk=pk)

        if verification.status != 'PENDING':
            return Response(
                {'error': f'Cannot reject request in status {verification.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', '')
        if not reason.strip():
            return Response(
                {'error': 'Une raison est requise pour le rejet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification.reject(admin_user=request.user, reason=reason)

        return Response({
            'message': f'Vérification #{pk} rejetée.',
            'verification': AdminVerificationRequestSerializer(verification).data,
        })


