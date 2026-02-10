"""
Trust Serializers - Transporti V1
Read-only exposure of trust data for API responses.
"""
from rest_framework import serializers
from .models import TrustProfile, TrustVerificationRequest


class TrustStatusSerializer(serializers.ModelSerializer):
    """
    Read-only trust status for transporter profiles.
    Used in profile endpoints and offer listings.
    """
    is_verified = serializers.BooleanField(read_only=True)
    can_accept_jobs = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TrustProfile
        fields = [
            'verification_status', 'trust_score', 'is_verified',
            'can_accept_jobs', 'verified_at'
        ]
        read_only_fields = fields


class TrustProfileDetailSerializer(serializers.ModelSerializer):
    """
    Detailed trust profile for admin views.
    """
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    is_verified = serializers.BooleanField(read_only=True)
    pending_request = serializers.SerializerMethodField()
    
    class Meta:
        model = TrustProfile
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'verification_status', 'trust_score', 'is_verified',
            'verified_at', 'rejection_reason',
            'last_submitted_at', 'pending_request',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_user_name(self, obj) -> str:
        return f"{obj.user.first_name} {obj.user.last_name}"
    
    def get_pending_request(self, obj) -> bool:
        return obj.verification_requests.filter(status='PENDING').exists()


class TrustVerificationRequestSerializer(serializers.ModelSerializer):
    """
    Verification request details.
    """
    transporter_email = serializers.CharField(
        source='trust_profile.user.email', 
        read_only=True
    )
    reviewed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TrustVerificationRequest
        fields = [
            'id', 'trust_profile', 'transporter_email',
            'document_type', 'document_file', 'status',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'review_notes', 'submitted_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_reviewed_by_name(self, obj) -> str:
        if obj.reviewed_by:
            return f"{obj.reviewed_by.first_name} {obj.reviewed_by.last_name}"
        return None


class TransporterTrustBadgeSerializer(serializers.Serializer):
    """
    Minimal trust badge for client-facing offer listings.
    Shows only verification status and score.
    """
    verification_status = serializers.CharField(read_only=True)
    trust_score = serializers.IntegerField(read_only=True)
    is_verified = serializers.BooleanField(read_only=True)
