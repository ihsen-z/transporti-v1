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
from .services import release_escrow_on_completion, settle_commission_debt, create_escrow_on_booking
from .gateway import get_payment_gateway
from logistics.models import TransportJob, Offer
from users.permissions import RequireRole


# =============================================================================
# PAYMENT GATEWAY ENDPOINTS
# =============================================================================

class InitiatePaymentView(APIView):
    """
    POST /api/payments/initiate/
    Client initiates payment for a booking via the configured gateway.
    Body: { "job_id": int }
    Returns: { "payment_url": str, "gateway_ref": str }
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def post(self, request):
        job_id = request.data.get('job_id')
        if not job_id:
            return Response({'error': 'job_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        job = get_object_or_404(TransportJob, id=job_id, owner=request.user)

        # Ensure job is in correct state
        if job.status != TransportJob.Status.IN_PROGRESS:
            return Response(
                {'error': f'Job must be IN_PROGRESS. Current: {job.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get accepted offer
        try:
            from .models import Booking
            booking = Booking.objects.get(job=job)
        except Booking.DoesNotExist:
            return Response(
                {'error': 'No booking found for this job'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only for DIGITAL payment method
        if booking.payment_method != 'DIGITAL':
            return Response(
                {'error': 'Payment initiation only for DIGITAL payments. This booking uses COD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if escrow already exists
        if EscrowTransaction.objects.filter(booking_reference=job, status='HELD').exists():
            return Response(
                {'error': 'Payment already processed for this booking.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Initiate payment via gateway
        gateway = get_payment_gateway()
        frontend_url = request.build_absolute_uri('/').rstrip('/')

        result = gateway.init_payment(
            amount=booking.final_price,
            description=f"Transporti - Job #{job.id}",
            order_id=f"TRN-{job.id}-{booking.id}",
            success_url=f"{frontend_url}/jobs/{job.id}?payment=success",
            fail_url=f"{frontend_url}/jobs/{job.id}?payment=failed",
        )

        if not result.success:
            return Response(
                {'error': f'Payment initiation failed: {result.error}'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # Create escrow in INITIATED state
        escrow = EscrowTransaction.objects.create(
            booking_reference=job,
            status=EscrowTransaction.Status.INITIATED,
            amount=booking.final_price,
            gateway_reference=result.gateway_ref,
        )

        return Response({
            'payment_url': result.payment_url,
            'gateway_ref': result.gateway_ref,
            'escrow_id': escrow.id,
        })


class PaymentWebhookView(APIView):
    """
    POST /api/payments/webhook/
    Callback from payment gateway when payment status changes.
    No authentication (called by gateway server).
    """
    permission_classes = []  # Public endpoint

    def post(self, request):
        gateway_ref = request.data.get('payment_ref') or request.data.get('paymentRef', '')
        payment_status = request.data.get('status', 'pending')

        if not gateway_ref:
            return Response({'error': 'Missing payment_ref'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            escrow = EscrowTransaction.objects.get(gateway_reference=gateway_ref)
        except EscrowTransaction.DoesNotExist:
            return Response({'error': 'Unknown payment reference'}, status=status.HTTP_404_NOT_FOUND)

        if payment_status == 'completed' and escrow.status == EscrowTransaction.Status.INITIATED:
            escrow.status = EscrowTransaction.Status.HELD
            escrow.save()
            return Response({'status': 'escrow_held'})
        elif payment_status == 'failed' and escrow.status == EscrowTransaction.Status.INITIATED:
            escrow.status = EscrowTransaction.Status.FAILED
            escrow.save()
            return Response({'status': 'payment_failed'})

        return Response({'status': 'no_change'})


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
