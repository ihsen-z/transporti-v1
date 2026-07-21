"""
Sprint 4 (pivot) — matching v1 & corridor alerts.

- GET /api/return-trips/match/ : return trips compatible with a corridor
  (governorates both ways + optional ±window around a date). Powers the
  inverted client funnel and the suggestion banner in the classic form.
- /api/corridor-alerts/ : client subscriptions to a corridor (D14 — clients).
  Publication trigger lives in ReturnTripCreateView.
"""
from datetime import timedelta

from django.db.models.functions import Greatest
from django.db.models import F, ExpressionWrapper, DurationField
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from users.permissions import RequireRole
from ..models import TransportJob, CorridorAlert
from ..serializers import TransportJobListSerializer


class ReturnTripMatchView(APIView):
    """
    GET /api/return-trips/match/?pickup_governorate=&dropoff_governorate=&date=&window_hours=48
    Matching v1: PUBLISHED future return trips on the corridor, closest date first.
    """
    permission_classes = [IsAuthenticated]

    MAX_RESULTS = 10
    DEFAULT_WINDOW_HOURS = 48

    def get(self, request):
        pickup = request.query_params.get('pickup_governorate', '').strip()
        dropoff = request.query_params.get('dropoff_governorate', '').strip()
        if not pickup or not dropoff:
            return Response(
                {'error': 'pickup_governorate et dropoff_governorate sont requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = TransportJob.objects.filter(
            status=TransportJob.Status.PUBLISHED,
            is_return_trip=True,
            scheduled_time__gte=timezone.now(),
            pickup_governorate__iexact=pickup,
            dropoff_governorate__iexact=dropoff,
        ).exclude(owner=request.user).select_related('owner').prefetch_related('offers')

        # Optional date window (±window_hours around the requested date)
        raw_date = request.query_params.get('date')
        target = None
        if raw_date:
            target = parse_datetime(raw_date)
            if target is None:
                d = parse_date(raw_date)
                if d:
                    target = timezone.make_aware(
                        timezone.datetime(d.year, d.month, d.day, 12, 0)
                    )
        if target:
            try:
                window = int(request.query_params.get('window_hours', self.DEFAULT_WINDOW_HOURS))
            except ValueError:
                window = self.DEFAULT_WINDOW_HOURS
            window = max(1, min(window, 24 * 14))
            queryset = queryset.filter(
                scheduled_time__gte=target - timedelta(hours=window),
                scheduled_time__lte=target + timedelta(hours=window),
            ).annotate(
                # Écart absolu à la date cible. On évite Abs() sur un interval
                # (inexistant sous PostgreSQL : `abs(interval)`), en prenant le
                # plus grand de l'écart et de son opposé — |Δ| — ce qui marche
                # aussi bien sur PostgreSQL que sur SQLite.
                date_gap=Greatest(
                    ExpressionWrapper(
                        F('scheduled_time') - target, output_field=DurationField()
                    ),
                    ExpressionWrapper(
                        target - F('scheduled_time'), output_field=DurationField()
                    ),
                )
            ).order_by('date_gap')
        else:
            queryset = queryset.order_by('scheduled_time')

        results = queryset[:self.MAX_RESULTS]
        return Response({
            'count': queryset.count(),
            'results': TransportJobListSerializer(results, many=True).data,
        })


class CorridorAlertListCreateView(APIView):
    """
    GET  /api/corridor-alerts/ — the client's active alerts
    POST /api/corridor-alerts/ — subscribe to a corridor
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    MAX_ALERTS = 10

    def get(self, request):
        alerts = CorridorAlert.objects.filter(client=request.user, is_active=True)
        return Response({
            'count': alerts.count(),
            'results': [
                {
                    'id': a.id,
                    'pickup_governorate': a.pickup_governorate,
                    'dropoff_governorate': a.dropoff_governorate,
                    'created_at': a.created_at.isoformat(),
                }
                for a in alerts
            ],
        })

    def post(self, request):
        pickup = str(request.data.get('pickup_governorate', '')).strip()
        dropoff = str(request.data.get('dropoff_governorate', '')).strip()
        if not pickup or not dropoff:
            return Response(
                {'error': 'pickup_governorate et dropoff_governorate sont requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if pickup.lower() == dropoff.lower():
            return Response(
                {'error': 'Le départ et l\'arrivée doivent être différents.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        active_count = CorridorAlert.objects.filter(client=request.user, is_active=True).count()
        if active_count >= self.MAX_ALERTS:
            return Response(
                {'error': f'Maximum {self.MAX_ALERTS} alertes actives.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        alert, created = CorridorAlert.objects.get_or_create(
            client=request.user,
            pickup_governorate=pickup,
            dropoff_governorate=dropoff,
        )
        if not created and not alert.is_active:
            alert.is_active = True
            alert.save()
            created = True

        return Response({
            'message': 'Alerte créée. Vous serez notifié dès qu\'un trajet compatible est publié.'
                       if created else 'Vous avez déjà une alerte sur ce corridor.',
            'alert': {'id': alert.id, 'pickup_governorate': alert.pickup_governorate,
                      'dropoff_governorate': alert.dropoff_governorate},
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CorridorAlertDeleteView(APIView):
    """DELETE /api/corridor-alerts/{id}/ — unsubscribe."""
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def delete(self, request, alert_id):
        alert = get_object_or_404(CorridorAlert, id=alert_id, client=request.user)
        alert.is_active = False
        alert.save()
        return Response({'message': 'Alerte supprimée.'})


def notify_corridor_alerts(job):
    """
    Publication trigger (called by ReturnTripCreateView): notify every client
    subscribed to the trip's corridor. Best effort — never blocks creation.
    """
    try:
        from notifications.services import notify
        alerts = CorridorAlert.objects.filter(
            is_active=True,
            pickup_governorate__iexact=job.pickup_governorate or '',
            dropoff_governorate__iexact=job.dropoff_governorate or '',
        ).select_related('client')
        for alert in alerts:
            notify(
                user=alert.client,
                notification_type='CORRIDOR_TRIP_PUBLISHED',
                title='🚚 Nouveau trajet sur votre corridor',
                message=f'Un transporteur a publié un trajet {job.pickup_governorate} → '
                        f'{job.dropoff_governorate}. Réservez avant qu\'il ne parte !',
                metadata={'job_id': job.id, 'alert_id': alert.id},
            )
    except Exception:
        pass
