from rest_framework import serializers
from .models import Review, ReviewRole, ReviewAbuseLog
from logistics.models import TransportJob
from django.contrib.auth import get_user_model

User = get_user_model()

class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a review.
    """
    job_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Review
        fields = ['job_id', 'rating', 'comment', 'aspects']
        
    def validate(self, attrs):
        user = self.context['request'].user
        job_id = attrs.get('job_id')
        
        try:
            job = TransportJob.objects.get(id=job_id)
        except TransportJob.DoesNotExist:
            raise serializers.ValidationError({"job_id": "Job not found."})
            
        # Validate job status
        if job.status != TransportJob.Status.COMPLETED:
            raise serializers.ValidationError({"job_id": "Job must be COMPLETED to leave a review."})
            
        # Determine role and validate participation
        if job.owner == user:
            role = ReviewRole.CLIENT
            target = job.accepted_offer.transporter
        elif hasattr(job, 'accepted_offer') and job.accepted_offer.transporter == user:
            role = ReviewRole.TRANSPORTER
            target = job.owner
        else:
            raise serializers.ValidationError({"non_field_errors": "You are not a participant in this job."})
            
        # Check if review already exists
        if Review.objects.filter(job=job, role=role).exists():
            raise serializers.ValidationError({"non_field_errors": "You have already reviewed this job."})
            
        attrs['job'] = job
        attrs['role'] = role
        attrs['reviewer'] = user
        attrs['target'] = target
        
        return attrs
        
    def create(self, validated_data):
        job_id = validated_data.pop('job_id') # remove from data as we have 'job' object
        return Review.objects.create(**validated_data)


class ReviewListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing reviews with double-blind protection.
    
    DOUBLE-BLIND LOGIC (Blueprint §2.5):
    Reviews are hidden from the other party until BOTH sides have reviewed,
    OR until a 7-day reveal window expires (whichever comes first).
    This prevents retaliatory ratings/comments.
    
    - Public viewers (no auth / not a participant): see all revealed reviews
    - Participants on a job: see their own review immediately, but the
      counterpart's review is masked until both reviews exist or 7 days pass.
    """
    reviewer_name = serializers.CharField(source='reviewer.first_name', read_only=True)
    reviewer_avatar = serializers.SerializerMethodField()
    is_revealed = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'rating', 'comment', 'aspects',
            'reviewer_name', 'reviewer_avatar',
            'is_revealed', 'created_at',
        ]

    # Number of days after which a review is auto-revealed regardless
    REVEAL_WINDOW_DAYS = 7

    def get_reviewer_avatar(self, obj):
        if hasattr(obj.reviewer, 'profile') and obj.reviewer.profile.avatar_url:
            return obj.reviewer.profile.avatar_url
        return None

    def get_is_revealed(self, obj):
        """
        A review is revealed if:
          1. The viewer IS the reviewer (you always see your own review), OR
          2. Both parties have submitted reviews for this job, OR
          3. The review is older than REVEAL_WINDOW_DAYS days.
        """
        from datetime import timedelta
        from django.utils import timezone

        # Check if reveal window has passed
        if obj.created_at and (timezone.now() - obj.created_at).days >= self.REVEAL_WINDOW_DAYS:
            return True

        # Check if both reviews exist for this job
        both_exist = Review.objects.filter(job_id=obj.job_id).count() >= 2
        if both_exist:
            return True

        # If the request user IS the reviewer, always reveal
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if request.user.id == obj.reviewer_id:
                return True

        return False

    def to_representation(self, instance):
        """
        Mask rating and comment for unrevealed reviews.
        """
        data = super().to_representation(instance)
        if not data.get('is_revealed', True):
            data['rating'] = None
            data['comment'] = '[Avis masqué — en attente de l\'avis de l\'autre partie]'
            data['aspects'] = {}
        return data


# =============================================================================
# Admin Review Serializers
# =============================================================================

class AdminReviewAbuseLogSerializer(serializers.ModelSerializer):
    """Nested serializer for abuse detection logs."""
    at = serializers.DateTimeField(source='created_at')

    class Meta:
        model = ReviewAbuseLog
        fields = ['detector', 'reason', 'severity', 'at']


class AdminReviewSerializer(serializers.ModelSerializer):
    """
    Admin-facing serializer for the Reviews moderation page.
    Maps to the frontend FlaggedReview interface.
    """
    reviewerName = serializers.SerializerMethodField()
    reviewerEmail = serializers.SerializerMethodField()
    targetName = serializers.SerializerMethodField()
    role = serializers.CharField()
    jobId = serializers.IntegerField(source='job_id')
    flagReason = serializers.CharField(source='flag_reason', default='')
    isHidden = serializers.BooleanField(source='is_flagged')
    createdAt = serializers.DateTimeField(source='created_at')
    abuseLogs = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'jobId', 'reviewerName', 'reviewerEmail',
            'targetName', 'role', 'rating', 'comment',
            'flagReason', 'isHidden', 'createdAt', 'abuseLogs',
        ]
        read_only_fields = fields

    def get_reviewerName(self, obj) -> str:
        name = f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip()
        return name or obj.reviewer.email

    def get_reviewerEmail(self, obj) -> str:
        return obj.reviewer.email

    def get_targetName(self, obj) -> str:
        name = f"{obj.target.first_name} {obj.target.last_name}".strip()
        return name or obj.target.email

    def get_abuseLogs(self, obj):
        logs = obj.abuse_logs.all()
        return AdminReviewAbuseLogSerializer(logs, many=True).data
