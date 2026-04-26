from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import TransportJob, Offer
from .serializers import (
    TransportJobCreateSerializer, TransportJobListSerializer, 
    TransportJobDetailSerializer, OfferCreateSerializer, 
    OfferListSerializer, OfferDetailSerializer,
    OfferAcceptSerializer,
    TransportJobUpdateSerializer, TransporterProfileSerializer,
    TransporterMissionSerializer, ReturnTripCreateSerializer,
    TransporterProfileEditSerializer
)
from users.permissions import RequireRole, RequireVerification


# =============================================================================
# JOB VIEWS
# =============================================================================

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

        # Client: must own the job
        if request.user.role == 'CLIENT':
            if job.owner != request.user:
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

        serializer = TransportJobDetailSerializer(
            job, 
            context={'request': request, 'show_contact': job.owner == request.user}
        )
        return Response(serializer.data)


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


# =============================================================================
# OFFER VIEWS
# =============================================================================

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
        return Offer.objects.filter(
            transporter=self.request.user
        ).select_related('job', 'job__owner', 'transporter').order_by('-created_at')


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

        # Get offer and verify ownership
        offer = get_object_or_404(Offer, id=offer_id)
        job = offer.job

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

        # === ATOMIC STATE TRANSITIONS ===
        
        # 1. Accept this offer
        offer.status = Offer.Status.ACCEPTED
        offer.save()

        # 2. Reject all other offers on this job
        Offer.objects.filter(job=job).exclude(id=offer.id).update(
            status=Offer.Status.REJECTED
        )

        # 3. Update job status
        job.status = TransportJob.Status.IN_PROGRESS
        job.save()

        # 4. Handle payment
        escrow = None
        if payment_method == 'DIGITAL':
            from payments.services import create_escrow_on_booking
            try:
                escrow = create_escrow_on_booking(job=job, offer=offer)
            except ValueError as e:
                # Log error but don't fail the booking
                escrow = None

        # 5. Create conversation + system message (FIX #1 + #6)
        try:
            from messaging.services import get_or_create_conversation, send_system_message
            get_or_create_conversation(job)
            transporter_name = f"{offer.transporter.first_name} {offer.transporter.last_name}".strip()
            send_system_message(
                job,
                f"✅ Offre acceptée — La mission est maintenant en cours.\n"
                f"Transporteur : {transporter_name}\n"
                f"Montant : {offer.total_price} TND ({payment_method})\n"
                f"Vous pouvez désormais échanger librement.",
                actor=request.user
            )
        except Exception:
            pass  # Conversation failure must never block booking

        response_data = {
            'message': f'Offer accepted successfully ({payment_method}). Job is now IN_PROGRESS.',
            'payment_method': payment_method,
            'job': TransportJobDetailSerializer(job, context={'show_contact': True, 'request': request}).data,
            'accepted_offer': OfferDetailSerializer(offer).data
        }
        
        if escrow:
            from payments.serializers import EscrowDetailSerializer
            response_data['escrow'] = EscrowDetailSerializer(escrow).data

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


# =============================================================================
# JOB LIFECYCLE VIEWS
# =============================================================================

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


class TransporterProfileView(generics.RetrieveAPIView):
    """
    GET /api/transporter/profile/{user_id}/
    Public profile for transporters.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransporterProfileSerializer
    lookup_field = 'user_id' # Looking up via User ID, not TrustProfile ID directly
    
    def get_object(self):
        from trust.models import TrustProfile
        user_id = self.kwargs['user_id']
        return get_object_or_404(TrustProfile, user_id=user_id)


class TransporterProfileEditView(APIView):
    """
    GET  /api/transporter/profile/me/  — Returns own profile data.
    PATCH /api/transporter/profile/me/ — Updates own profile.
    Only accessible to authenticated transporters.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'TRANSPORTER':
            return Response(
                {'error': 'Réservé aux transporteurs.'},
                status=status.HTTP_403_FORBIDDEN
            )
        from trust.models import TrustProfile
        trust_profile = get_object_or_404(TrustProfile, user=request.user)
        serializer = TransporterProfileSerializer(trust_profile, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        if request.user.role != 'TRANSPORTER':
            return Response(
                {'error': 'Réservé aux transporteurs.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = TransporterProfileEditSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user = request.user

        # Validate email uniqueness if changed
        if 'email' in data and data['email'] != user.email:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if User.objects.filter(email=data['email']).exclude(id=user.id).exists():
                return Response(
                    {'email': ['Cet email est déjà utilisé par un autre compte.']},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Update User fields
        user_fields = ['first_name', 'last_name', 'phone', 'email']
        user_changed = False
        for field in user_fields:
            if field in data:
                setattr(user, field, data[field])
                user_changed = True
        if user_changed:
            user.save()

        # Update TrustProfile fields
        from trust.models import TrustProfile
        trust_profile = get_object_or_404(TrustProfile, user=user)
        profile_fields = ['vehicle_type', 'vehicle_capacity_kg', 'service_areas', 'specializations', 'vehicle_photos']
        for field in profile_fields:
            if field in data:
                setattr(trust_profile, field, data[field])
        trust_profile.save()

        # Return updated profile
        return Response({
            'message': 'Profil mis à jour avec succès.',
            'profile': TransporterProfileSerializer(trust_profile, context={'request': request}).data
        })
