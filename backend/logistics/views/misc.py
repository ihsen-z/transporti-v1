"""Miscellaneous views: favorites, cross-role dashboard metrics, price estimation."""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from ..models import TransportJob, Offer
from users.permissions import RequireRole


class PriceEstimateView(APIView):
    """
    POST /api/jobs/estimate-price/
    Public endpoint - returns estimated price range based on coordinates and job type.
    No authentication required.
    """
    permission_classes = []  # Public access

    def post(self, request):
        from ..pricing import estimate_price

        pickup_lat = request.data.get('pickup_lat')
        pickup_lng = request.data.get('pickup_lng')
        dropoff_lat = request.data.get('dropoff_lat')
        dropoff_lng = request.data.get('dropoff_lng')
        job_type = request.data.get('job_type', 'TRANSPORT')

        # Validate required fields
        missing = []
        for field_name, val in [('pickup_lat', pickup_lat), ('pickup_lng', pickup_lng),
                                 ('dropoff_lat', dropoff_lat), ('dropoff_lng', dropoff_lng)]:
            if val is None:
                missing.append(field_name)

        if missing:
            return Response(
                {'error': f"Missing required fields: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate job_type
        valid_types = ['TRANSPORT', 'MOVING']
        if job_type not in valid_types:
            return Response(
                {'error': f"Invalid job_type. Must be one of: {', '.join(valid_types)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = estimate_price(
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            dropoff_lat=dropoff_lat,
            dropoff_lng=dropoff_lng,
            job_type=job_type,
        )

        if result.get('error'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class FavoriteToggleView(APIView):
    """
    POST /api/favorites/toggle/
    P2-09: Toggle favorite status for a transporter.
    Body: { "transporter_id": int }
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def post(self, request):
        transporter_id = request.data.get('transporter_id')
        if not transporter_id:
            return Response(
                {'error': 'transporter_id requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from django.contrib.auth import get_user_model
        User = get_user_model()
        transporter = get_object_or_404(User, id=transporter_id, role='TRANSPORTER')

        from logistics.models import FavoriteTransporter
        fav, created = FavoriteTransporter.objects.get_or_create(
            client=request.user,
            transporter=transporter
        )

        if not created:
            fav.delete()
            return Response({'status': 'removed', 'is_favorite': False})

        return Response({'status': 'added', 'is_favorite': True}, status=status.HTTP_201_CREATED)


class FavoriteListView(APIView):
    """
    GET /api/favorites/
    P2-09: List all favorite transporters for the current client.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def get(self, request):
        from logistics.models import FavoriteTransporter
        favs = FavoriteTransporter.objects.filter(
            client=request.user
        ).select_related('transporter').order_by('-created_at')

        results = []
        for fav in favs:
            t = fav.transporter
            name = f"{t.first_name} {t.last_name}".strip()
            # Get trust profile info
            trust_info = {}
            try:
                tp = t.trust_profile
                trust_info = {
                    'is_verified': tp.is_verified,
                    'total_jobs_completed': tp.total_jobs_completed,
                    'trust_score': tp.trust_score,
                }
            except Exception:
                pass

            results.append({
                'id': fav.id,
                'transporter_id': t.id,
                'transporter_name': name or t.email.split('@')[0],
                'favorited_at': fav.created_at,
                **trust_info,
            })

        return Response(results)


class CrossMetricsView(APIView):
    """
    GET /api/metrics/dashboard/
    P2-01: Cross metrics for client or transporter dashboard.
    Returns role-specific KPIs.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from django.db.models import Count, Avg, Sum

        if user.role == 'CLIENT':
            jobs = TransportJob.objects.filter(owner=user)
            total_jobs = jobs.count()
            active_jobs = jobs.filter(status__in=['PUBLISHED', 'IN_PROGRESS']).count()
            completed_jobs = jobs.filter(status='COMPLETED').count()
            total_spent = Offer.objects.filter(
                job__owner=user, status='ACCEPTED', job__status='COMPLETED'
            ).aggregate(total=Sum('total_price'))['total'] or 0

            from reviews.models import Review
            avg_rating_given = Review.objects.filter(
                reviewer=user
            ).aggregate(avg=Avg('rating'))['avg'] or 0

            from logistics.models import FavoriteTransporter
            fav_count = FavoriteTransporter.objects.filter(client=user).count()

            return Response({
                'role': 'CLIENT',
                'total_jobs': total_jobs,
                'active_jobs': active_jobs,
                'completed_jobs': completed_jobs,
                'total_spent': float(total_spent),
                'avg_rating_given': round(float(avg_rating_given), 1),
                'favorite_transporters': fav_count,
            })

        elif user.role == 'TRANSPORTER':
            offers = Offer.objects.filter(transporter=user)
            total_offers = offers.count()
            accepted_offers = offers.filter(status='ACCEPTED').count()
            completed = offers.filter(status='ACCEPTED', job__status='COMPLETED').count()
            total_earned = offers.filter(
                status='ACCEPTED', job__status='COMPLETED'
            ).aggregate(total=Sum('price_net'))['total'] or 0

            from reviews.models import Review
            avg_rating = Review.objects.filter(
                target=user
            ).aggregate(avg=Avg('rating'))['avg'] or 0
            review_count = Review.objects.filter(target=user).count()

            return Response({
                'role': 'TRANSPORTER',
                'total_offers': total_offers,
                'accepted_offers': accepted_offers,
                'completed_missions': completed,
                'acceptance_rate': round((accepted_offers / total_offers * 100), 1) if total_offers > 0 else 0,
                'total_earned': float(total_earned),
                'avg_rating': round(float(avg_rating), 1),
                'review_count': review_count,
            })

        return Response({'error': 'Role not supported.'}, status=status.HTTP_400_BAD_REQUEST)
