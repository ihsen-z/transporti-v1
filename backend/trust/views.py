from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from users.permissions import RequireRole
from .models import TrustProfile, VerificationDocument, TrustVerificationRequest
from .serializers import (
    VerificationDocumentUploadSerializer,
    VerificationDocumentReadSerializer,
    TrustProfileSubmissionSerializer,
    AdminVerificationRequestSerializer,
    AdminVerificationDocumentSerializer,
    AdminTrustProfileSerializer,
)
from .services import recalculate_profile_status


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
# Admin Verification Endpoints (Global Request-level)
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


# =============================================================================
# Admin Per-Document Review Endpoints (NEW)
# =============================================================================

class AdminDocumentListView(APIView):
    """
    GET /api/trust/admin/verifications/{profile_id}/documents/
    List all uploaded documents for a specific transporter profile.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request, profile_id):
        profile = get_object_or_404(
            TrustProfile.objects.select_related('user'), pk=profile_id
        )
        docs = VerificationDocument.objects.filter(
            profile=profile
        ).select_related('reviewed_by').order_by('uploaded_at')

        user = profile.user
        name = f"{user.first_name} {user.last_name}".strip() or user.email

        return Response({
            'profileId': profile.id,
            'transporterName': name,
            'transporterEmail': user.email,
            'verificationStatus': profile.verification_status,
            'trustScore': profile.trust_score,
            'documents': AdminVerificationDocumentSerializer(docs, many=True).data,
        })


class AdminDocumentReviewView(APIView):
    """
    PATCH /api/trust/admin/documents/{doc_id}/review/
    Approve or reject a single document, then recalculate profile status.

    Body:
        { "action": "approve" | "reject", "reason": "..." (required for reject) }
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def patch(self, request, doc_id):
        doc = get_object_or_404(
            VerificationDocument.objects.select_related('profile__user'), pk=doc_id
        )
        action = request.data.get('action', '').lower()
        reason = request.data.get('reason', '')

        if action == 'approve':
            doc.is_valid = True
            doc.rejection_reason = ''
        elif action == 'reject':
            if not reason.strip():
                return Response(
                    {'error': 'Un motif est requis pour le rejet du document.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            doc.is_valid = False
            doc.rejection_reason = reason
        else:
            return Response(
                {'error': 'action must be "approve" or "reject"'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doc.reviewed_at = timezone.now()
        doc.reviewed_by = request.user
        doc.save()

        # Recalculate global profile status
        new_status = recalculate_profile_status(doc.profile)

        return Response({
            'message': f'Document #{doc_id} {"approuvé" if action == "approve" else "rejeté"}.',
            'document': AdminVerificationDocumentSerializer(doc).data,
            'profileStatus': new_status,
        })


class AdminTrustProfileListView(APIView):
    """
    GET /api/trust/admin/profiles/
    List ALL transporter TrustProfiles with document counts.
    Supports ?status= filter (UNVERIFIED, PENDING, PARTIALLY_REVIEWED, VERIFIED, REJECTED).
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN', 'MODERATOR')]

    def get(self, request):
        from django.db.models import Count, Q

        qs = TrustProfile.objects.select_related('user').annotate(
            _doc_count=Count('documents'),
            _approved_count=Count('documents', filter=Q(documents__is_valid=True)),
            _rejected_count=Count(
                'documents',
                filter=Q(documents__is_valid=False, documents__rejection_reason__gt='')
            ),
        ).filter(
            user__role='TRANSPORTER'
        ).order_by('-created_at')

        # Optional status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(verification_status=status_filter)

        serializer = AdminTrustProfileSerializer(qs, many=True)
        return Response(serializer.data)
