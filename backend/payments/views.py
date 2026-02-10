from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import EscrowTransaction, CommissionLedger
from .serializers import (
    EscrowReleaseSerializer, CommissionSettleSerializer,
    ConfirmCompletionSerializer, EscrowDetailSerializer,
    CommissionLedgerDetailSerializer
)
from .services import release_escrow_on_completion, settle_commission_debt
from logistics.models import TransportJob
from users.permissions import RequireRole


# =============================================================================
# CLIENT ENDPOINTS
# =============================================================================

class ConfirmCompletionView(generics.GenericAPIView):
    """
    POST /api/payments/confirm-completion/
    Client confirms job completion to trigger escrow release.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]
    serializer_class = ConfirmCompletionSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        job_id = serializer.validated_data['job_id']
        
        # Get job and verify ownership
        job = get_object_or_404(TransportJob, id=job_id, owner=request.user)
        
        # Validate job status
        if job.status != TransportJob.Status.COMPLETED:
            return Response(
                {'error': f'Job must be COMPLETED. Current status: {job.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Release escrow
        try:
            escrow = release_escrow_on_completion(
                job=job,
                reason=f"Client {request.user.id} confirmed completion"
            )
            
            return Response({
                'message': 'Escrow released successfully.',
                'escrow': EscrowDetailSerializer(escrow).data
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

class AdminEscrowReleaseView(generics.GenericAPIView):
    """
    POST /api/admin/escrow/{escrow_id}/release/
    Admin manually releases escrow.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    serializer_class = EscrowReleaseSerializer
    
    def post(self, request, escrow_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data['reason']
        
        # Get escrow
        escrow = get_object_or_404(EscrowTransaction, id=escrow_id)
        job = escrow.booking_reference
        
        # Release
        try:
            escrow = release_escrow_on_completion(
                job=job,
                admin_user=request.user,
                reason=reason
            )
            
            return Response({
                'message': 'Escrow released by admin.',
                'escrow': EscrowDetailSerializer(escrow).data
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminCommissionSettleView(generics.GenericAPIView):
    """
    POST /api/admin/commission/{ledger_id}/settle/
    Admin marks commission debt as settled.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    serializer_class = CommissionSettleSerializer
    
    def post(self, request, ledger_id):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reason = serializer.validated_data['reason']
        
        # Settle
        try:
            ledger = settle_commission_debt(
                ledger_id=ledger_id,
                admin_user=request.user,
                reason=reason
            )
            
            return Response({
                'message': 'Commission debt settled.',
                'ledger': CommissionLedgerDetailSerializer(ledger).data
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AdminEscrowListView(generics.ListAPIView):
    """
    GET /api/admin/escrow/
    Admin views all escrow transactions.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    serializer_class = EscrowDetailSerializer
    queryset = EscrowTransaction.objects.all().order_by('-created_at')


class AdminCommissionListView(generics.ListAPIView):
    """
    GET /api/admin/commission/
    Admin views all commission ledger entries.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('ADMIN')]
    serializer_class = CommissionLedgerDetailSerializer
    queryset = CommissionLedger.objects.all().order_by('-created_at')
