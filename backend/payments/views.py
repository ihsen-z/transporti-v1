from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import EscrowTransaction, CommissionLedger, Booking
from .serializers import (
    EscrowReleaseSerializer, CommissionSettleSerializer,
    ConfirmCompletionSerializer, EscrowDetailSerializer,
    CommissionLedgerDetailSerializer, BookingDetailSerializer
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
    Body: { "job_id": int, "platform": str } (platform defaults to 'web')
    Returns: { "payment_url": str, "gateway_ref": str, "callback_url": str (optional) }
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def post(self, request):
        job_id = request.data.get('job_id')
        if not job_id:
            return Response({'error': 'job_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        job = get_object_or_404(TransportJob, id=job_id, owner=request.user)

        # D3 (escrow strict): payment happens while the job is MATCHED;
        # the job only becomes IN_PROGRESS once the escrow is HELD.
        if job.status != TransportJob.Status.MATCHED:
            return Response(
                {'error': f'Job must be MATCHED (awaiting payment). Current: {job.status}'},
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
        platform = request.data.get('platform', 'web')
        gateway = get_payment_gateway()

        if platform == 'mobile':
            from django.conf import settings
            mobile_scheme = getattr(settings, 'MOBILE_APP_SCHEME', 'transporti')
            success_url = f"{mobile_scheme}://payment/callback?status=success&job_id={job.id}"
            fail_url = f"{mobile_scheme}://payment/callback?status=failed&job_id={job.id}"
        else:
            frontend_url = request.build_absolute_uri('/').rstrip('/')
            success_url = f"{frontend_url}/jobs/{job.id}?payment=success"
            fail_url = f"{frontend_url}/jobs/{job.id}?payment=failed"

        result = gateway.init_payment(
            amount=booking.final_price,
            description=f"Transporti - Job #{job.id}",
            order_id=f"TRN-{job.id}-{booking.id}",
            success_url=success_url,
            fail_url=fail_url,
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

        response_data = {
            'payment_url': result.payment_url,
            'gateway_ref': result.gateway_ref,
            'escrow_id': escrow.id,
        }

        if platform == 'mobile':
            from django.conf import settings
            mobile_scheme = getattr(settings, 'MOBILE_APP_SCHEME', 'transporti')
            response_data['callback_url'] = f"{mobile_scheme}://payment/callback"

        return Response(response_data)


class PaymentWebhookView(APIView):
    """
    POST /api/payments/webhook/
    Callback from payment gateway when payment status changes.
    No authentication (called by gateway server).
    HMAC-SHA256 signature validation (Sprint 2 R4).
    """
    permission_classes = []  # Public endpoint

    def post(self, request):
        # R4: Verify webhook signature before processing
        from .webhook_security import verify_webhook_signature
        verify_webhook_signature(request)

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
            # D3: secured payment starts the mission (MATCHED → IN_PROGRESS)
            from .services import activate_job_on_payment
            try:
                activate_job_on_payment(escrow)
            except Exception:
                pass
            return Response({'status': 'escrow_held'})
        elif payment_status == 'failed' and escrow.status == EscrowTransaction.Status.INITIATED:
            escrow.status = EscrowTransaction.Status.FAILED
            escrow.save()
            return Response({'status': 'payment_failed'})

        return Response({'status': 'no_change'})


class VerifyPaymentView(APIView):
    """
    POST /api/payments/verify/
    Body: { "gateway_ref": str }

    Client-side payment confirmation: called when the payer returns from the
    gateway redirect. Queries the gateway's authoritative status and applies
    it (INITIATED → HELD/FAILED). Idempotent — safe to call repeatedly.
    In SANDBOX mode the gateway always reports 'completed', which closes the
    loop locally where no webhook can reach us.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        gateway_ref = request.data.get('gateway_ref', '')
        if not gateway_ref:
            return Response({'error': 'gateway_ref is required'}, status=status.HTTP_400_BAD_REQUEST)

        escrow = get_object_or_404(EscrowTransaction, gateway_reference=gateway_ref)
        job = escrow.booking_reference
        if job.owner != request.user:
            return Response(
                {'error': 'You do not have permission to verify this payment.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if escrow.status == EscrowTransaction.Status.INITIATED:
            gateway = get_payment_gateway()
            result = gateway.check_status(gateway_ref)
            if result.status == 'completed':
                escrow.status = EscrowTransaction.Status.HELD
                escrow.save()
                from .services import activate_job_on_payment
                try:
                    activate_job_on_payment(escrow)
                except Exception:
                    pass
            elif result.status == 'failed':
                escrow.status = EscrowTransaction.Status.FAILED
                escrow.save()

        return Response({
            'status': escrow.status,
            'job_id': job.id,
            'job_status': TransportJob.objects.get(id=job.id).status,
        })


class PaymentStatusView(APIView):
    """
    GET /api/payments/<reference>/status/
    Retrieve payment status by gateway reference.
    Accessible only to the job owner (client) or the accepted transporter.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        escrow = get_object_or_404(EscrowTransaction, gateway_reference=reference)
        
        # Verify the user is either the client (job owner) or the accepted transporter
        job = escrow.booking_reference
        is_client = (job.owner == request.user)
        
        # Check if the user is the accepted transporter
        is_transporter = False
        try:
            booking = Booking.objects.get(job=job)
            if booking.accepted_offer.transporter == request.user:
                is_transporter = True
        except Booking.DoesNotExist:
            pass

        if not is_client and not is_transporter:
            return Response(
                {'error': 'You do not have permission to view this payment status.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'gateway_reference': escrow.gateway_reference,
            'status': escrow.status,
            'amount': escrow.amount,
            'job_id': job.id,
            'updated_at': escrow.updated_at,
        })


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
# JOB-SCOPED BOOKING & ESCROW ENDPOINTS (F2)
# =============================================================================

class JobBookingDetailView(APIView):
    """
    GET /api/jobs/{job_id}/booking/
    Returns the booking for a specific job.
    Accessible only to the job owner (client) or the accepted transporter.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id)

        # Authorization: must be job owner or accepted transporter
        is_owner = job.owner == request.user
        accepted_offer = job.offers.filter(status='ACCEPTED').first()
        is_transporter = accepted_offer and accepted_offer.transporter == request.user

        if not is_owner and not is_transporter:
            return Response(
                {'error': 'Access denied.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            booking = Booking.objects.get(job=job)
        except Booking.DoesNotExist:
            return Response(
                {'error': 'No booking found for this job.'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(BookingDetailSerializer(booking).data)


class JobEscrowDetailView(APIView):
    """
    GET /api/jobs/{job_id}/escrow/
    Returns escrow transactions for a specific job.
    Accessible only to the job owner (client) or the accepted transporter.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id)

        # Authorization: must be job owner or accepted transporter
        is_owner = job.owner == request.user
        accepted_offer = job.offers.filter(status='ACCEPTED').first()
        is_transporter = accepted_offer and accepted_offer.transporter == request.user

        if not is_owner and not is_transporter:
            return Response(
                {'error': 'Access denied.'},
                status=status.HTTP_403_FORBIDDEN
            )

        escrows = EscrowTransaction.objects.filter(
            booking_reference=job
        ).order_by('-created_at')

        return Response(EscrowDetailSerializer(escrows, many=True).data)


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


# =============================================================================
# TRANSPORTER WALLET (Sprint 2 — WS-A A2, decision D4)
# =============================================================================

class TransporterWalletView(APIView):
    """
    GET /api/wallet/
    Transporter wallet: available balance, pending escrow, COD debt,
    transaction history and withdrawal requests.
    Formulas: DICTIONNAIRE_KPI K10/K11 via payments.services.get_wallet_summary.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]

    def get(self, request):
        from .services import get_wallet_summary
        from .models import WithdrawalRequest

        summary = get_wallet_summary(request.user)

        # History: escrow movements on the transporter's accepted jobs
        accepted = Offer.objects.filter(
            transporter=request.user, status='ACCEPTED'
        ).select_related('job')
        offer_by_job = {o.job_id: o for o in accepted}

        history = []
        escrows = EscrowTransaction.objects.filter(
            booking_reference_id__in=offer_by_job.keys()
        ).order_by('-updated_at')
        for e in escrows:
            offer = offer_by_job.get(e.booking_reference_id)
            if not offer:
                continue
            history.append({
                'kind': 'ESCROW',
                'status': e.status,
                'job_id': e.booking_reference_id,
                'gross': float(e.amount),
                'net': float(offer.price_net),
                'date': e.updated_at.isoformat(),
            })

        withdrawals = WithdrawalRequest.objects.filter(transporter=request.user)
        for w in withdrawals:
            history.append({
                'kind': 'WITHDRAWAL',
                'status': w.status,
                'id': w.id,
                'amount': float(w.amount),
                'bank_details': w.bank_details,
                'date': (w.processed_at or w.requested_at).isoformat(),
            })

        history.sort(key=lambda h: h['date'], reverse=True)

        cod_unsettled = CommissionLedger.objects.filter(
            transporter=request.user, is_settled=False
        ).select_related('job_reference')

        return Response({
            'available': float(summary['available']),
            'pending_net': float(summary['pending_net']),
            'released_net': float(summary['released_net']),
            'cod_debt': float(summary['cod_debt']),
            'withdrawals_total': float(summary['withdrawals_total']),
            'cod_debts': [
                {'job_id': c.job_reference_id, 'amount': float(c.amount)}
                for c in cod_unsettled
            ],
            'history': history[:50],
        })


class WithdrawalRequestCreateView(APIView):
    """
    POST /api/wallet/withdrawals/
    Body: { "amount": decimal, "bank_details": str }
    Creates a manual payout request (processed back-office — D4).
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]

    MIN_WITHDRAWAL_TND = 10

    def post(self, request):
        from decimal import Decimal, InvalidOperation
        from .services import get_wallet_summary
        from .models import WithdrawalRequest

        try:
            amount = Decimal(str(request.data.get('amount', '')))
        except (InvalidOperation, TypeError):
            return Response({'amount': ['Montant invalide.']}, status=status.HTTP_400_BAD_REQUEST)

        bank_details = str(request.data.get('bank_details', '')).strip()

        if amount < self.MIN_WITHDRAWAL_TND:
            return Response(
                {'amount': [f'Le montant minimum de retrait est de {self.MIN_WITHDRAWAL_TND} TND.']},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not bank_details:
            return Response(
                {'bank_details': ['Veuillez indiquer votre RIB ou destination de virement.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        available = get_wallet_summary(request.user)['available']
        if amount > available:
            return Response(
                {'amount': [f'Montant supérieur à votre solde disponible ({available} TND).']},
                status=status.HTTP_400_BAD_REQUEST
            )

        withdrawal = WithdrawalRequest.objects.create(
            transporter=request.user,
            amount=amount,
            bank_details=bank_details,
        )

        return Response({
            'message': 'Demande de retrait enregistrée. Elle sera traitée sous 3 à 5 jours ouvrés.',
            'withdrawal': {
                'id': withdrawal.id,
                'amount': float(withdrawal.amount),
                'status': withdrawal.status,
                'requested_at': withdrawal.requested_at.isoformat(),
            }
        }, status=status.HTTP_201_CREATED)
