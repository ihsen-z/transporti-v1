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
    TransporterProfileEditSerializer,
    ClientProfileSerializer, ClientProfileUpdateSerializer
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

        # 5. Create conversation + system message (FIX #1 + #6 + P2-02)
        try:
            from messaging.services import get_or_create_conversation, send_system_message
            get_or_create_conversation(job)
            transporter_name = f"{offer.transporter.first_name} {offer.transporter.last_name}".strip()
            payment_label = "Paiement digital (escrow)" if payment_method == "DIGITAL" else "Paiement à la livraison (COD)"
            send_system_message(
                job,
                f"✅ Offre acceptée — La mission est maintenant en cours.\n"
                f"📦 Transporteur : {transporter_name}\n"
                f"💰 Montant : {offer.total_price} TND\n"
                f"💳 Mode de paiement : {payment_label}\n"
                f"📄 Réservation : /booking/{job.id}\n"
                f"💬 Vous pouvez désormais échanger librement.\n"
                f"⚠️ En cas de problème, ouvrez un litige depuis la page mission.",
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
# RETURN TRIP BOOKING
# =============================================================================

class BookReturnTripView(APIView):
    """
    POST /api/jobs/{job_id}/book-return/
    Client books a return trip directly.
    Creates offer at client's proposed price, auto-accepts, transitions to IN_PROGRESS.
    """
    permission_classes = [IsAuthenticated, RequireRole.for_roles('CLIENT')]

    @transaction.atomic
    def post(self, request, job_id):
        from payments.services import calculate_commission, create_escrow_on_booking

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
        commission, price_net = calculate_commission(job.job_type, proposed_price)

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

        # --- Transition job → IN_PROGRESS ---
        job.status = TransportJob.Status.IN_PROGRESS
        job.save()

        # --- Handle payment ---
        escrow = None
        if payment_method == 'DIGITAL':
            try:
                escrow = create_escrow_on_booking(job=job, offer=offer)
            except ValueError:
                escrow = None

        # --- Create conversation + system message ---
        try:
            from messaging.services import get_or_create_conversation, send_system_message
            get_or_create_conversation(job)
            client_name = f"{request.user.first_name} {request.user.last_name}".strip()
            send_system_message(
                job,
                f"🚀 Réservation directe — Trajet retour réservé !\n"
                f"Client : {client_name}\n"
                f"Montant proposé : {proposed_price} TND ({payment_method})\n"
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
            'message': f'Trajet retour réservé avec succès ({payment_method}). Mission en cours.',
            'payment_method': payment_method,
            'proposed_price': str(proposed_price),
            'job': TransportJobDetailSerializer(job, context={'show_contact': True, 'request': request}).data,
            'accepted_offer': OfferDetailSerializer(offer).data,
        }

        if escrow:
            from payments.serializers import EscrowDetailSerializer
            response_data['escrow'] = EscrowDetailSerializer(escrow).data

        return Response(response_data, status=status.HTTP_201_CREATED)


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
    Masks email/phone for non-owners (SEC-T2).
    Optimized with annotated query (PERF-T1).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransporterProfileSerializer

    def get(self, request, user_id):
        from trust.models import TrustProfile
        from django.db.models import Avg, Count
        from django.contrib.auth import get_user_model
        from django.core.cache import cache
        from django.conf import settings as conf_settings

        User = get_user_model()
        # Ensure user exists and is a transporter
        user_obj = User.objects.filter(id=user_id, role='TRANSPORTER').first()
        if not user_obj:
            return Response({'error': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        # Auto-create TrustProfile if missing
        trust_profile, _ = TrustProfile.objects.get_or_create(user=user_obj)

        # Cache annotated profile (Phase 2: avoid repeated Avg/Count queries)
        cache_key = f'transporter_profile_{user_id}'
        cached = cache.get(cache_key)
        if cached is None:
            # Re-fetch with annotations
            trust_profile = TrustProfile.objects.select_related(
                'user', 'user__profile'
            ).annotate(
                _avg_rating=Avg('user__reviews_received__rating'),
                _review_count=Count('user__reviews_received', distinct=True),
            ).filter(user_id=user_id).first()
            cache.set(cache_key, trust_profile, getattr(conf_settings, 'CACHE_TTL_PROFILE', 120))
        else:
            trust_profile = cached

        is_owner = request.user.id == trust_profile.user_id
        serializer = TransporterProfileSerializer(
            trust_profile,
            context={'request': request, 'is_owner': is_owner}
        )
        return Response(serializer.data)


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
        trust_profile, _ = TrustProfile.objects.get_or_create(user=request.user)
        serializer = TransporterProfileSerializer(
            trust_profile,
            context={'request': request, 'is_owner': True}
        )
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

        # Update User fields (email excluded — SEC-T1)
        user_fields = ['first_name', 'last_name', 'phone']
        user_changed = False
        for field in user_fields:
            if field in data:
                setattr(user, field, data[field])
                user_changed = True
        if user_changed:
            user.save()

        # Update TrustProfile fields
        from trust.models import TrustProfile
        trust_profile, _ = TrustProfile.objects.get_or_create(user=user)
        profile_fields = ['vehicle_type', 'vehicle_capacity_kg', 'service_areas', 'specializations', 'vehicle_photos']
        for field in profile_fields:
            if field in data:
                setattr(trust_profile, field, data[field])
        trust_profile.save()

        # Update User Profile fields (bio)
        if 'bio' in data:
            try:
                profile = user.profile
                profile.bio = data['bio']
                profile.save(update_fields=['bio'])
            except Exception:
                pass  # Profile might not exist yet

        # Return updated profile
        return Response({
            'message': 'Profil mis à jour avec succès.',
            'profile': TransporterProfileSerializer(
                trust_profile,
                context={'request': request, 'is_owner': True}
            ).data
        })


# =============================================================================
# PRICE ESTIMATION (L5 — Public endpoint)
# =============================================================================

class PriceEstimateView(APIView):
    """
    POST /api/jobs/estimate-price/
    Public endpoint - returns estimated price range based on coordinates and job type.
    No authentication required.
    """
    permission_classes = []  # Public access

    def post(self, request):
        from .pricing import estimate_price

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


# =============================================================================
# CLIENT PROFILE VIEWS
# =============================================================================

class ClientProfileView(generics.RetrieveAPIView):
    """
    GET /api/client/profile/{user_id}/
    Public client profile (read-only).
    Masks email/phone for non-owners.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Q, Avg
        User = get_user_model()
        # Single annotated query — replaces 6 individual queries (BL3)
        user_obj = User.objects.filter(id=user_id, role='CLIENT').select_related('profile').annotate(
            _total_jobs_posted=Count('jobs', distinct=True),
            _completed_jobs=Count('jobs', filter=Q(jobs__status='COMPLETED'), distinct=True),
            _active_jobs=Count('jobs', filter=Q(jobs__status__in=['PUBLISHED', 'MATCHED', 'IN_PROGRESS']), distinct=True),
            _total_offers_received=Count('jobs__offers', distinct=True),
            _avg_rating=Avg('reviews_received__rating'),
            _review_count=Count('reviews_received', distinct=True),
        ).first()
        if not user_obj:
            return Response({'error': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        is_owner = request.user.id == user_obj.id
        serializer = ClientProfileSerializer(
            user_obj,
            context={'request': request, 'is_owner': is_owner}
        )
        return Response(serializer.data)


class ClientProfileEditView(APIView):
    """
    GET  /api/client/profile/me/  — Returns own client profile data.
    PATCH /api/client/profile/me/ — Updates own client profile.
    Only accessible to authenticated clients.
    Email is NOT editable here — requires a separate verified flow.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'CLIENT':
            return Response(
                {'error': 'Réservé aux clients.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = ClientProfileSerializer(
            request.user,
            context={'request': request, 'is_owner': True}
        )
        return Response(serializer.data)

    def patch(self, request):
        if request.user.role != 'CLIENT':
            return Response(
                {'error': 'Réservé aux clients.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate input with dedicated serializer (BL1/SEC3)
        update_serializer = ClientProfileUpdateSerializer(data=request.data)
        if not update_serializer.is_valid():
            return Response(
                {'errors': update_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        validated = update_serializer.validated_data
        user = request.user

        # Update User fields (email excluded — SEC1/BL2)
        user_fields = ['first_name', 'last_name', 'phone']
        user_changed = False
        for field in user_fields:
            if field in validated:
                setattr(user, field, validated[field])
                user_changed = True
        if user_changed:
            user.save()

        # Update Profile fields
        profile_fields = ['bio', 'address_summary']
        try:
            profile = user.profile
        except Exception:
            from users.models import Profile
            profile = Profile.objects.create(user=user)
        for field in profile_fields:
            if field in validated:
                setattr(profile, field, validated[field])
        profile.save()

        # Return updated profile
        return Response({
            'message': 'Profil mis à jour avec succès.',
            'profile': ClientProfileSerializer(
                user,
                context={'request': request, 'is_owner': True}
            ).data
        })


class UserRoleView(APIView):
    """
    GET /api/user/{user_id}/role/
    Lightweight endpoint to determine user role for profile routing (P3).
    Avoids double API calls (transporter 404 → client fallback).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_obj = get_object_or_404(User, id=user_id)
        return Response({
            'id': user_obj.id,
            'role': user_obj.role,
        })


# =============================================================================
# FAVORITES (P2-09)
# =============================================================================

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


# =============================================================================
# CROSS METRICS (P2-01)
# =============================================================================

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


# =============================================================================
# COUNTER-OFFERS (P2-05)
# =============================================================================

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

        # Accept: update offer price
        from payments.services import calculate_commission
        from decimal import Decimal
        new_total = counter.proposed_price
        commission, net = calculate_commission(offer.job.job_type, Decimal(str(new_total)))

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
