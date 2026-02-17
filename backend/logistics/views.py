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
    TransportJobUpdateSerializer, TransporterProfileSerializer
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
        ).order_by('-created_at')


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
        ).order_by('-created_at')

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
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    def get(self, request, job_id):
        job = get_object_or_404(TransportJob, id=job_id, owner=request.user)
        serializer = TransportJobDetailSerializer(
            job, 
            context={'request': request, 'show_contact': True}
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
        return Offer.objects.filter(job=job).order_by('-created_at')


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
        ).order_by('-created_at')


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

        # 4. Create escrow (digital payment assumed by default)
        from payments.services import create_escrow_on_booking
        try:
            escrow = create_escrow_on_booking(job=job, offer=offer)
        except ValueError as e:
            # Log error but don't fail the booking
            # In production, this would trigger an alert
            escrow = None

        response_data = {
            'message': 'Offer accepted successfully. Job is now IN_PROGRESS.',
            'job': TransportJobDetailSerializer(job, context={'show_contact': True}).data,
            'accepted_offer': OfferDetailSerializer(offer).data
        }
        
        if escrow:
            from payments.serializers import EscrowDetailSerializer
            response_data['escrow'] = EscrowDetailSerializer(escrow).data

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
