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
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        validated_data['status'] = TransportJob.Status.PUBLISHED
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
            'scheduled_time', 'specifications', 'owner_name', 'offer_count',
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

    class Meta:
        model = TransportJob
        fields = [
            'id', 'job_type', 'status', 
            'pickup_address', 'pickup_governorate', 'pickup_lat', 'pickup_lng',
            'dropoff_address', 'dropoff_governorate', 'dropoff_lat', 'dropoff_lng',
            'scheduled_time', 'specifications', 'description', 'photos',
            'price_tnd_min', 'price_tnd_max', 'owner',
            'pickup_hint', 'dropoff_hint',
            'accepted_transporter', 'has_reviewed', 'client_confirmed',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

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
    """
    class Meta:
        model = Offer
        fields = ['job', 'total_price', 'message', 'valid_until']

    def validate_job(self, value):
        if value.status != TransportJob.Status.PUBLISHED:
            raise serializers.ValidationError("Can only submit offers to PUBLISHED jobs.")
        return value

    def validate_total_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be positive.")
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        job = attrs['job']

        # Check existing offer from this transporter
        if Offer.objects.filter(job=job, transporter=user).exists():
            raise serializers.ValidationError({"job": "You already submitted an offer for this job."})

        # Check max active offers (3)
        active_offers = Offer.objects.filter(
            transporter=user, 
            status='PENDING'
        ).count()
        if active_offers >= 3:
            raise serializers.ValidationError(
                {"non_field_errors": "Maximum 3 active offers allowed. Wait for responses or withdraw existing offers."}
            )

        return attrs

    def create(self, validated_data):
        from payments.services import calculate_commission
        
        user = self.context['request'].user
        job = validated_data['job']
        total_price = validated_data['total_price']
        
        # Use centralized commission calculation (single source of truth)
        commission, price_net = calculate_commission(job.job_type, total_price)

        validated_data['transporter'] = user
        validated_data['status'] = Offer.Status.PENDING
        validated_data['price_net'] = price_net
        validated_data['commission_amount'] = commission

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
    transporter_rating = serializers.SerializerMethodField()
    trust_badge = serializers.SerializerMethodField()

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
            'transporter_name', 'transporter_rating', 'trust_badge',
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
    
    def get_trust_badge(self, obj) -> dict:
        """Get trust badge for transporter (read-only exposure)."""
        from logistics.services import get_transporter_trust_badge
        return get_transporter_trust_badge(obj.transporter)

    def get_client_name(self, obj) -> str:
        """Job owner's name — visible to transporter for accepted offers."""
        owner = obj.job.owner
        name = f"{owner.first_name} {owner.last_name}".strip()
        return name or owner.email.split('@')[0]


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
            raise serializers.ValidationError("Scheduled time must be in the future.")
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
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    joined_at = serializers.DateTimeField(source='user.date_joined', read_only=True)
    
    # Trust Profile Fields
    is_verified = serializers.BooleanField(read_only=True)
    trust_score = serializers.IntegerField(read_only=True)
    vehicle_type = serializers.CharField(read_only=True)
    vehicle_capacity_kg = serializers.DecimalField(max_digits=8, decimal_places=1, read_only=True)
    vehicle_photos = serializers.JSONField(read_only=True)
    service_areas = serializers.JSONField(read_only=True)
    specializations = serializers.JSONField(read_only=True)
    completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    total_jobs_completed = serializers.IntegerField(read_only=True)
    
    # Reviews (Summary)
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        from trust.models import TrustProfile
        model = TrustProfile
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'avatar_url', 'joined_at',
            'is_verified', 'trust_score', 
            'vehicle_type', 'vehicle_capacity_kg', 'vehicle_photos',
            'service_areas', 'specializations',
            'completion_rate', 'total_jobs_completed',
            'rating', 'review_count'
        ]

    def get_avatar_url(self, obj) -> str:
        """Return avatar URL from ImageField or legacy URLField."""
        try:
            profile = obj.user.profile
            # Prefer the ImageField (actual uploaded file)
            if profile.avatar and hasattr(profile.avatar, 'url'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.avatar.url)
                return profile.avatar.url
            # Fallback to legacy URLField
            if profile.avatar_url:
                return profile.avatar_url
        except Exception:
            pass
        return ''

    def get_rating(self, obj) -> float:
        from reviews.models import Review
        from django.db.models import Avg
        avg = Review.objects.filter(
            target=obj.user
        ).aggregate(avg=Avg('rating'))['avg']
        return round(float(avg), 1) if avg else 0.0

    def get_review_count(self, obj) -> int:
        from reviews.models import Review
        return Review.objects.filter(target=obj.user).count()


class TransporterProfileEditSerializer(serializers.Serializer):
    """
    Serializer for transporters editing their own profile.
    Handles both User fields and TrustProfile fields.
    """
    # User fields
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(max_length=254, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

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
            'available_capacity',
        ]

    def validate_scheduled_time(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future.")
        return value

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        validated_data['status'] = TransportJob.Status.PUBLISHED
        validated_data['is_return_trip'] = True
        return super().create(validated_data)
