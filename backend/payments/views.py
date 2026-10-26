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
from .online import PAIEMENT_EN_LIGNE_INDISPONIBLE, online_payment_enabled
from logistics.models import TransportJob, Offer
from logistics.participants import get_paying_client, is_job_participant
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
        if not online_payment_enabled():
            return Response({'error': PAIEMENT_EN_LIGNE_INDISPONIBLE}, status=status.HTTP_400_BAD_REQUEST)

        job_id = request.data.get('job_id')
        if not job_id:
            return Response({'error': 'job_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # The payer is not always the job owner: on a return trip the owner is
        # the TRANSPORTER and the paying client is the one whose request was
        # accepted. Filtering on owner=request.user made every return-trip
        # payment return 404 — the pivot could not be paid at all.
        job = get_object_or_404(TransportJob, id=job_id)
        payer = get_paying_client(job)
        if payer is None or payer.id != request.user.id:
            return Response(
                {'error': 'You are not the paying client for this job.'},
                status=status.HTTP_403_FORBIDDEN
            )

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
        # Mode « espèces seules » : aucun paiement en ligne n'existe, et le
        # secret de signature n'est alors pas exigé (settings.py). Tout appel
        # est refusé avant même de lire la référence.
        if not online_payment_enabled():
            return Response({'error': 'Online payment is disabled.'}, status=status.HTTP_404_NOT_FOUND)

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
        # Same reasoning as InitiatePaymentView: the payer is the job's client,
        # which on a return trip is not the owner.
        payer = get_paying_client(job)
        if payer is None or payer.id != request.user.id:
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
        
        # Verify the user is one of the two parties — resolved through the
        # shared rule, so the client of a return trip is recognised.
        job = escrow.booking_reference
        if not is_job_participant(request.user, job):
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
        
        # Get job and verify the caller is the paying client (owner on the
        # classic channel, accepted requester on a return trip).
        job = get_object_or_404(TransportJob, id=job_id)
        payer = get_paying_client(job)
        if payer is None or payer.id != request.user.id:
            return Response(
                {'error': 'You are not the paying client for this job.'},
                status=status.HTTP_403_FORBIDDEN
            )

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

        # Authorization: both sides of the transaction, resolved through the
        # shared rule so a return trip (owner == transporter, client from the
        # accepted request) is handled instead of denying the client.
        if not is_job_participant(request.user, job):
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

        # Authorization: both sides of the transaction, resolved through the
        # shared rule so a return trip (owner == transporter, client from the
        # accepted request) is handled instead of denying the client.
        if not is_job_participant(request.user, job):
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

class ClientWalletView(APIView):
    """
    GET /api/client/wallet/
    C5.1 — ou en est l'argent d'un CLIENT : seques­tre, verse, rembourse, et
    ce qu'il devra en especes.

    Endpoint NOUVEAU. `TransporterWalletView` porte
    `RequireRole('TRANSPORTER')` et repond 403 a un client : l'audit qui le
    presentait comme reutilisable cote client se trompait.

    Formules : `payments.services.get_client_wallet_summary`, source unique.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def get(self, request):
        from .services import get_client_wallet_summary

        resume = get_client_wallet_summary(request.user)

        # Historique : les mouvements d'escrow sur SES transports, du plus
        # recent au plus ancien. Le montant vient de l'escrow lui-meme, jamais
        # d'un recalcul a partir de l'offre.
        historique = []
        escrows = EscrowTransaction.objects.filter(
            booking_reference__owner=request.user
        ).select_related('booking_reference').order_by('-updated_at')[:50]
        for e in escrows:
            job = e.booking_reference
            historique.append({
                'id': e.id,
                'job_id': job.id,
                'status': e.status,
                'amount': e.amount,
                'pickup_governorate': job.pickup_governorate,
                'dropoff_governorate': job.dropoff_governorate,
                # Nature du job : le front construit l'URL canonique
                # (/demandes/<id> ou /trajets/<id>) directement depuis
                # cette ligne, sans recharger le job.
                'is_return_trip': job.is_return_trip,
                'date': e.updated_at,
            })

        return Response({**resume, 'history': historique})


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
        from .debt import commission_debt_limit
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
                'is_return_trip': offer.job.is_return_trip,
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

        # COD missions never create an escrow, so they were absent from the
        # history altogether: the transporter saw no trace of a cash delivery.
        cod_bookings = Booking.objects.filter(
            job_id__in=offer_by_job.keys(),
            payment_method=Booking.PaymentMethod.COD,
            job__status=TransportJob.Status.COMPLETED,
        ).select_related('job')
        for b in cod_bookings:
            offer = offer_by_job.get(b.job_id)
            if not offer:
                continue
            history.append({
                'kind': 'COD',
                'status': 'COLLECTED',
                'job_id': b.job_id,
                'is_return_trip': b.job.is_return_trip,
                'gross': float(b.final_price),
                'net': float(offer.price_net),
                'date': b.job.updated_at.isoformat(),
            })

        history.sort(key=lambda h: h['date'], reverse=True)

        cod_unsettled = CommissionLedger.objects.filter(
            transporter=request.user, is_settled=False
        ).select_related('job_reference')

        return Response({
            'available': float(summary['available']),
            'pending_net': float(summary['pending_net']),
            'released_net': float(summary['released_net']),
            # Cash taken in hand on delivered COD missions — reported apart from
            # `available`, which only covers what the platform owes.
            'cod_collected_net': float(summary['cod_collected_net']),
            'cod_debt': float(summary['cod_debt']),
            # Plafond de dette (payments/debt.py) : l'app peut prévenir le
            # transporteur AVANT qu'un refus de publication ne le surprenne.
            'commission_debt_limit': float(commission_debt_limit()),
            'blocked_for_debt': summary['cod_debt'] > commission_debt_limit(),
            'withdrawals_total': float(summary['withdrawals_total']),
            'cod_debts': [
                {
                    'job_id': c.job_reference_id,
                    'is_return_trip': c.job_reference.is_return_trip,
                    'amount': float(c.amount),
                }
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
