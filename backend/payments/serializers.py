from rest_framework import serializers
from .models import EscrowTransaction, CommissionLedger


class EscrowReleaseSerializer(serializers.Serializer):
    """
    Admin-only: Manual escrow release.
    """
    reason = serializers.CharField(
        required=True,
        min_length=10,
        help_text="Audit reason for manual release (min 10 characters)"
    )


class CommissionSettleSerializer(serializers.Serializer):
    """
    Admin-only: Mark commission debt as settled.
    """
    reason = serializers.CharField(
        required=True,
        min_length=10,
        help_text="Audit reason for settlement (min 10 characters)"
    )


class ConfirmCompletionSerializer(serializers.Serializer):
    """
    Client: Confirm job completion to trigger escrow release.
    """
    job_id = serializers.IntegerField(required=True)


class EscrowDetailSerializer(serializers.ModelSerializer):
    """
    Read-only escrow details.
    """
    job_id = serializers.IntegerField(source='booking_reference.id', read_only=True)
    
    class Meta:
        model = EscrowTransaction
        fields = [
            'id', 'job_id', 'status', 'amount', 
            'gateway_reference', 'created_at', 'updated_at'
        ]
        read_only_fields = fields


class CommissionLedgerDetailSerializer(serializers.ModelSerializer):
    """
    Read-only commission ledger details.
    """
    transporter_name = serializers.SerializerMethodField()
    job_id = serializers.IntegerField(source='job_reference.id', read_only=True)
    
    class Meta:
        model = CommissionLedger
        fields = [
            'id', 'transporter', 'transporter_name', 'job_id',
            'amount', 'is_settled', 'created_at', 'settled_at'
        ]
        read_only_fields = fields
    
    def get_transporter_name(self, obj) -> str:
        return f"{obj.transporter.first_name} {obj.transporter.last_name}"
