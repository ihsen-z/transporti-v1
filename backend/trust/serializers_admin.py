"""
Trust Admin Serializers - Transporti V1
Admin-only serializers for trust moderation.
"""
from rest_framework import serializers
from .models import TrustProfile, TrustActionLog, TrustVerificationRequest


class TrustProfileAdminSerializer(serializers.ModelSerializer):
    """Admin view of trust profile."""
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    is_verified = serializers.BooleanField(read_only=True)
    can_accept_jobs = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TrustProfile
        fields = [
            'id', 'user_id', 'user_email', 'user_name', 'user_phone',
            'verification_status', 'trust_score', 'is_verified', 'can_accept_jobs',
            'verified_at', 'rejection_reason', 'last_submitted_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields
    
    def get_user_name(self, obj) -> str:
        return f"{obj.user.first_name} {obj.user.last_name}"


class TrustActionLogSerializer(serializers.ModelSerializer):
    """Audit log entry serializer."""
    class Meta:
        model = TrustActionLog
        fields = [
            'id', 'admin_email', 'user_email', 'action',
            'previous_status', 'new_status', 'reason',
            'ip_address', 'created_at'
        ]
        read_only_fields = fields


class TrustVerificationRequestAdminSerializer(serializers.ModelSerializer):
    """Admin view of verification request."""
    transporter_email = serializers.EmailField(
        source='trust_profile.user.email', read_only=True
    )
    
    class Meta:
        model = TrustVerificationRequest
        fields = [
            'id', 'transporter_email', 'document_type', 'document_file',
            'status', 'reviewed_by', 'reviewed_at', 'review_notes',
            'submitted_at'
        ]
        read_only_fields = fields


class TrustProfileDetailAdminSerializer(serializers.Serializer):
    """Comprehensive trust detail for admin view."""
    profile = TrustProfileAdminSerializer(read_only=True)
    pending_request = TrustVerificationRequestAdminSerializer(
        read_only=True, allow_null=True
    )
    history = TrustActionLogSerializer(many=True, read_only=True)


class TrustActionSerializer(serializers.Serializer):
    """Input serializer for admin trust actions."""
    reason = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class TrustRestoreSerializer(serializers.Serializer):
    """Input serializer for restore action."""
    reason = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    restore_to = serializers.ChoiceField(
        choices=['VERIFIED', 'UNVERIFIED'],
        default='VERIFIED'
    )


# =============================================================================
# TRUST POLICY SERIALIZERS
# =============================================================================

class TrustPolicySerializer(serializers.ModelSerializer):
    """Full TrustPolicy serializer for admin."""
    class Meta:
        from .models import TrustPolicy
        model = TrustPolicy
        fields = [
            'id', 'name', 'min_score_escrow', 'min_score_cod', 
            'min_score_visibility', 'applies_to', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_active', 'created_at', 'updated_at']


class TrustPolicyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating TrustPolicy."""
    class Meta:
        from .models import TrustPolicy
        model = TrustPolicy
        fields = [
            'name', 'min_score_escrow', 'min_score_cod', 
            'min_score_visibility', 'applies_to'
        ]
    
    def validate_name(self, value):
        from .models import TrustPolicy
        if TrustPolicy.objects.filter(name=value).exists():
            raise serializers.ValidationError("Policy with this name already exists.")
        return value


class TrustPolicyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating TrustPolicy (PATCH)."""
    class Meta:
        from .models import TrustPolicy
        model = TrustPolicy
        fields = [
            'name', 'min_score_escrow', 'min_score_cod', 
            'min_score_visibility'
        ]
        extra_kwargs = {
            'name': {'required': False},
            'min_score_escrow': {'required': False},
            'min_score_cod': {'required': False},
            'min_score_visibility': {'required': False},
        }
