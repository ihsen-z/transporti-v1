from rest_framework import serializers
from django.utils import timezone
from .models import TransportJob, Offer


class TransportJobCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating transport jobs.
    Client-only. Auto-sets owner and status.
    """
    class Meta:
        model = TransportJob
        fields = [
            'job_type', 'pickup_address', 'pickup_governorate', 'pickup_lat', 'pickup_lng',
            'dropoff_address', 'dropoff_governorate', 'dropoff_lat', 'dropoff_lng',
            'scheduled_time', 'specifications', 'description', 'photos',
            'price_tnd_min', 'price_tnd_max',
            'pickup_hint', 'dropoff_hint'
        ]

    def validate_scheduled_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("La date doit être dans le futur.")
        return value

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        validated_data['status'] = TransportJob.Status.PUBLISHED
        # NSM: road distance computed once server-side at creation
        from .pricing import estimate_distance_for_job
        validated_data['distance_km'] = estimate_distance_for_job(
            validated_data.get('pickup_lat'), validated_data.get('pickup_lng'),
            validated_data.get('dropoff_lat'), validated_data.get('dropoff_lng'),
            validated_data.get('pickup_governorate'), validated_data.get('dropoff_governorate'),
        )
        return super().create(validated_data)


class TransportJobListSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for job listings.
    """
    owner_name = serializers.SerializerMethodField()
    offer_count = serializers.SerializerMethodField()

    class Meta:
        model = TransportJob
        fields = [
            'id', 'job_type', 'status', 'pickup_address', 'dropoff_address',
            'pickup_governorate', 'dropoff_governorate',
            'scheduled_time', 'specifications', 'owner_name', 'offer_count',
            'price_tnd_min', 'price_tnd_max',
            'is_return_trip', 'available_capacity', 'instant_booking',
            'distance_km',
            'created_at'
        ]
        read_only_fields = fields

    def get_owner_name(self, obj) -> str:
        return f"{obj.owner.first_name} {obj.owner.last_name[0]}."

    def get_offer_count(self, obj) -> int:
        return obj.offers.filter(status='PENDING').count()


class TransportJobDetailSerializer(serializers.ModelSerializer):
    """
    Detailed view for job owner.
    """
    owner = serializers.SerializerMethodField()
    accepted_transporter = serializers.SerializerMethodField()
    has_reviewed = serializers.SerializerMethodField()
    client_confirmed = serializers.SerializerMethodField()
    commission_rate = serializers.SerializerMethodField()
    my_offer = serializers.SerializerMethodField()
    booking_payment_method = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    my_trip_request = serializers.SerializerMethodField()
    pending_requests_count = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    delivery_pin = serializers.SerializerMethodField()

    class Meta:
        model = TransportJob
        fields = [
            'id', 'job_type', 'status',
            'pickup_address', 'pickup_governorate', 'pickup_lat', 'pickup_lng',
            'dropoff_address', 'dropoff_governorate', 'dropoff_lat', 'dropoff_lng',
            'scheduled_time', 'specifications', 'description', 'photos',
            'price_tnd_min', 'price_tnd_max', 'owner',
            'pickup_hint', 'dropoff_hint',
            'is_return_trip', 'available_capacity', 'instant_booking',
            'distance_km', 'is_expired',
            'accepted_transporter', 'has_reviewed', 'client_confirmed',
            'commission_rate', 'my_offer', 'booking_payment_method',
            'my_trip_request', 'pending_requests_count',
            'events', 'delivery_pin',
            'view_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_events(self, obj) -> list:
        """Sprint 6 (D2') — mission timeline, visible to both parties."""
        return [
            {
                'event': e.event,
                'created_at': e.created_at.isoformat(),
                'pod_photo_url': (e.metadata or {}).get('pod_photo_url', ''),
            }
            for e in obj.events.all()
        ]

    def get_delivery_pin(self, obj) -> str | None:
        """D7 — the POD code is revealed to the PAYING CLIENT only.

        Classic mission: the payer is the job owner. Return trip: the owner is
        the transporter — the payer is the client of the ACCEPTED request.
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        user = request.user
        if obj.is_return_trip:
            is_payer = obj.trip_requests.filter(
                client=user, status='ACCEPTED'
            ).exists()
        else:
            is_payer = user.id == obj.owner_id
        if not is_payer:
            return None
        try:
            return obj.booking.delivery_pin
        except Exception:
            return None

    def get_is_expired(self, obj) -> bool:
        """PUBLISHED job whose pickup date is past (return-trip lifecycle)."""
        from django.utils import timezone
        return bool(
            obj.status == TransportJob.Status.PUBLISHED
            and obj.scheduled_time and obj.scheduled_time < timezone.now()
        )

    def get_my_trip_request(self, obj) -> dict | None:
        """D5 — the current client's latest request on this return trip."""
        request = self.context.get('request')
        if not obj.is_return_trip or not request or not request.user.is_authenticated:
            return None
        if request.user.id == obj.owner_id:
            return None
        req = obj.trip_requests.filter(client=request.user).order_by('-created_at').first()
        if not req:
            return None
        return {
            'id': req.id,
            'status': req.status,
            'proposed_price': float(req.proposed_price),
            'counter_price': float(req.counter_price) if req.counter_price is not None else None,
            'payment_method': req.payment_method,
            'response_message': req.response_message,
            'created_at': req.created_at.isoformat(),
        }

    def get_pending_requests_count(self, obj) -> int:
        """D5 — for the owner's return-trip screen."""
        request = self.context.get('request')
        if not obj.is_return_trip or not request or request.user.id != obj.owner_id:
            return 0
        return obj.trip_requests.filter(status__in=['PENDING']).count()

    def get_booking_payment_method(self, obj) -> str | None:
        """DIGITAL/COD once a Booking exists (D3), null before acceptance."""
        try:
            return obj.booking.payment_method
        except Exception:
            return None

    def get_commission_rate(self, obj) -> float:
        from payments.services import get_commission_rate
        return float(get_commission_rate(obj.job_type, obj.is_return_trip))

    def get_my_offer(self, obj) -> dict | None:
        """Current transporter's offer on this job (any status), null otherwise.

        Lets the frontend replace the offer form with an "your offer" card —
        the backend rejects re-submission whatever the existing offer's status.
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        user = request.user
        if getattr(user, 'role', None) != 'TRANSPORTER' or obj.owner_id == user.id:
            return None
        offer = obj.offers.filter(transporter=user).order_by('-created_at').first()
        if not offer:
            return None
        return {
            'id': offer.id,
            'status': offer.status,
            'price_net': float(offer.price_net),
            'commission_amount': float(offer.commission_amount),
            'total_price': float(offer.total_price),
            'message': offer.message,
            'valid_until': offer.valid_until.isoformat() if offer.valid_until else None,
            'created_at': offer.created_at.isoformat(),
        }

    def get_owner(self, obj) -> dict:
        return {
            'id': obj.owner.id,
            'name': f"{obj.owner.first_name} {obj.owner.last_name}",
            'phone': obj.owner.phone if self.context.get('show_contact') else None
        }

    def get_accepted_transporter(self, obj) -> dict | None:
        """Return accepted transporter info for IN_PROGRESS/COMPLETED jobs."""
        offer = obj.accepted_offer
        if not offer:
            return None
        t = offer.transporter
        return {
            'id': t.id,
            'name': f"{t.first_name} {t.last_name}",
            'phone': t.phone if obj.status in ('IN_PROGRESS', 'COMPLETED') else None,
            'total_price': float(offer.total_price),
        }

    def get_has_reviewed(self, obj) -> bool:
        """Check if current user has already reviewed this job."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        from reviews.models import Review
        return Review.objects.filter(
            job=obj, reviewer=request.user
        ).exists()

    def get_client_confirmed(self, obj) -> bool:
        """Check if the client has confirmed delivery (escrow released)."""
        from payments.models import EscrowTransaction
        return EscrowTransaction.objects.filter(
            booking_reference=obj, status='RELEASED'
        ).exists()


class OfferCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting offers.
    Transporter-only. Validates business rules.

    Net-guaranteed model (decision D1): the transporter submits `price_net`
    (what they receive). Commission and client total are computed server-side.
    """
    MAX_PRICE_NET = 100_000

    price_net = serializers.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        model = Offer
        fields = ['job', 'price_net', 'message', 'valid_until']

    def validate_job(self, value):
        if value.status != TransportJob.Status.PUBLISHED:
            raise serializers.ValidationError("Les offres ne sont possibles que sur les missions publiées.")
        return value

    def validate_price_net(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le tarif doit être supérieur à 0.")
        if value > self.MAX_PRICE_NET:
            raise serializers.ValidationError(f"Le tarif ne peut pas dépasser {self.MAX_PRICE_NET} TND.")
        return value

    def to_internal_value(self, data):
        # Legacy contract guard: the pre-D1 client sent `total_price`.
        # Reject it explicitly (before field validation) so a stale bundle
        # gets an honest error instead of a silently reinterpreted amount.
        if 'total_price' in data:
            raise serializers.ValidationError(
                {"total_price": "Champ obsolète. Envoyez `price_net` (le montant que vous recevez)."}
            )
        return super().to_internal_value(data)

    def validate(self, attrs):
        user = self.context['request'].user
        job = attrs['job']

        # Check existing offer from this transporter
        if Offer.objects.filter(job=job, transporter=user).exists():
            raise serializers.ValidationError({"job": "Vous avez déjà soumis une offre pour cette mission."})

        # Check max active offers (3)
        active_offers = Offer.objects.filter(
            transporter=user,
            status='PENDING'
        ).count()
        if active_offers >= 3:
            raise serializers.ValidationError(
                {"non_field_errors": "Maximum 3 offres en attente. Attendez une réponse ou retirez une offre existante."}
            )

        return attrs

    def create(self, validated_data):
        from payments.services import calculate_from_net

        user = self.context['request'].user
        job = validated_data['job']
        price_net = validated_data['price_net']

        # Net-guaranteed: commission added on top, client pays net + commission
        commission, total_price = calculate_from_net(job.job_type, price_net, job.is_return_trip)

        validated_data['transporter'] = user
        validated_data['status'] = Offer.Status.PENDING
        validated_data['price_net'] = price_net
        validated_data['commission_amount'] = commission
        validated_data['total_price'] = total_price

        offer = super().create(validated_data)

        # Send email notification to job owner
        try:
            from notifications.emails import notify_offer_received
            notify_offer_received(job, offer)
        except Exception:
            pass  # Email failure must never block business logic

        # DB notification (P0 Fix)
        try:
            from notifications.services import notify_offer_received as db_notify_offer
            db_notify_offer(job, offer)
        except Exception:
            pass

        return offer


class OfferListSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for offer listings.
    Includes transporter trust badge for client-facing visibility,
    and job details for the transporter's "Mes Offres" page.
    """
    transporter_name = serializers.SerializerMethodField()
    transporter_id = serializers.IntegerField(source='transporter.id', read_only=True)
    transporter_rating = serializers.SerializerMethodField()
    transporter_verified = serializers.SerializerMethodField()
    transporter_jobs_count = serializers.SerializerMethodField()
    transporter_completion_rate = serializers.SerializerMethodField()
    transporter_moving_specialist = serializers.SerializerMethodField()
    transporter_avatar = serializers.SerializerMethodField()
    transporter_trust_score = serializers.SerializerMethodField()
    trust_badge = serializers.SerializerMethodField()
    has_worked_together = serializers.SerializerMethodField()
    past_jobs_count = serializers.SerializerMethodField()

    # Job details for transporter's offer tracking view
    job_pickup = serializers.CharField(source='job.pickup_address', read_only=True)
    job_dropoff = serializers.CharField(source='job.dropoff_address', read_only=True)
    job_type = serializers.CharField(source='job.job_type', read_only=True)
    job_date = serializers.DateTimeField(source='job.scheduled_time', read_only=True)
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'job', 'status', 'total_price', 'price_net',
            'commission_amount', 'message',
            'job_pickup', 'job_dropoff', 'job_type', 'job_date',
            'client_name',
            'transporter_id', 'transporter_name', 'transporter_rating',
            'transporter_verified', 'transporter_jobs_count',
            'transporter_completion_rate', 'transporter_moving_specialist',
            'transporter_avatar', 'transporter_trust_score',
            'trust_badge',
            'has_worked_together', 'past_jobs_count',
            'valid_until', 'created_at'
        ]
        read_only_fields = fields

    def get_transporter_name(self, obj) -> str:
        return f"{obj.transporter.first_name} {obj.transporter.last_name[0]}."

    def get_transporter_rating(self, obj) -> float:
        from reviews.models import Review
        from django.db.models import Avg
        avg = Review.objects.filter(
            target=obj.transporter
        ).aggregate(avg=Avg('rating'))['avg']
        return round(float(avg), 1) if avg else 0.0

    def get_transporter_verified(self, obj) -> bool:
        return getattr(obj.transporter, 'is_verified', False)

    def get_transporter_jobs_count(self, obj) -> int:
        try:
            return obj.transporter.trust_profile.completed_jobs
        except Exception:
            return 0

    def get_transporter_completion_rate(self, obj):
        try:
            tp = obj.transporter.trust_profile
            total = tp.completed_jobs + tp.cancelled_jobs
            if total > 0:
                return round((tp.completed_jobs / total) * 100)
            return None
        except Exception:
            return None

    def get_transporter_moving_specialist(self, obj) -> bool:
        try:
            specs = obj.transporter.trust_profile.specializations or []
            return 'MOVING' in specs or 'moving' in [s.lower() for s in specs]
        except Exception:
            return False

    def get_transporter_avatar(self, obj):
        try:
            if hasattr(obj.transporter, 'profile') and obj.transporter.profile.avatar:
                return obj.transporter.profile.avatar.url
        except Exception:
            pass
        return None

    def get_transporter_trust_score(self, obj) -> int | None:
        """Dynamic trust score for decision-making (P1-01)."""
        try:
            from trust.transporter_trust import compute_transporter_trust_score
            return compute_transporter_trust_score(obj.transporter)
        except Exception:
            return None

    def get_trust_badge(self, obj) -> dict:
        """Get trust badge for transporter (read-only exposure)."""
        from logistics.services import get_transporter_trust_badge
        return get_transporter_trust_badge(obj.transporter)

    def get_client_name(self, obj) -> str:
        """Job owner's name — visible to transporter for accepted offers."""
        owner = obj.job.owner
        name = f"{owner.first_name} {owner.last_name}".strip()
        return name or owner.email.split('@')[0]

    def get_has_worked_together(self, obj) -> bool:
        """P2-07: Check if transporter has completed jobs for this client before."""
        try:
            client = obj.job.owner
            return Offer.objects.filter(
                transporter=obj.transporter,
                job__owner=client,
                status='ACCEPTED',
                job__status='COMPLETED'
            ).exclude(job=obj.job).exists()
        except Exception:
            return False

    def get_past_jobs_count(self, obj) -> int:
        """P2-07: Number of past completed jobs between this pair."""
        try:
            client = obj.job.owner
            return Offer.objects.filter(
                transporter=obj.transporter,
                job__owner=client,
                status='ACCEPTED',
                job__status='COMPLETED'
            ).exclude(job=obj.job).count()
        except Exception:
            return 0


class OfferDetailSerializer(serializers.ModelSerializer):
    """
    Detailed offer view with transporter info and trust status.
    """
    transporter = serializers.SerializerMethodField()
    job_summary = serializers.SerializerMethodField()
    trust_badge = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'status', 'total_price', 'price_net', 'commission_amount',
            'message', 'valid_until', 'transporter', 'trust_badge',
            'job_summary', 'created_at'
        ]
        read_only_fields = fields

    def get_transporter(self, obj) -> dict:
        return {
            'id': obj.transporter.id,
            'name': f"{obj.transporter.first_name} {obj.transporter.last_name}",
            'phone': obj.transporter.phone if obj.status == 'ACCEPTED' else None
        }
    
    def get_trust_badge(self, obj) -> dict:
        """Get trust badge for transporter (read-only exposure)."""
        from logistics.services import get_transporter_trust_badge
        return get_transporter_trust_badge(obj.transporter)

    def get_job_summary(self, obj) -> dict:
        return {
            'id': obj.job.id,
            'type': obj.job.job_type,
            'pickup': obj.job.pickup_address,
            'dropoff': obj.job.dropoff_address
        }


class OfferAcceptSerializer(serializers.Serializer):
    """
    Serializer to define the contract for accepting an offer.
    payment_method: 'DIGITAL' (escrow) or 'COD' (cash on delivery)
    """
    payment_method = serializers.ChoiceField(
        choices=['DIGITAL', 'COD'],
        default='DIGITAL',
        help_text="DIGITAL = escrow payment, COD = cash on delivery"
    )


class TransportJobUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating DRAFT jobs.
    """
    class Meta:
        model = TransportJob
        fields = [
            'job_type', 'pickup_address', 'pickup_lat', 'pickup_lng',
            'dropoff_address', 'dropoff_lat', 'dropoff_lng',
            'scheduled_time', 'specifications',
            'price_tnd_min', 'price_tnd_max', 'description', 'photos'
        ]

    def validate_scheduled_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("La date doit être dans le futur.")
        return value


class JobActionSerializer(serializers.Serializer):
    """
    Generic serializer for job actions (publish, cancel, complete).
    """
    reason = serializers.CharField(required=False, allow_blank=True)


class OfferWithdrawSerializer(serializers.Serializer):
    """
    Serializer for withdrawing an offer.
    """
    reason = serializers.CharField(required=False, allow_blank=True)


class TransporterProfileSerializer(serializers.ModelSerializer):
    """
    Public profile for transporters (Trust Signals).
    Used by clients to vetting before accepting offers.
    """
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    joined_at = serializers.DateTimeField(source='user.date_joined', read_only=True)
    
    # Trust Profile Fields
    is_verified = serializers.BooleanField(read_only=True)
    trust_score = serializers.SerializerMethodField()
    vehicle_type = serializers.CharField(read_only=True)
    vehicle_capacity_kg = serializers.DecimalField(max_digits=8, decimal_places=1, read_only=True)
    vehicle_photos = serializers.JSONField(read_only=True)
    service_areas = serializers.JSONField(read_only=True)
    specializations = serializers.JSONField(read_only=True)
    # B2 — computed from the canonical stats source (docs/DICTIONNAIRE_KPI.md),
    # no longer read from stale stored TrustProfile fields.
    completion_rate = serializers.SerializerMethodField()
    total_jobs_completed = serializers.SerializerMethodField()
    avg_response_time_min = serializers.IntegerField(source='response_time_avg_minutes', read_only=True)
    insurance_valid_until = serializers.DateField(read_only=True)
    
    # Reviews (Summary) — annotation-aware (PERF-T1)
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    # P2-08: Return trip activity
    return_trips_completed = serializers.SerializerMethodField()
    active_return_trips = serializers.SerializerMethodField()

    class Meta:
        from trust.models import TrustProfile
        model = TrustProfile
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'avatar_url', 'bio', 'joined_at',
            'is_verified', 'trust_score', 
            'vehicle_type', 'vehicle_capacity_kg', 'vehicle_photos',
            'service_areas', 'specializations',
            'completion_rate', 'total_jobs_completed',
            'avg_response_time_min', 'insurance_valid_until',
            'rating', 'review_count',
            'return_trips_completed', 'active_return_trips',
        ]

    def _is_owner(self) -> bool:
        """Check if the requesting user is the profile owner."""
        return self.context.get('is_owner', False)

    def _job_stats(self, obj) -> dict:
        """K6/K7 from the canonical formulas — cached per serialization."""
        if not hasattr(self, '_cached_job_stats'):
            from .models import TransportJob, Offer, JobEvent
            completed = Offer.objects.filter(
                transporter=obj.user, status='ACCEPTED',
                job__status=TransportJob.Status.COMPLETED
            ).count()
            # K7: COMPLETED / (COMPLETED + annulées transporteur) — annulations
            # tracées via JobEvent depuis le Sprint 6 (D4').
            cancelled = JobEvent.objects.filter(
                event='CANCELLED_BY_TRANSPORTER', actor=obj.user
            ).count()
            denom = completed + cancelled
            self._cached_job_stats = {
                'completed': completed,
                'completion_rate': round(completed / denom * 100, 2) if denom else None,
            }
        return self._cached_job_stats

    def get_total_jobs_completed(self, obj) -> int:
        return self._job_stats(obj)['completed']

    def get_completion_rate(self, obj):
        return self._job_stats(obj)['completion_rate']

    def get_email(self, obj) -> str:
        """Full email for owner, masked for others (SEC-T2)."""
        if self._is_owner():
            return obj.user.email
        email = obj.user.email or ''
        if '@' in email:
            local, domain = email.split('@', 1)
            masked_local = local[0] + '***' if local else '***'
            return f"{masked_local}@{domain}"
        return '***'

    def get_phone(self, obj) -> str:
        """Full phone for owner, masked for others (SEC-T2)."""
        if self._is_owner():
            return obj.user.phone or ''
        phone = obj.user.phone or ''
        if len(phone) >= 4:
            return phone[:4] + ' XX XXX ' + phone[-2:]
        return '***' if phone else ''

    def get_bio(self, obj) -> str:
        """Bio from user Profile (UX-T5)."""
        try:
            return obj.user.profile.bio or ''
        except Exception:
            return ''

    def get_avatar_url(self, obj) -> str:
        """Return avatar URL from ImageField or legacy URLField."""
        try:
            profile = obj.user.profile
            if profile.avatar and hasattr(profile.avatar, 'url'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.avatar.url)
                return profile.avatar.url
            if profile.avatar_url:
                return profile.avatar_url
        except Exception:
            pass
        return ''

    def get_rating(self, obj) -> float:
        """Annotation-aware rating (PERF-T1)."""
        if hasattr(obj, '_avg_rating'):
            return round(float(obj._avg_rating), 1) if obj._avg_rating else 0.0
        from reviews.models import Review
        from django.db.models import Avg
        avg = Review.objects.filter(
            target=obj.user
        ).aggregate(avg=Avg('rating'))['avg']
        return round(float(avg), 1) if avg else 0.0
    def get_review_count(self, obj) -> int:
        """Annotation-aware review count (PERF-T1)."""
        if hasattr(obj, '_review_count'):
            return obj._review_count
        from reviews.models import Review
        return Review.objects.filter(target=obj.user).count()

    def get_trust_score(self, obj) -> int:
        """Dynamic trust score (BL-T1)."""
        try:
            from trust.transporter_trust import compute_transporter_trust_score
            result = compute_transporter_trust_score(obj)
            return result['score']
        except Exception:
            return obj.trust_score  # fallback to cached DB field

    def get_return_trips_completed(self, obj) -> int:
        """P2-08: Number of return trips this transporter has completed."""
        try:
            return TransportJob.objects.filter(
                owner=obj.user,
                is_return_trip=True,
                status='COMPLETED'
            ).count()
        except Exception:
            return 0

    def get_active_return_trips(self, obj) -> int:
        """P2-08: Number of currently active return trip offers."""
        try:
            return TransportJob.objects.filter(
                owner=obj.user,
                is_return_trip=True,
                status='PUBLISHED'
            ).count()
        except Exception:
            return 0


class TransporterProfileEditSerializer(serializers.Serializer):
    """
    Serializer for transporters editing their own profile.
    Handles both User fields and TrustProfile fields.
    Email is NOT included — email changes require a separate verified flow (SEC-T1).
    """
    # User fields (email excluded — SEC-T1)
    first_name = serializers.CharField(min_length=2, max_length=150, required=False)
    last_name = serializers.CharField(min_length=2, max_length=150, required=False)
    phone = serializers.RegexField(
        regex=r'^\+?216?\d{8}$',
        max_length=20,
        required=False,
        allow_blank=True,
        error_messages={'invalid': 'Format téléphone invalide. Exemple: +21612345678'}
    )
    bio = serializers.CharField(max_length=500, required=False, allow_blank=True)

    # TrustProfile fields
    vehicle_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    vehicle_capacity_kg = serializers.DecimalField(
        max_digits=8, decimal_places=1, required=False, allow_null=True
    )
    service_areas = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    specializations = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    vehicle_photos = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        allow_empty=True
    )

    VALID_GOVERNORATES = [
        'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
        'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
        'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
        'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
    ]

    def validate_service_areas(self, value):
        invalid = [v for v in value if v not in self.VALID_GOVERNORATES]
        if invalid:
            raise serializers.ValidationError(
                f"Gouvernorats invalides: {', '.join(invalid)}"
            )
        return value

    def validate_vehicle_capacity_kg(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("La capacité doit être positive.")
        return value

# =============================================================================
# TRANSPORTER MISSION SERIALIZERS
# =============================================================================

class TransporterMissionSerializer(serializers.ModelSerializer):
    """
    Serializer for a transporter's assigned missions.
    Shows the job + the transporter's accepted offer details.
    """
    client_name = serializers.SerializerMethodField()
    offer_price = serializers.SerializerMethodField()
    offer_price_net = serializers.SerializerMethodField()
    offer_commission = serializers.SerializerMethodField()

    class Meta:
        model = TransportJob
        fields = [
            'id', 'job_type', 'status',
            'pickup_address', 'pickup_governorate',
            'dropoff_address', 'dropoff_governorate',
            'scheduled_time', 'description',
            'client_name', 'offer_price', 'offer_price_net', 'offer_commission',
            'is_return_trip', 'available_capacity',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_client_name(self, obj) -> str:
        owner = obj.owner
        name = f"{owner.first_name} {owner.last_name}".strip()
        return name or owner.email.split('@')[0]

    def _get_accepted_offer(self, obj):
        """Get the accepted offer cached on the instance."""
        if not hasattr(obj, '_cached_accepted_offer'):
            request = self.context.get('request')
            if request:
                obj._cached_accepted_offer = obj.offers.filter(
                    transporter=request.user, status='ACCEPTED'
                ).first()
            else:
                obj._cached_accepted_offer = obj.accepted_offer
        return obj._cached_accepted_offer

    def get_offer_price(self, obj) -> float:
        offer = self._get_accepted_offer(obj)
        return float(offer.total_price) if offer else 0

    def get_offer_price_net(self, obj) -> float:
        offer = self._get_accepted_offer(obj)
        return float(offer.price_net) if offer else 0

    def get_offer_commission(self, obj) -> float:
        offer = self._get_accepted_offer(obj)
        return float(offer.commission_amount) if offer else 0


class ReturnTripCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for transporters creating return trip availability.
    Similar to TransportJobCreateSerializer but with is_return_trip flag.
    """
    class Meta:
        model = TransportJob
        fields = [
            'job_type', 'pickup_address', 'pickup_governorate', 'pickup_lat', 'pickup_lng',
            'dropoff_address', 'dropoff_governorate', 'dropoff_lat', 'dropoff_lng',
            'scheduled_time', 'specifications', 'description',
            'price_tnd_min', 'price_tnd_max',
            'available_capacity', 'instant_booking',
        ]

    def validate_scheduled_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("La date doit être dans le futur.")
        return value

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        validated_data['status'] = TransportJob.Status.PUBLISHED
        validated_data['is_return_trip'] = True
        from .pricing import estimate_distance_for_job
        validated_data['distance_km'] = estimate_distance_for_job(
            validated_data.get('pickup_lat'), validated_data.get('pickup_lng'),
            validated_data.get('dropoff_lat'), validated_data.get('dropoff_lng'),
            validated_data.get('pickup_governorate'), validated_data.get('dropoff_governorate'),
        )
        return super().create(validated_data)


class ReturnTripUpdateSerializer(serializers.ModelSerializer):
    """
    C9 (audit) / WS-F F2 — owner edits their PUBLISHED return trip.
    """
    class Meta:
        model = TransportJob
        fields = [
            'pickup_address', 'pickup_governorate',
            'dropoff_address', 'dropoff_governorate',
            'scheduled_time', 'description',
            'price_tnd_min', 'price_tnd_max',
            'available_capacity', 'instant_booking',
        ]
        extra_kwargs = {f: {'required': False} for f in fields}

    def validate_scheduled_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("La date doit être dans le futur.")
        return value


class ReturnTripRequestSerializer(serializers.ModelSerializer):
    """D5 — structured request on a return trip (read)."""
    client_name = serializers.SerializerMethodField()
    job_pickup = serializers.CharField(source='job.pickup_address', read_only=True)
    job_dropoff = serializers.CharField(source='job.dropoff_address', read_only=True)
    job_date = serializers.DateTimeField(source='job.scheduled_time', read_only=True)

    class Meta:
        from .models import ReturnTripRequest
        model = ReturnTripRequest
        fields = [
            'id', 'job', 'status', 'description', 'photos',
            'proposed_price', 'payment_method', 'counter_price',
            'response_message', 'client_name',
            'job_pickup', 'job_dropoff', 'job_date',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_client_name(self, obj) -> str:
        return f"{obj.client.first_name} {obj.client.last_name[:1]}.".strip()


class ReturnTripRequestCreateSerializer(serializers.ModelSerializer):
    """D5 — client sends a structured request on a published return trip."""
    class Meta:
        from .models import ReturnTripRequest
        model = ReturnTripRequest
        fields = ['description', 'photos', 'proposed_price', 'payment_method']

    def validate_proposed_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Le prix proposé doit être supérieur à 0.")
        if value > 100_000:
            raise serializers.ValidationError("Le prix proposé ne peut pas dépasser 100 000 TND.")
        return value

    def validate(self, attrs):
        COD_MAX = 300
        if attrs.get('payment_method') == 'COD' and attrs['proposed_price'] > COD_MAX:
            raise serializers.ValidationError(
                {'payment_method': f'Paiement à la livraison limité à {COD_MAX} TND. Choisissez le paiement digital.'}
            )
        return attrs


class ClientProfileUpdateSerializer(serializers.Serializer):
    """
    Validation serializer for PATCH /api/client/profile/me/.
    Email is NOT included — email changes require a separate verified flow.
    """
    first_name = serializers.CharField(min_length=2, max_length=50, required=False)
    last_name = serializers.CharField(min_length=2, max_length=50, required=False)
    phone = serializers.RegexField(
        regex=r'^\+?216?\d{8}$',
        max_length=20,
        required=False,
        allow_blank=True,
        error_messages={'invalid': 'Format téléphone invalide. Exemple: +21612345678'}
    )
    bio = serializers.CharField(max_length=500, required=False, allow_blank=True)
    address_summary = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ClientProfileSerializer(serializers.Serializer):
    """
    Public profile for clients.
    Returns user info + activity stats.
    Masks email/phone for non-owners (privacy protection).
    """
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    joined_at = serializers.DateTimeField(source='date_joined')
    role = serializers.CharField()
    bio = serializers.SerializerMethodField()
    address_summary = serializers.SerializerMethodField()

    # Computed stats
    total_jobs_posted = serializers.SerializerMethodField()
    completed_jobs = serializers.SerializerMethodField()
    active_jobs = serializers.SerializerMethodField()
    total_offers_received = serializers.SerializerMethodField()

    # Reviews
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    # Trust Score (visible by both client and transporters — BL5)
    client_trust_score = serializers.SerializerMethodField()

    def _is_owner(self) -> bool:
        """Check if the requesting user is the profile owner."""
        return self.context.get('is_owner', False)

    def get_email(self, obj) -> str:
        """Full email for owner, masked for others."""
        if self._is_owner():
            return obj.email
        email = obj.email or ''
        if '@' in email:
            local, domain = email.split('@', 1)
            masked_local = local[0] + '***' if local else '***'
            return f"{masked_local}@{domain}"
        return '***'

    def get_phone(self, obj) -> str:
        """Full phone for owner, masked for others."""
        if self._is_owner():
            return obj.phone or ''
        phone = obj.phone or ''
        if len(phone) >= 4:
            return phone[:4] + ' XX XXX ' + phone[-2:]
        return '***' if phone else ''

    def get_avatar_url(self, obj) -> str:
        try:
            profile = obj.profile
            if profile.avatar and hasattr(profile.avatar, 'url'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.avatar.url)
                return profile.avatar.url
            if profile.avatar_url:
                return profile.avatar_url
        except Exception:
            pass
        return ''

    def get_bio(self, obj) -> str:
        try:
            return obj.profile.bio or ''
        except Exception:
            return ''

    def get_address_summary(self, obj) -> str:
        try:
            return obj.profile.address_summary or ''
        except Exception:
            return ''

    def get_total_jobs_posted(self, obj) -> int:
        # Use pre-computed annotation if available (from view queryset)
        if hasattr(obj, '_total_jobs_posted'):
            return obj._total_jobs_posted
        return TransportJob.objects.filter(owner=obj).count()

    def get_completed_jobs(self, obj) -> int:
        if hasattr(obj, '_completed_jobs'):
            return obj._completed_jobs
        return TransportJob.objects.filter(
            owner=obj, status='COMPLETED'
        ).count()

    def get_active_jobs(self, obj) -> int:
        if hasattr(obj, '_active_jobs'):
            return obj._active_jobs
        return TransportJob.objects.filter(
            owner=obj, status__in=['PUBLISHED', 'MATCHED', 'IN_PROGRESS']
        ).count()

    def get_total_offers_received(self, obj) -> int:
        if hasattr(obj, '_total_offers_received'):
            return obj._total_offers_received
        from logistics.models import Offer
        return Offer.objects.filter(job__owner=obj).count()

    def get_rating(self, obj) -> float:
        if hasattr(obj, '_avg_rating'):
            return round(float(obj._avg_rating), 1) if obj._avg_rating else 0.0
        from reviews.models import Review
        from django.db.models import Avg
        avg = Review.objects.filter(
            target=obj
        ).aggregate(avg=Avg('rating'))['avg']
        return round(float(avg), 1) if avg else 0.0

    def get_review_count(self, obj) -> int:
        if hasattr(obj, '_review_count'):
            return obj._review_count
        from reviews.models import Review
        return Review.objects.filter(target=obj).count()

    def get_client_trust_score(self, obj) -> dict:
        """Compute client trust score (visible by both owner and visitors)."""
        from trust.client_trust import compute_client_trust_score
        return compute_client_trust_score(obj)
