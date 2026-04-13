"""
Dispute Views - Transporti V1
API endpoints with strict RBAC enforcement.
All business logic delegated to service layer.
"""
import logging
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError, PermissionDenied

from .models import Dispute
from .serializers import (
    DisputeCreateSerializer, DisputeListSerializer, 
    DisputeDetailSerializer, DisputeActionSerializer
)
from .services import (
    create_dispute, start_investigation, resolve_dispute, 
    reject_dispute, get_active_disputes, get_user_disputes
)
from logistics.models import TransportJob
from users.permissions import RequireRole
from transporti_core.throttling import BookingRateThrottle

logger = logging.getLogger('transporti')


# =============================================================================
# CLIENT / TRANSPORTER ENDPOINTS
# =============================================================================

class DisputeCreateView(generics.CreateAPIView):
    """
    POST /api/disputes/
    Client or Transporter creates a dispute on a job they're involved in.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DisputeCreateSerializer
    throttle_classes = [BookingRateThrottle]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        job_id = serializer.validated_data['job_id']
        reason = serializer.validated_data['reason']
        description = serializer.validated_data['description']
        
        # Get job
        job = get_object_or_404(TransportJob, id=job_id)
        
        try:
            dispute = create_dispute(
                user=request.user,
                job=job,
                reason=reason,
                description=description
            )
            
            # Auto-lock conversation during dispute (#7)
            try:
                from messaging.models import Conversation
                from messaging.services import send_system_message
                conv = Conversation.objects.filter(job=job).first()
                if conv:
                    conv.lock()
                    send_system_message(
                        job=job,
                        content=(
                            f"⚠️ Litige ouvert — {reason}\n"
                            "La conversation est temporairement verrouillée "
                            "pendant l'examen du litige par notre équipe."
                        )
                    )
            except Exception:
                pass
            
            return Response({
                'message': 'Dispute filed successfully.',
                'dispute': DisputeDetailSerializer(dispute).data
            }, status=status.HTTP_201_CREATED)
        
        except ValidationError as e:
            logger.warning(f"DISPUTE_CREATE_FAILED: user={request.user.id}, job={job_id}, error={str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DisputeMyListView(generics.ListAPIView):
    """
    GET /api/disputes/my/
    User views their own filed disputes.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DisputeListSerializer
    
    def get_queryset(self):
        return Dispute.objects.filter(
            opened_by=self.request.user
        ).select_related('job', 'opened_by').order_by('-created_at')


# =============================================================================
# MODERATOR / ADMIN ENDPOINTS
# =============================================================================

class AdminDisputeListView(generics.ListAPIView):
    """
    GET /api/admin/disputes/
    Moderators view all active disputes.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('MODERATOR', 'ADMIN')]
    serializer_class = DisputeListSerializer
    
    def get_queryset(self):
        # Default to active disputes, allow ?all=true for all
        show_all = self.request.query_params.get('all', 'false').lower() == 'true'
        
        qs = Dispute.objects.select_related('job', 'opened_by')
        
        if not show_all:
            qs = qs.filter(status__in=Dispute.ACTIVE_STATUSES)
        
        return qs.order_by('-created_at')


class AdminDisputeDetailView(generics.RetrieveAPIView):
    """
    GET /api/admin/disputes/{id}/
    Moderators view dispute details.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('MODERATOR', 'ADMIN')]
    serializer_class = DisputeDetailSerializer
    queryset = Dispute.objects.select_related('job', 'opened_by', 'resolved_by')
    lookup_field = 'id'
    lookup_url_kwarg = 'dispute_id'


class AdminDisputeInvestigateView(generics.GenericAPIView):
    """
    POST /api/admin/disputes/{id}/investigate/
    Moderator starts investigation on a dispute.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('MODERATOR', 'ADMIN')]
    serializer_class = DisputeActionSerializer
    
    def post(self, request, dispute_id):
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        try:
            dispute = start_investigation(dispute=dispute, moderator=request.user)
            
            return Response({
                'message': 'Investigation started.',
                'dispute': DisputeDetailSerializer(dispute).data
            })
        
        except PermissionDenied as e:
            logger.warning(f"DISPUTE_INVESTIGATE_DENIED: user={request.user.id}, dispute={dispute_id}")
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        
        except ValidationError as e:
            logger.warning(f"DISPUTE_INVESTIGATE_FAILED: dispute={dispute_id}, error={str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminDisputeResolveView(generics.GenericAPIView):
    """
    POST /api/admin/disputes/{id}/resolve/
    Moderator resolves a dispute.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('MODERATOR', 'ADMIN')]
    serializer_class = DisputeActionSerializer
    
    def post(self, request, dispute_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        resolution_notes = serializer.validated_data.get('resolution_notes', '')
        
        if not resolution_notes:
            return Response(
                {'error': 'resolution_notes is required for resolve action.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        try:
            dispute = resolve_dispute(
                dispute=dispute, 
                moderator=request.user, 
                resolution_notes=resolution_notes
            )
            
            # Auto-unlock conversation after resolution (#7)
            try:
                from messaging.models import Conversation
                from messaging.services import send_system_message
                conv = Conversation.objects.filter(job=dispute.job).first()
                if conv:
                    conv.unlock()
                    send_system_message(
                        job=dispute.job,
                        content=(
                            "✅ Litige résolu — La conversation est à nouveau ouverte.\n"
                            f"Résolution : {resolution_notes[:100]}"
                        )
                    )
            except Exception:
                pass
            
            return Response({
                'message': 'Dispute resolved successfully.',
                'dispute': DisputeDetailSerializer(dispute).data
            })
        
        except PermissionDenied as e:
            logger.warning(f"DISPUTE_RESOLVE_DENIED: user={request.user.id}, dispute={dispute_id}")
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        
        except ValidationError as e:
            logger.warning(f"DISPUTE_RESOLVE_FAILED: dispute={dispute_id}, error={str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminDisputeRejectView(generics.GenericAPIView):
    """
    POST /api/admin/disputes/{id}/reject/
    Moderator rejects a dispute.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('MODERATOR', 'ADMIN')]
    serializer_class = DisputeActionSerializer
    
    def post(self, request, dispute_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        resolution_notes = serializer.validated_data.get('resolution_notes', '')
        
        if not resolution_notes:
            return Response(
                {'error': 'resolution_notes is required for reject action.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        dispute = get_object_or_404(Dispute, id=dispute_id)
        
        try:
            dispute = reject_dispute(
                dispute=dispute, 
                moderator=request.user, 
                resolution_notes=resolution_notes
            )
            
            return Response({
                'message': 'Dispute rejected.',
                'dispute': DisputeDetailSerializer(dispute).data
            })
        
        except PermissionDenied as e:
            logger.warning(f"DISPUTE_REJECT_DENIED: user={request.user.id}, dispute={dispute_id}")
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
        
        except ValidationError as e:
            logger.warning(f"DISPUTE_REJECT_FAILED: dispute={dispute_id}, error={str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
