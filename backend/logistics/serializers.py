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
            'job_type', 'pickup_address', 'pickup_lat', 'pickup_lng',
            'dropoff_address', 'dropoff_lat', 'dropoff_lng',
            'scheduled_time', 'specifications'
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

    class Meta:
        model = TransportJob
        fields = [
            'id', 'job_type', 'status', 
            'pickup_address', 'pickup_lat', 'pickup_lng',
            'dropoff_address', 'dropoff_lat', 'dropoff_lng',
            'scheduled_time', 'specifications', 'owner',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_owner(self, obj) -> dict:
        return {
            'id': obj.owner.id,
            'name': f"{obj.owner.first_name} {obj.owner.last_name}",
            'phone': obj.owner.phone if self.context.get('show_contact') else None
        }


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

        return super().create(validated_data)


class OfferListSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for offer listings.
    Includes transporter trust badge for client-facing visibility.
    """
    transporter_name = serializers.SerializerMethodField()
    transporter_rating = serializers.SerializerMethodField()
    trust_badge = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = [
            'id', 'job', 'status', 'total_price', 'message',
            'transporter_name', 'transporter_rating', 'trust_badge',
            'valid_until', 'created_at'
        ]
        read_only_fields = fields

    def get_transporter_name(self, obj) -> str:
        return f"{obj.transporter.first_name} {obj.transporter.last_name[0]}."

    def get_transporter_rating(self, obj) -> float:
        # Placeholder - will be implemented with reviews module
        return 4.5
    
    def get_trust_badge(self, obj) -> dict:
        """Get trust badge for transporter (read-only exposure)."""
        from logistics.services import get_transporter_trust_badge
        return get_transporter_trust_badge(obj.transporter)


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
    Body is explicitly empty as the ID is in the URL.
    """
    pass


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
    avatar_url = serializers.CharField(source='user.profile.avatar_url', read_only=True)
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
            'first_name', 'last_name', 'avatar_url', 'joined_at',
            'is_verified', 'trust_score', 
            'vehicle_type', 'vehicle_capacity_kg', 'vehicle_photos',
            'service_areas', 'specializations',
            'completion_rate', 'total_jobs_completed',
            'rating', 'review_count'
        ]

    def get_rating(self, obj) -> float:
        # PENDING: Aggregate from Review model
        # For now return placeholder or 0.0
        return 0.0

    def get_review_count(self, obj) -> int:
        return 0

