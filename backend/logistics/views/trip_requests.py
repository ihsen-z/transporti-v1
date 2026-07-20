"""
Return-trip structured requests (Sprint 3 — pivot core, decision D5).

Client → sends a structured request (goods, photos, proposed client total,
payment method) on a PUBLISHED return trip.
Transporter (trip owner) → accepts / rejects / counters.
Acceptance closes the trip (D12 unitaire) and enters the D3 payment flow at
the RETURN_TRIP commission rate (D13, 8%).
"""
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from users.permissions import RequireRole
from ..models import TransportJob, Offer, ReturnTripRequest
from ..serializers import (
    ReturnTripRequestSerializer, ReturnTripRequestCreateSerializer,
    TransportJobDetailSerializer,
)


def _notify(user, notif_type, title, message, metadata=None):
    try:
        from notifications.services import notify
        notify(user=user, notification_type=notif_type, title=title,
               message=message, metadata=metadata or {})
    except Exception:
        pass


class JobTripRequestsView(APIView):
    """
    POST /api/jobs/{job_id}/requests/  — client sends a structured request
    GET  /api/jobs/{job_id}/requests/  — trip owner lists received requests
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id, is_return_trip=True)
        if job.owner_id != request.user.id:
            return Response(
                {'error': "Seul le propriétaire du trajet peut consulter les demandes reçues."},
                status=status.HTTP_403_FORBIDDEN
            )
        requests_qs = job.trip_requests.select_related('client').order_by('-created_at')
        return Response({
            'count': requests_qs.count(),
            'results': ReturnTripRequestSerializer(requests_qs, many=True).data,
        })

    def post(self, request, job_id):
        if getattr(request.user, 'role', None) != 'CLIENT':
            return Response(
                {'error': 'Seuls les clients peuvent envoyer une demande sur un trajet retour.'},
                status=status.HTTP_403_FORBIDDEN
            )
        job = get_object_or_404(TransportJob, id=job_id, is_return_trip=True)

        if job.status != TransportJob.Status.PUBLISHED:
            return Response(
                {'error': "Ce trajet n'est plus disponible."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if job.scheduled_time and job.scheduled_time < timezone.now():
            return Response(
                {'error': 'Ce trajet retour est expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if job.trip_requests.filter(
            client=request.user, status__in=['PENDING', 'COUNTERED']
        ).exists():
            return Response(
                {'error': 'Vous avez déjà une demande en cours sur ce trajet.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReturnTripRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trip_request = serializer.save(job=job, client=request.user)

        _notify(
            job.owner, 'TRIP_REQUEST_RECEIVED',
            '📩 Nouvelle demande sur votre trajet retour',
            f"{request.user.first_name} propose {trip_request.proposed_price} TND "
            f"pour votre trajet {job.pickup_governorate} → {job.dropoff_governorate}.",
            {'job_id': job.id, 'request_id': trip_request.id},
        )

        return Response({
            'message': 'Demande envoyée. Le transporteur va vous répondre.',
            'request': ReturnTripRequestSerializer(trip_request).data,
        }, status=status.HTTP_201_CREATED)


class MyTripRequestsView(generics.ListAPIView):
    """GET /api/trip-requests/my/ — client's sent requests."""
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]
    serializer_class = ReturnTripRequestSerializer

    def get_queryset(self):
        return ReturnTripRequest.objects.filter(
            client=self.request.user
        ).select_related('job', 'client').order_by('-created_at')


def _accept_request(request_obj, client_total):
    """
    Shared acceptance path (transporter accepts / client accepts counter).
    Runs inside an atomic transaction with the job row locked.
    Returns (offer, error_response).
    """
    from decimal import Decimal
    from payments.services import derive_net_from_total, get_commission_rate
    from payments.models import Booking

    job = TransportJob.objects.select_for_update().get(id=request_obj.job_id)
    if job.status != TransportJob.Status.PUBLISHED:
        return None, Response(
            {'error': "Ce trajet n'est plus disponible."},
            status=status.HTTP_400_BAD_REQUEST
        )

    total = Decimal(str(client_total))
    commission, price_net = derive_net_from_total(job.job_type, total, is_return_trip=True)

    offer = Offer.objects.create(
        job=job,
        transporter=job.owner,
        status=Offer.Status.ACCEPTED,
        total_price=total,
        price_net=price_net,
        commission_amount=commission,
        message=f"Demande structurée #{request_obj.id} acceptée — {request_obj.description[:120]}",
        valid_until=timezone.now() + timezone.timedelta(days=7),
    )

    COD_MAX = 300
    Booking.objects.get_or_create(
        job=job,
        defaults={
            'accepted_offer': offer,
            'final_price': total,
            'commission_rate': get_commission_rate(job.job_type, is_return_trip=True),
            'payment_method': request_obj.payment_method,
            'cod_allowed': total <= COD_MAX,
        }
    )

    # D3: MATCHED until payment secured (digital) or transporter confirm (COD)
    job.status = TransportJob.Status.MATCHED
    job.save()

    request_obj.status = ReturnTripRequest.Status.ACCEPTED
    request_obj.save()

    # D12 unitaire: the trip is closed — reject all other pending requests
    others = list(job.trip_requests.filter(status__in=['PENDING', 'COUNTERED']).exclude(id=request_obj.id))
    job.trip_requests.filter(id__in=[o.id for o in others]).update(
        status=ReturnTripRequest.Status.REJECTED,
        response_message='Le trajet a été réservé par un autre client.',
    )
    for other in others:
        _notify(
            other.client, 'TRIP_REQUEST_REJECTED',
            'Trajet plus disponible',
            'Le trajet retour a été réservé par un autre client.',
            {'job_id': job.id, 'request_id': other.id},
        )

    # Conversation: make sure the CLIENT is a participant (return trips:
    # owner == transporter, the generic helper would only add them)
    try:
        from messaging.services import get_or_create_conversation, send_system_message
        conversation = get_or_create_conversation(job)
        conversation.participants.add(request_obj.client)
        if request_obj.payment_method == 'DIGITAL':
            next_step = "💳 Prochaine étape : le client procède au paiement sécurisé pour démarrer la mission."
        else:
            next_step = "🤝 Prochaine étape : le transporteur confirme le démarrage (paiement en espèces à la livraison)."
        send_system_message(
            job,
            f"✅ Demande acceptée — Trajet retour réservé.\n"
            f"💰 Montant : {total} TND ({request_obj.payment_method})\n"
            f"{next_step}",
            actor=None,
        )
    except Exception:
        pass

    return offer, None


class TripRequestRespondView(APIView):
    """
    POST /api/trip-requests/{id}/respond/
    Body: { "action": "accept" | "reject" | "counter",
            "counter_price"?: decimal, "message"?: str }
    Trip owner (transporter) responds to a structured request.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]

    @transaction.atomic
    def post(self, request, request_id):
        trip_request = get_object_or_404(
            ReturnTripRequest.objects.select_for_update().select_related('job', 'client'),
            id=request_id
        )
        if trip_request.job.owner_id != request.user.id:
            return Response(
                {'error': "Vous n'êtes pas le propriétaire de ce trajet."},
                status=status.HTTP_403_FORBIDDEN
            )
        if trip_request.status != ReturnTripRequest.Status.PENDING:
            return Response(
                {'error': f"Cette demande n'est plus en attente (statut : {trip_request.status})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        action = str(request.data.get('action', '')).lower()
        message = str(request.data.get('message', '')).strip()[:500]

        if action == 'reject':
            trip_request.status = ReturnTripRequest.Status.REJECTED
            trip_request.response_message = message
            trip_request.save()
            _notify(
                trip_request.client, 'TRIP_REQUEST_REJECTED',
                'Demande refusée',
                'Le transporteur a refusé votre demande.' + (f' Motif : {message}' if message else ''),
                {'job_id': trip_request.job_id, 'request_id': trip_request.id},
            )
            return Response({'status': 'rejected', 'message': 'Demande refusée.'})

        if action == 'counter':
            from decimal import Decimal, InvalidOperation
            try:
                counter = Decimal(str(request.data.get('counter_price', '')))
            except (InvalidOperation, TypeError):
                return Response({'counter_price': ['Montant invalide.']}, status=status.HTTP_400_BAD_REQUEST)
            if counter <= 0:
                return Response({'counter_price': ['Le montant doit être supérieur à 0.']}, status=status.HTTP_400_BAD_REQUEST)
            COD_MAX = 300
            if trip_request.payment_method == 'COD' and counter > COD_MAX:
                return Response(
                    {'counter_price': [f'Paiement à la livraison limité à {COD_MAX} TND.']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            trip_request.status = ReturnTripRequest.Status.COUNTERED
            trip_request.counter_price = counter
            trip_request.response_message = message
            trip_request.save()
            _notify(
                trip_request.client, 'TRIP_REQUEST_COUNTERED',
                '↩️ Contre-proposition du transporteur',
                f'Le transporteur propose {counter} TND.' + (f' « {message} »' if message else ''),
                {'job_id': trip_request.job_id, 'request_id': trip_request.id},
            )
            return Response({'status': 'countered', 'message': 'Contre-proposition envoyée au client.'})

        if action == 'accept':
            offer, error = _accept_request(trip_request, trip_request.proposed_price)
            if error:
                return error
            trip_request.job.refresh_from_db()
            _notify(
                trip_request.client, 'TRIP_REQUEST_ACCEPTED',
                '✅ Demande acceptée !',
                f'Le transporteur a accepté votre demande ({trip_request.proposed_price} TND). '
                'Finalisez le paiement pour démarrer la mission.',
                {'job_id': trip_request.job_id, 'request_id': trip_request.id},
            )
            return Response({
                'status': 'accepted',
                'message': 'Demande acceptée. Le client va finaliser le paiement.',
                'job': TransportJobDetailSerializer(
                    trip_request.job, context={'request': request}
                ).data,
            })

        return Response(
            {'error': 'Action invalide. Utilisez "accept", "reject" ou "counter".'},
            status=status.HTTP_400_BAD_REQUEST
        )


class TripRequestAcceptCounterView(APIView):
    """
    POST /api/trip-requests/{id}/accept-counter/
    Client accepts the transporter's counter-proposal → same acceptance path
    at the countered price.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    @transaction.atomic
    def post(self, request, request_id):
        trip_request = get_object_or_404(
            ReturnTripRequest.objects.select_for_update().select_related('job', 'client'),
            id=request_id
        )
        if trip_request.client_id != request.user.id:
            return Response({'error': "Cette demande ne vous appartient pas."}, status=status.HTTP_403_FORBIDDEN)
        if trip_request.status != ReturnTripRequest.Status.COUNTERED or trip_request.counter_price is None:
            return Response(
                {'error': 'Aucune contre-proposition à accepter sur cette demande.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        offer, error = _accept_request(trip_request, trip_request.counter_price)
        if error:
            return error
        trip_request.job.refresh_from_db()

        _notify(
            trip_request.job.owner, 'TRIP_REQUEST_ACCEPTED',
            '✅ Contre-proposition acceptée',
            f'Le client a accepté votre contre-proposition ({trip_request.counter_price} TND).',
            {'job_id': trip_request.job_id, 'request_id': trip_request.id},
        )
        return Response({
            'status': 'accepted',
            'message': 'Contre-proposition acceptée. Finalisez le paiement pour démarrer la mission.',
            'job': TransportJobDetailSerializer(
                trip_request.job, context={'request': request}
            ).data,
        })


class TripRequestCancelView(APIView):
    """POST /api/trip-requests/{id}/cancel/ — client withdraws a pending request."""
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def post(self, request, request_id):
        trip_request = get_object_or_404(ReturnTripRequest, id=request_id, client=request.user)
        if trip_request.status not in (ReturnTripRequest.Status.PENDING, ReturnTripRequest.Status.COUNTERED):
            return Response(
                {'error': 'Cette demande ne peut plus être annulée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        trip_request.status = ReturnTripRequest.Status.CANCELLED
        trip_request.save()
        return Response({'status': 'cancelled', 'message': 'Demande annulée.'})
