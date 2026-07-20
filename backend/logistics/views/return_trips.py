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
            # Sprint 4 — corridor alerts: tell subscribed clients right away
            from .corridors import notify_corridor_alerts
            notify_corridor_alerts(job)

            # Sprint 5 — reverse matching (P2/P3): open classic requests on
            # this corridor the transporter can bid on right now.
            from ..serializers import TransportJobListSerializer
            matching_requests = TransportJob.objects.filter(
                status=TransportJob.Status.PUBLISHED,
                is_return_trip=False,
                scheduled_time__gte=timezone.now(),
                pickup_governorate__iexact=job.pickup_governorate or '',
                dropoff_governorate__iexact=job.dropoff_governorate or '',
            ).exclude(owner=request.user).order_by('scheduled_time')

            return Response({
                'message': 'Return trip created successfully.',
                'job': TransportJobDetailSerializer(job, context={'request': request}).data,
                'matching_requests_count': matching_requests.count(),
                'matching_requests': TransportJobListSerializer(
                    matching_requests[:5], many=True
                ).data,
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

        # D11: instant booking is an opt-in per trip (off by default) — the
        # normal path is the structured request (POST /api/jobs/<id>/requests/).
        if not job.instant_booking:
            return Response(
                {'error': 'Ce trajet n\'accepte pas la réservation immédiate. Envoyez une demande au transporteur.',
                 'code': 'REQUEST_REQUIRED'},
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
        commission, price_net = derive_net_from_total(job.job_type, proposed_price, is_return_trip=True)

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
                'commission_rate': get_commission_rate(job.job_type, is_return_trip=True),
                'payment_method': payment_method,
                'cod_allowed': offer.total_price <= COD_MAX_TND,
            }
        )

        # --- Create conversation + system message ---
        try:
            from messaging.services import get_or_create_conversation, send_system_message
            conversation = get_or_create_conversation(job)
            # Return trips: owner == transporter — add the CLIENT explicitly
            conversation.participants.add(request.user)
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


class ReturnTripManageView(APIView):
    """
    PATCH  /api/jobs/{job_id}/return-trip/  — owner edits a PUBLISHED return trip
    DELETE /api/jobs/{job_id}/return-trip/  — owner removes it (soft: CANCELLED)
    C9 (audit): the missing owner lifecycle.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]

    def _get_own_trip(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id, is_return_trip=True)
        if job.owner_id != request.user.id:
            return None, Response(
                {'error': "Vous n'êtes pas le propriétaire de ce trajet."},
                status=status.HTTP_403_FORBIDDEN
            )
        if job.status != TransportJob.Status.PUBLISHED:
            return None, Response(
                {'error': f"Seul un trajet publié peut être modifié ou supprimé (statut : {job.status})."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return job, None

    def patch(self, request, job_id):
        from ..serializers import ReturnTripUpdateSerializer
        job, error = self._get_own_trip(request, job_id)
        if error:
            return error
        serializer = ReturnTripUpdateSerializer(job, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            'message': 'Trajet retour mis à jour.',
            'job': TransportJobDetailSerializer(job, context={'request': request}).data,
        })

    @transaction.atomic
    def delete(self, request, job_id):
        job, error = self._get_own_trip(request, job_id)
        if error:
            return error

        # Reject and notify pending structured requests
        from ..models import ReturnTripRequest
        pending = list(job.trip_requests.filter(status__in=['PENDING', 'COUNTERED']))
        job.trip_requests.filter(id__in=[p.id for p in pending]).update(
            status=ReturnTripRequest.Status.REJECTED,
            response_message='Le transporteur a retiré ce trajet.',
        )
        try:
            from notifications.services import notify
            for p in pending:
                notify(
                    user=p.client,
                    notification_type='TRIP_REQUEST_REJECTED',
                    title='Trajet retiré',
                    message='Le transporteur a retiré le trajet retour sur lequel vous aviez une demande.',
                    metadata={'job_id': job.id, 'request_id': p.id},
                )
        except Exception:
            pass

        job.status = TransportJob.Status.CANCELLED
        job.save()
        return Response({'message': 'Trajet retour supprimé.', 'status': 'CANCELLED'})
