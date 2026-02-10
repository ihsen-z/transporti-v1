"""
Dispute Serializers - Transporti V1
Explicit serializers per action for clean API contracts.
"""
from rest_framework import serializers
from .models import Dispute


class DisputeCreateSerializer(serializers.Serializer):
    """
    Client/Transporter: Create a new dispute.
    """
    job_id = serializers.IntegerField(required=True)
    reason = serializers.ChoiceField(choices=Dispute.Reason.choices, required=True)
    description = serializers.CharField(min_length=20, max_length=2000, required=True)


class DisputeListSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for dispute listings.
    """
    opened_by_name = serializers.SerializerMethodField()
    job_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Dispute
        fields = [
            'id', 'job', 'reason', 'status', 'description',
            'opened_by', 'opened_by_name', 'job_summary',
            'created_at', 'resolved_at'
        ]
        read_only_fields = fields
    
    def get_opened_by_name(self, obj) -> str:
        return f"{obj.opened_by.first_name} {obj.opened_by.last_name[0]}."
    
    def get_job_summary(self, obj) -> dict:
        return {
            'id': obj.job.id,
            'type': obj.job.job_type,
            'status': obj.job.status,
        }


class DisputeDetailSerializer(serializers.ModelSerializer):
    """
    Detailed view with resolution info.
    """
    opened_by_name = serializers.SerializerMethodField()
    resolved_by_name = serializers.SerializerMethodField()
    job_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Dispute
        fields = [
            'id', 'job', 'reason', 'status', 'description',
            'opened_by', 'opened_by_name',
            'resolved_by', 'resolved_by_name',
            'resolution_notes', 'job_summary',
            'created_at', 'updated_at', 'resolved_at'
        ]
        read_only_fields = fields
    
    def get_opened_by_name(self, obj) -> str:
        return f"{obj.opened_by.first_name} {obj.opened_by.last_name}"
    
    def get_resolved_by_name(self, obj) -> str:
        if obj.resolved_by:
            return f"{obj.resolved_by.first_name} {obj.resolved_by.last_name}"
        return None
    
    def get_job_summary(self, obj) -> dict:
        return {
            'id': obj.job.id,
            'type': obj.job.job_type,
            'status': obj.job.status,
            'pickup': obj.job.pickup_address,
            'dropoff': obj.job.dropoff_address,
        }


class DisputeActionSerializer(serializers.Serializer):
    """
    Moderator: Action on dispute (investigate/resolve/reject).
    """
    resolution_notes = serializers.CharField(
        min_length=10, 
        max_length=2000, 
        required=False,
        help_text="Required for resolve/reject actions"
    )
