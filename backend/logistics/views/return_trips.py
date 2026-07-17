"""Return trip views: creation by transporters and direct booking by clients."""
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404

from ..models import TransportJob, Offer
from ..serializers import (
    ReturnTripCreateSerializer, TransportJobDetailSerializer, OfferDetailSerializer,
)
from users.permissions import RequireRole


class ReturnTripCreateView(generics.CreateAPIView):
    """
    POST /api/jobs/return-trip/
    Transporter creates a return trip availability.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]
    serializer_class = ReturnTripCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            job = serializer.save()
            return Response({
                'message': 'Return trip created successfully.',
                'job': TransportJobDetailSerializer(job, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BookReturnTripView(APIView):
    """
    POST /api/jobs/{job_id}/book-return/
    Client books a return trip directly.
    Creates offer at client's proposed price, auto-accepts, transitions to IN_PROGRESS.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    @transaction.atomic
    def post(self, request, job_id):
        from payments.services import derive_net_from_total

        job = get_object_or_404(TransportJob, id=job_id)

        # --- Validations ---
        if not job.is_return_trip:
            return Response(
                {'error': 'Ce job n\'est pas un trajet retour.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if job.status != TransportJob.Status.PUBLISHED:
            return Response(
                {'error': f'Ce trajet n\'est plus disponible. Statut actuel : {job.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if job.owner == request.user:
            return Response(
                {'error': 'Vous ne pouvez pas réserver votre propre trajet.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Parse request body
        proposed_price = request.data.get('proposed_price')
        payment_method = request.data.get('payment_method', 'DIGITAL')

        if not proposed_price:
            return Response(
                {'error': 'Le prix proposé est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from decimal import Decimal
            proposed_price = Decimal(str(proposed_price))
            if proposed_price <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {'error': 'Le prix proposé doit être un nombre positif.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if payment_method not in ('DIGITAL', 'COD'):
            return Response(
                {'error': 'Mode de paiement invalide. Utilisez DIGITAL ou COD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # COD threshold guard (same as OfferAcceptView)
        COD_MAX_TND = 300
        if payment_method == 'COD' and proposed_price > COD_MAX_TND:
            return Response(
                {'error': f'Montant trop élevé pour le paiement à la livraison. Maximum : {COD_MAX_TND} TND.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Create auto-offer (transporter = job.owner) ---
        # The client proposes the total they pay; derive the net with the
        # D1-consistent inverse (commission == net × rate).
        commission, price_net = derive_net_from_total(job.job_type, proposed_price)

        offer = Offer.objects.create(
            job=job,
            transporter=job.owner,
            status=Offer.Status.ACCEPTED,
            total_price=proposed_price,
            price_net=price_net,
            commission_amount=commission,
            message=f"Réservation directe trajet retour par {request.user.first_name} {request.user.last_name}",
            valid_until=timezone.now() + timezone.timedelta(days=7),
        )

        # --- D3 (escrow strict): job becomes MATCHED, never IN_PROGRESS here.
        # DIGITAL → starts when the escrow is HELD (payments/initiate + verify).
        # COD → starts when the transporter confirms (confirm-start).
        job.status = TransportJob.Status.MATCHED
        job.save()

        # --- Booking contract (freezes price, rate, payment method) ---
        from payments.models import Booking
        from payments.services import get_commission_rate
        Booking.objects.get_or_create(
            job=job,
            defaults={
                'accepted_offer': offer,
                'final_price': offer.total_price,
                'commission_rate': get_commission_rate(job.job_type),
                'payment_method': payment_method,
                'cod_allowed': offer.total_price <= COD_MAX_TND,
            }
        )

        # --- Create conversation + system message ---
        try:
            from messaging.services import get_or_create_conversation, send_system_message
            get_or_create_conversation(job)
            client_name = f"{request.user.first_name} {request.user.last_name}".strip()
            if payment_method == 'DIGITAL':
                next_step = "💳 Prochaine étape : le client procède au paiement sécurisé pour démarrer la mission."
            else:
                next_step = "🤝 Prochaine étape : le transporteur confirme le démarrage (paiement en espèces à la livraison)."
            send_system_message(
                job,
                f"🚀 Réservation directe — Trajet retour réservé !\n"
                f"Client : {client_name}\n"
                f"Montant proposé : {proposed_price} TND ({payment_method})\n"
                f"{next_step}\n"
                f"Vous pouvez désormais échanger librement.",
                actor=request.user
            )
        except Exception:
            pass  # Conversation failure must never block booking

        # --- Notify transporter ---
        try:
            from notifications.emails import notify_offer_accepted as email_notify
            email_notify(offer)
        except Exception:
            pass

        try:
            from notifications.services import notify_offer_accepted as db_notify
            db_notify(offer)
        except Exception:
            pass

        # --- Response ---
        response_data = {
            'message': f'Trajet retour réservé ({payment_method}). Mission assignée — en attente de paiement.',
            'payment_method': payment_method,
            'proposed_price': str(proposed_price),
            'job': TransportJobDetailSerializer(job, context={'show_contact': True, 'request': request}).data,
            'accepted_offer': OfferDetailSerializer(offer).data,
        }

        return Response(response_data, status=status.HTTP_201_CREATED)
