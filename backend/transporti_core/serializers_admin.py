"""
Admin Serializers — Transporti V1
Sprint 2: Dedicated serializers for admin panel endpoints.
"""
from django.db.models import Sum
from rest_framework import serializers
from logistics.models import TransportJob, Offer
from users.models import User


class AdminJobSerializer(serializers.ModelSerializer):
    """
    Admin view of jobs with client/transporter details.
    Maps to frontend AdminJob interface.
    
    Performance: Uses a cached _accepted_offer to avoid N+1 queries.
    Price: Returns accepted offer price > client budget > 0.
    """
    clientName = serializers.SerializerMethodField()
    clientEmail = serializers.SerializerMethodField()
    transporterName = serializers.SerializerMethodField()
    transporterEmail = serializers.SerializerMethodField()
    cityFrom = serializers.CharField(source='pickup_governorate', default='')
    cityTo = serializers.CharField(source='dropoff_governorate', default='')
    title = serializers.SerializerMethodField()
    pickup = serializers.CharField(source='pickup_address')
    delivery = serializers.CharField(source='dropoff_address')
    price = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    transporter = serializers.SerializerMethodField()
    offersCount = serializers.SerializerMethodField()

    class Meta:
        model = TransportJob
        fields = [
            'id', 'title', 'status', 'pickup', 'delivery', 'price',
            'commission',
            'transporter', 'created_at',
            'clientName', 'clientEmail',
            'transporterName', 'transporterEmail',
            'cityFrom', 'cityTo', 'job_type',
            'offersCount',
        ]
        read_only_fields = fields

    def _get_accepted_offer(self, obj):
        """Cache accepted offer per instance to eliminate N+1."""
        if not hasattr(obj, '_cached_accepted_offer'):
            # If prefetched, use it; otherwise query
            if hasattr(obj, '_prefetched_objects_cache') and 'offers' in obj._prefetched_objects_cache:
                obj._cached_accepted_offer = next(
                    (o for o in obj.offers.all() if o.status == 'ACCEPTED'), None
                )
            else:
                obj._cached_accepted_offer = Offer.objects.filter(
                    job=obj, status='ACCEPTED'
                ).select_related('transporter').first()
        return obj._cached_accepted_offer

    def get_title(self, obj) -> str:
        desc = obj.description or ''
        if desc:
            return desc[:60] + ('...' if len(desc) > 60 else '')
        return f"{obj.get_job_type_display()} #{obj.id}"

    def get_clientName(self, obj) -> str:
        return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.email

    def get_clientEmail(self, obj) -> str:
        return obj.owner.email

    def get_price(self, obj):
        """Return accepted offer price (real transaction value) > client budget > 0."""
        accepted = self._get_accepted_offer(obj)
        if accepted and accepted.total_price:
            return float(accepted.total_price)
        if obj.price_tnd_max:
            return float(obj.price_tnd_max)
        if obj.price_tnd_min:
            return float(obj.price_tnd_min)
        return 0

    def get_commission(self, obj):
        """Real commission of the accepted offer (D2 — no fictitious rate)."""
        accepted = self._get_accepted_offer(obj)
        if accepted and accepted.commission_amount:
            return float(accepted.commission_amount)
        return 0

    def get_transporter(self, obj) -> str:
        accepted = self._get_accepted_offer(obj)
        if accepted:
            t = accepted.transporter
            return f"{t.first_name} {t.last_name}".strip() or t.email
        return ''

    def get_transporterName(self, obj) -> str:
        accepted = self._get_accepted_offer(obj)
        if accepted:
            t = accepted.transporter
            return f"{t.first_name} {t.last_name}".strip() or t.email
        return ''

    def get_transporterEmail(self, obj) -> str:
        accepted = self._get_accepted_offer(obj)
        if accepted:
            return accepted.transporter.email
        return ''

    def get_offersCount(self, obj) -> int:
        """Count of all offers (prefetched or query)."""
        if hasattr(obj, '_prefetched_objects_cache') and 'offers' in obj._prefetched_objects_cache:
            return len(obj.offers.all())
        return obj.offers.count()


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Admin view of users with trust info.
    Maps to frontend AdminUser interface.
    """
    name = serializers.SerializerMethodField()
    trustScore = serializers.SerializerMethodField()
    trustLevel = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    jobsCompleted = serializers.SerializerMethodField()
    jobsActive = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='date_joined')
    lastSeenAt = serializers.DateTimeField(source='last_seen_at')
    totalSpent = serializers.SerializerMethodField()
    totalEarned = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'role', 'status',
            'trustScore', 'trustLevel',
            'jobsCompleted', 'jobsActive',
            'createdAt', 'lastSeenAt',
            'totalSpent', 'totalEarned',
        ]
        read_only_fields = fields

    def get_name(self, obj) -> str:
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email.split('@')[0]

    def get_status(self, obj) -> str:
        if not obj.is_active:
            return 'SUSPENDED'
        try:
            trust = obj.trust_profile
            if trust.verification_status == 'PENDING':
                return 'PENDING_VERIFICATION'
        except Exception:
            pass
        return 'ACTIVE'

    def get_trustScore(self, obj):
        try:
            return obj.trust_profile.trust_score
        except Exception:
            return 50

    def get_trustLevel(self, obj) -> str:
        try:
            v_status = obj.trust_profile.verification_status
            if v_status == 'VERIFIED':
                return 'VERIFIED'
            elif v_status == 'BLOCKED':
                return 'BLOCKED'
            score = obj.trust_profile.trust_score
            if score >= 70:
                return 'TRUSTED'
            return 'NEW'
        except Exception:
            return 'NEW'

    def get_jobsCompleted(self, obj) -> int:
        """Read from queryset annotation to avoid N+1 queries."""
        if hasattr(obj, '_jobs_completed_count'):
            return obj._jobs_completed_count
        # Fallback for single-object serialization (e.g., detail view)
        if obj.role == 'CLIENT':
            return TransportJob.objects.filter(owner=obj, status='COMPLETED').count()
        elif obj.role == 'TRANSPORTER':
            return Offer.objects.filter(
                transporter=obj,
                status='ACCEPTED',
                job__status='COMPLETED'
            ).count()
        return 0

    def get_jobsActive(self, obj) -> int:
        """Read from queryset annotation to avoid N+1 queries."""
        if hasattr(obj, '_jobs_active_count'):
            return obj._jobs_active_count
        # Fallback for single-object serialization (e.g., detail view)
        active_statuses = ['PUBLISHED', 'MATCHED', 'IN_PROGRESS']
        if obj.role == 'CLIENT':
            return TransportJob.objects.filter(owner=obj, status__in=active_statuses).count()
        elif obj.role == 'TRANSPORTER':
            return Offer.objects.filter(
                transporter=obj,
                status='ACCEPTED',
                job__status__in=active_statuses
            ).count()
        return 0

    def get_totalSpent(self, obj):
        if obj.role != 'CLIENT':
            return None
        from payments.models import EscrowTransaction
        total = EscrowTransaction.objects.filter(
            booking_reference__owner=obj,
            status='RELEASED'
        ).aggregate(total=Sum('amount'))['total']
        return float(total) if total else 0

    def get_totalEarned(self, obj):
        if obj.role != 'TRANSPORTER':
            return None
        from payments.models import EscrowTransaction
        # Get job IDs where this transporter has an accepted offer
        accepted_job_ids = Offer.objects.filter(
            transporter=obj,
            status='ACCEPTED'
        ).values_list('job_id', flat=True)
        # Sum only the released escrows for those specific jobs
        total = EscrowTransaction.objects.filter(
            booking_reference_id__in=accepted_job_ids,
            status='RELEASED'
        ).aggregate(total=Sum('amount'))['total']
        return float(total) if total else 0

