"""Offer views: creation, listing, acceptance, withdrawal and counter-offers."""
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404

from ..models import TransportJob, Offer
from ..serializers import (
    OfferCreateSerializer, OfferListSerializer, OfferDetailSerializer,
    OfferAcceptSerializer, TransportJobDetailSerializer,
)
from users.permissions import RequireRole, RequireVerification


class JobOffersView(generics.ListAPIView):
    """
    GET /api/jobs/{job_id}/offers/
    Client views offers on their own job.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]
    serializer_class = OfferListSerializer

    def get_queryset(self):
        job_id = self.kwargs['job_id']
        job = get_object_or_404(TransportJob, id=job_id, owner=self.request.user)
        return Offer.objects.filter(job=job).select_related(
            'transporter', 'transporter__trust_profile'
        ).order_by('-created_at')


class OfferCreateView(generics.CreateAPIView):
    """
    POST /api/offers/
    Verified transporter submits an offer.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER'), RequireVerification]
    serializer_class = OfferCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            offer = serializer.save()
            return Response({
                'message': 'Offer submitted successfully.',
                'offer': OfferDetailSerializer(offer).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OfferMyListView(generics.ListAPIView):
    """
    GET /api/offers/my/
    Transporter views their own offers.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]
    serializer_class = OfferListSerializer

    def get_queryset(self):
        queryset = Offer.objects.filter(
            transporter=self.request.user
        ).select_related('job', 'job__owner', 'transporter').order_by('-created_at')

        status_param = self.request.query_params.get('status')
        if status_param:
            valid_statuses = {choice[0] for choice in Offer.Status.choices}
            if status_param in valid_statuses:
                queryset = queryset.filter(status=status_param)
        return queryset


class OfferAcceptView(generics.GenericAPIView):
    """
    POST /api/offers/{offer_id}/accept/
    Client accepts an offer on their job.
    Triggers atomic state transition + escrow creation.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]
    serializer_class = OfferAcceptSerializer

    @transaction.atomic
    def post(self, request, offer_id):
        # Validate body
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_method = serializer.validated_data.get('payment_method', 'DIGITAL')

        # Get offer with row lock to prevent race conditions
        try:
            offer = Offer.objects.select_for_update().get(id=offer_id)
        except Offer.DoesNotExist:
            return Response(
                {'error': 'Offer not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Lock the job row as well
        job = TransportJob.objects.select_for_update().get(id=offer.job_id)

        # Verify client owns the job
        if job.owner != request.user:
            return Response(
                {'error': 'You do not own this job.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify job is PUBLISHED
        if job.status != TransportJob.Status.PUBLISHED:
            return Response(
                {'error': f'Job is not available for booking. Current status: {job.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify offer is PENDING
        if offer.status != Offer.Status.PENDING:
            return Response(
                {'error': f'Offer is not available. Current status: {offer.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # COD threshold guard: max 300 TND for cash on delivery
        COD_MAX_TND = 300
        if payment_method == 'COD' and offer.total_price > COD_MAX_TND:
            return Response(
                {'error': f'Montant trop élevé pour le paiement à la livraison. Maximum: {COD_MAX_TND} TND.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # === ATOMIC STATE TRANSITIONS (D3 — escrow strict) ===

        # 1. Accept this offer
        offer.status = Offer.Status.ACCEPTED
        offer.save()

        # 2. Reject all other offers on this job
        Offer.objects.filter(job=job).exclude(id=offer.id).update(
            status=Offer.Status.REJECTED
        )

        # 3. Job becomes MATCHED — IN_PROGRESS only happens once the payment
        #    is secured (escrow HELD) or the transporter confirms a COD start.
        job.status = TransportJob.Status.MATCHED
        job.save()

        # 4. Create the Booking contract (freezes price, rate and payment method)
        from payments.models import Booking
        from payments.services import get_commission_rate
        COD_MAX = 300
        Booking.objects.get_or_create(
            job=job,
            defaults={
                'accepted_offer': offer,
                'final_price': offer.total_price,
                'commission_rate': get_commission_rate(job.job_type),
                'payment_method': payment_method,
                'cod_allowed': offer.total_price <= COD_MAX,
            }
        )

        # 5. Create conversation + system message (FIX #1 + #6 + P2-02)
        try:
            from messaging.services import get_or_create_conversation, send_system_message
            get_or_create_conversation(job)
            transporter_name = f"{offer.transporter.first_name} {offer.transporter.last_name}".strip()
            if payment_method == 'DIGITAL':
                next_step = "💳 Prochaine étape : le client procède au paiement sécurisé pour démarrer la mission."
                payment_label = "Paiement digital (escrow)"
            else:
                next_step = "🤝 Prochaine étape : le transporteur confirme le démarrage (paiement en espèces à la livraison)."
                payment_label = "Paiement à la livraison (COD)"
            send_system_message(
                job,
                f"✅ Offre acceptée — Mission assignée.\n"
                f"📦 Transporteur : {transporter_name}\n"
                f"💰 Montant : {offer.total_price} TND\n"
                f"💳 Mode de paiement : {payment_label}\n"
                f"{next_step}\n"
                f"📄 Réservation : /booking/{job.id}\n"
                f"💬 Vous pouvez désormais échanger librement.",
                actor=request.user
            )
        except Exception:
            pass  # Conversation failure must never block booking

        response_data = {
            'message': f'Offer accepted ({payment_method}). Job is now MATCHED — awaiting payment setup.',
            'payment_method': payment_method,
            'job': TransportJobDetailSerializer(job, context={'show_contact': True, 'request': request}).data,
            'accepted_offer': OfferDetailSerializer(offer).data
        }

        # Send email notification to transporter
        try:
            from notifications.emails import notify_offer_accepted as email_offer_accepted
            email_offer_accepted(offer)
        except Exception:
            pass  # Email failure must never block business logic

        # DB notification (P0 Fix — makes notifications page alive)
        try:
            from notifications.services import notify_offer_accepted as db_notify_accepted
            db_notify_accepted(offer)
        except Exception:
            pass

        return Response(response_data)


class OfferWithdrawView(APIView):
    """
    POST /api/offers/{id}/withdraw/
    Transporter withdraws a PENDING offer.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]

    def post(self, request, offer_id):
        offer = get_object_or_404(Offer, id=offer_id, transporter=request.user)

        if offer.status != Offer.Status.PENDING:
            return Response({'error': 'Only PENDING offers can be withdrawn.'}, status=status.HTTP_400_BAD_REQUEST)

        offer.status = Offer.Status.WITHDRAWN
        offer.save()

        return Response({'message': 'Offer withdrawn successfully.'})


class CounterOfferCreateView(APIView):
    """
    POST /api/offers/{offer_id}/counter/
    P2-05: Client creates a counter-offer on a PENDING offer.
    Body: { "proposed_price": decimal, "message": string }
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def post(self, request, offer_id):
        offer = get_object_or_404(Offer, id=offer_id)

        # Verify client owns the job
        if offer.job.owner != request.user:
            return Response(
                {'error': 'Vous ne pouvez pas contre-offrir sur cette offre.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if offer.status != Offer.Status.PENDING:
            return Response(
                {'error': 'Contre-offre possible uniquement sur une offre en attente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        proposed_price = request.data.get('proposed_price')
        if not proposed_price:
            return Response(
                {'error': 'proposed_price requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            proposed_price = float(proposed_price)
            if proposed_price <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {'error': 'Prix invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limit total counter-offers per offer (Phase 2 Go-Live audit)
        from logistics.models import CounterOffer
        total_counters = CounterOffer.objects.filter(offer=offer).count()
        if total_counters >= 3:
            return Response(
                {'error': 'Maximum 3 contre-offres par offre. Veuillez accepter, refuser ou négocier directement.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check no pending counter-offer already exists
        if CounterOffer.objects.filter(offer=offer, status='PENDING').exists():
            return Response(
                {'error': 'Une contre-offre est déjà en attente sur cette offre.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        counter = CounterOffer.objects.create(
            offer=offer,
            proposed_price=proposed_price,
            message=request.data.get('message', ''),
        )

        # Notify transporter
        try:
            from notifications.services import create_notification
            client_name = f"{request.user.first_name} {request.user.last_name}".strip()
            create_notification(
                user=offer.transporter,
                title="Contre-offre reçue",
                message=f"{client_name} propose {proposed_price} TND pour votre offre à {offer.total_price} TND.",
                category="JOB",
                metadata={'job_id': offer.job_id, 'offer_id': offer.id, 'counter_offer_id': counter.id}
            )
        except Exception:
            pass

        return Response({
            'id': counter.id,
            'proposed_price': str(counter.proposed_price),
            'message': counter.message,
            'status': counter.status,
        }, status=status.HTTP_201_CREATED)


class CounterOfferRespondView(APIView):
    """
    POST /api/counter-offers/{id}/respond/
    P2-05: Transporter accepts or rejects a counter-offer.
    Body: { "action": "accept" | "reject" }
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]

    @transaction.atomic
    def post(self, request, counter_id):
        from logistics.models import CounterOffer
        counter = get_object_or_404(CounterOffer, id=counter_id)
        offer = counter.offer

        # Verify transporter owns the offer
        if offer.transporter != request.user:
            return Response(
                {'error': 'Cette contre-offre ne vous concerne pas.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if counter.status != CounterOffer.Status.PENDING:
            return Response(
                {'error': 'Cette contre-offre n\'est plus en attente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        action = request.data.get('action', '').lower()
        if action not in ('accept', 'reject'):
            return Response(
                {'error': 'Action invalide. Utilisez "accept" ou "reject".'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if action == 'reject':
            counter.status = CounterOffer.Status.REJECTED
            counter.save()
            return Response({'status': 'rejected', 'message': 'Contre-offre refusée.'})

        # Accept: update offer price.
        # The counter-offer amount is the CLIENT-facing total, so derive the
        # net with the D1-consistent inverse (commission == net × rate).
        from payments.services import derive_net_from_total
        from decimal import Decimal
        new_total = counter.proposed_price
        commission, net = derive_net_from_total(offer.job.job_type, Decimal(str(new_total)))

        offer.total_price = new_total
        offer.commission_amount = commission
        offer.price_net = net
        offer.save()

        counter.status = CounterOffer.Status.ACCEPTED
        counter.save()

        # Notify client
        try:
            from notifications.services import create_notification
            transporter_name = f"{request.user.first_name} {request.user.last_name}".strip()
            create_notification(
                user=offer.job.owner,
                title="Contre-offre acceptée",
                message=f"{transporter_name} a accepté votre contre-offre de {new_total} TND.",
                category="JOB",
                metadata={'job_id': offer.job_id, 'offer_id': offer.id}
            )
        except Exception:
            pass

        return Response({
            'status': 'accepted',
            'new_total_price': str(offer.total_price),
            'new_price_net': str(offer.price_net),
            'new_commission': str(offer.commission_amount),
            'message': 'Contre-offre acceptée. Le prix de l\'offre a été mis à jour.',
        })
