"""Job CRUD and lifecycle views (create, list, detail, publish, cancel, complete)."""
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404

from ..models import TransportJob, Offer
from ..serializers import (
    TransportJobCreateSerializer, TransportJobListSerializer,
    TransportJobDetailSerializer, TransportJobUpdateSerializer,
    TransporterMissionSerializer,
)
from users.permissions import RequireRole


class JobCreateView(generics.CreateAPIView):
    """
    POST /api/jobs/
    Client creates a new transport job.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]
    serializer_class = TransportJobCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            job = serializer.save()
            return Response({
                'message': 'Job created successfully.',
                'job': TransportJobDetailSerializer(job, context={'request': request}).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JobMyListView(generics.ListAPIView):
    """
    GET /api/jobs/my/
    Client views their own jobs.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]
    serializer_class = TransportJobListSerializer

    def get_queryset(self):
        return TransportJob.objects.filter(
            owner=self.request.user
        ).select_related('owner').prefetch_related('offers').order_by('-created_at')


class TransporterJobListView(generics.ListAPIView):
    """
    GET /api/jobs/transporter/
    Transporter views their assigned missions (jobs with ACCEPTED offers).
    Also includes return trips they created.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]
    serializer_class = TransporterMissionSerializer

    def get_queryset(self):
        user = self.request.user
        # Jobs where transporter has an accepted offer
        assigned = TransportJob.objects.filter(
            offers__transporter=user,
            offers__status='ACCEPTED'
        )
        # Return trips created by this transporter
        return_trips = TransportJob.objects.filter(
            owner=user,
            is_return_trip=True
        )
        return (assigned | return_trips).select_related(
            'owner'
        ).prefetch_related('offers').distinct().order_by('-created_at')


class JobPublicListView(generics.ListAPIView):
    """
    GET /api/jobs/public/
    Browse PUBLISHED jobs. Open to all users (including unauthenticated).
    Filters out expired tasks (scheduled < now).
    Supports query params: job_type, pickup_governorate, dropoff_governorate.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = TransportJobListSerializer

    def get_queryset(self):
        queryset = TransportJob.objects.filter(
            status=TransportJob.Status.PUBLISHED,
            scheduled_time__gte=timezone.now()
        ).select_related('owner').prefetch_related('offers').order_by('-created_at')

        # VISIBILITY: Transporters should NOT see other transporters' return trips
        # Only CLIENT, ADMIN, and unauthenticated users can see return trip publications
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'role') and user.role == 'TRANSPORTER':
            queryset = queryset.filter(is_return_trip=False)

        # Filter by return trip flag (e.g. ?is_return_trip=true)
        is_return = self.request.query_params.get('is_return_trip')
        if is_return is not None:
            queryset = queryset.filter(is_return_trip=is_return.lower() in ('true', '1'))

        # Apply Filters
        job_type = self.request.query_params.get('job_type')
        if job_type:
            queryset = queryset.filter(job_type=job_type)

        pickup_gov = self.request.query_params.get('pickup_governorate')
        if pickup_gov:
            queryset = queryset.filter(pickup_governorate=pickup_gov)

        dropoff_gov = self.request.query_params.get('dropoff_governorate')
        if dropoff_gov:
            queryset = queryset.filter(dropoff_governorate=dropoff_gov)

        # Full-text search (Phase 3: ?q=keyword)
        search_q = self.request.query_params.get('q', '').strip()
        if search_q:
            try:
                # PostgreSQL full-text search (production)
                from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
                search_vector = SearchVector('title', weight='A') + \
                                SearchVector('description', weight='B') + \
                                SearchVector('pickup_address', weight='C') + \
                                SearchVector('dropoff_address', weight='C')
                search_query = SearchQuery(search_q, config='french')
                queryset = queryset.annotate(
                    search_rank=SearchRank(search_vector, search_query)
                ).filter(search_rank__gte=0.01).order_by('-search_rank', '-created_at')
            except ImportError:
                # Fallback: icontains for SQLite dev
                from django.db.models import Q
                queryset = queryset.filter(
                    Q(title__icontains=search_q) |
                    Q(description__icontains=search_q) |
                    Q(pickup_address__icontains=search_q) |
                    Q(dropoff_address__icontains=search_q)
                )

        # Price range filters (?min_price=X&max_price=Y)
        min_price = self.request.query_params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(budget_max__gte=float(min_price))
            except (ValueError, TypeError):
                pass
        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(budget_min__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        # Sort options (?sort_by=price_asc|price_desc|newest|closest_date)
        sort_by = self.request.query_params.get('sort_by', '')
        if sort_by == 'price_asc':
            queryset = queryset.order_by('budget_min', '-created_at')
        elif sort_by == 'price_desc':
            queryset = queryset.order_by('-budget_max', '-created_at')
        elif sort_by == 'closest_date':
            queryset = queryset.order_by('scheduled_time', '-created_at')
        # Default: newest first (already set above)

        return queryset


class JobDetailView(APIView):
    """
    GET /api/jobs/{id}/
    Client views their own job details.
    Transporter views PUBLISHED jobs or jobs they have offers on.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT', 'TRANSPORTER')]

    def get(self, request, job_id):
        job = get_object_or_404(TransportJob.objects.select_related('owner'), id=job_id)

        # Client: must own the job OR job is PUBLISHED (return trips from transporters)
        if request.user.role == 'CLIENT':
            if job.owner != request.user and job.status != TransportJob.Status.PUBLISHED:
                return Response(
                    {'error': 'You do not own this job.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        # Transporter: can view PUBLISHED jobs, or jobs they have offers on
        elif request.user.role == 'TRANSPORTER':
            has_offer = Offer.objects.filter(job=job, transporter=request.user).exists()
            if job.status != TransportJob.Status.PUBLISHED and not has_offer:
                return Response(
                    {'error': 'Job not available.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # P1-05: Increment view count for non-owners (atomic, no race condition)
        if job.owner != request.user:
            from django.db.models import F
            TransportJob.objects.filter(id=job_id).update(view_count=F('view_count') + 1)

        serializer = TransportJobDetailSerializer(
            job,
            context={'request': request, 'show_contact': job.owner == request.user}
        )
        return Response(serializer.data)


class JobUpdateView(generics.UpdateAPIView):
    """
    PUT/PATCH /api/jobs/{id}/
    Client edits a DRAFT job.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]
    serializer_class = TransportJobUpdateSerializer
    queryset = TransportJob.objects.all()
    lookup_field = 'id'

    def get_queryset(self):
        return TransportJob.objects.filter(owner=self.request.user, status=TransportJob.Status.DRAFT)


class JobPublishView(APIView):
    """
    POST /api/jobs/{id}/publish/
    Client publishes a DRAFT job.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def post(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id, owner=request.user)

        if job.status != TransportJob.Status.DRAFT:
            return Response({'error': 'Only DRAFT jobs can be published.'}, status=status.HTTP_400_BAD_REQUEST)

        job.status = TransportJob.Status.PUBLISHED
        job.save()

        return Response({
            'message': 'Job published successfully.',
            'job': TransportJobDetailSerializer(job, context={'request': request}).data
        })


class TransporterCancelView(APIView):
    """
    POST /api/jobs/{id}/transporter-cancel/
    P2-03: Assigned transporter cancels an IN_PROGRESS job.
    Triggers escrow refund if DIGITAL, reverts job to PUBLISHED.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]

    @transaction.atomic
    def post(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id)

        # Verify transporter is the assignee
        offer = job.offers.filter(
            status=Offer.Status.ACCEPTED,
            transporter=request.user
        ).first()
        if not offer:
            return Response(
                {'error': 'Vous n\'êtes pas assigné à cette mission.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if job.status != TransportJob.Status.IN_PROGRESS:
            return Response(
                {'error': 'Annulation possible uniquement pour les missions en cours.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'error': 'Veuillez fournir une raison pour l\'annulation.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Revert offer status
        offer.status = Offer.Status.WITHDRAWN
        offer.save()

        # 2. Revert job to PUBLISHED so client can receive new offers
        job.status = TransportJob.Status.PUBLISHED
        job.save()

        # 3. Refund escrow if DIGITAL payment
        try:
            from payments.models import EscrowTransaction
            escrow = EscrowTransaction.objects.filter(
                booking_reference=job,
                status=EscrowTransaction.Status.HELD,
            ).first()
            if escrow:
                from payments.services import refund_escrow
                refund_escrow(escrow, reason=f"Transporter cancellation: {reason}")
        except Exception:
            pass  # Log but don't block

        # 4. System message in conversation
        try:
            from messaging.services import send_system_message
            transporter_name = f"{request.user.first_name} {request.user.last_name}".strip()
            send_system_message(
                job,
                f"⚠️ Le transporteur {transporter_name} a annulé la mission.\n"
                f"Raison : {reason}\n"
                f"La mission est de nouveau ouverte aux offres.",
                actor=request.user
            )
        except Exception:
            pass

        # 5. Notify client
        try:
            from notifications.services import notify_transporter_cancelled
            notify_transporter_cancelled(job, request.user, reason)
        except Exception:
            pass

        return Response({
            'message': 'Mission annulée. La mission est de nouveau ouverte aux offres.',
            'job_status': 'PUBLISHED',
        })


class JobCancelView(APIView):
    """
    POST /api/jobs/{id}/cancel/
    Client cancels a job (DRAFT or PUBLISHED).
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def post(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id, owner=request.user)

        if job.status not in [TransportJob.Status.DRAFT, TransportJob.Status.PUBLISHED]:
            return Response(
                {'error': 'Cannot cancel job in current status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        job.status = TransportJob.Status.CANCELLED
        job.save()

        # Withdraw all offers
        job.offers.update(status=Offer.Status.EXPIRED)

        # Auto-lock conversation if one exists (#7)
        try:
            from messaging.models import Conversation
            conv = Conversation.objects.filter(job=job).first()
            if conv:
                conv.lock()
        except Exception:
            pass

        # DB notification (P0 Fix)
        try:
            from notifications.services import notify_job_cancelled
            notify_job_cancelled(job)
        except Exception:
            pass

        return Response({'message': 'Job cancelled successfully.'})


class JobCompleteView(APIView):
    """
    POST /api/jobs/{id}/complete/
    Transporter marks job as completed (Delivered).
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('TRANSPORTER')]

    def post(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id)

        # Verify transporter is the assignee
        offer = job.offers.filter(status=Offer.Status.ACCEPTED, transporter=request.user).first()
        if not offer:
            return Response({'error': 'You are not assigned to this job.'}, status=status.HTTP_403_FORBIDDEN)

        if job.status != TransportJob.Status.IN_PROGRESS:
            return Response({'error': 'Job is not in progress.'}, status=status.HTTP_400_BAD_REQUEST)

        job.status = TransportJob.Status.COMPLETED
        job.save()

        # Auto-lock conversation (#7) + system message
        try:
            from messaging.models import Conversation
            from messaging.services import send_system_message
            conv = Conversation.objects.filter(job=job).first()
            if conv:
                conv.lock()
                send_system_message(
                    job=job,
                    content=(
                        "✅ Mission terminée — La livraison a été confirmée.\n"
                        "La conversation est maintenant verrouillée.\n"
                        "En cas de problème, vous pouvez ouvrir un litige."
                    )
                )
        except Exception:
            pass  # Don't block completion if messaging fails

        # DB notification (P0 Fix)
        try:
            from notifications.services import notify_job_completed
            notify_job_completed(job)
        except Exception:
            pass

        return Response({'message': 'Job marked as completed.'})
