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
    Read-only escrow details with client/transporter names.
    """
    job_id = serializers.IntegerField(source='booking_reference.id', read_only=True)
    client_name = serializers.SerializerMethodField()
    transporter_name = serializers.SerializerMethodField()
    
    class Meta:
        model = EscrowTransaction
        fields = [
            'id', 'job_id', 'status', 'amount', 
            'gateway_reference', 'created_at', 'updated_at',
            'client_name', 'transporter_name',
        ]
        read_only_fields = fields

    def get_client_name(self, obj) -> str:
        try:
            owner = obj.booking_reference.owner
            name = f"{owner.first_name} {owner.last_name}".strip()
            return name or owner.email
        except Exception:
            return '-'

    def get_transporter_name(self, obj) -> str:
        try:
            from logistics.models import Offer
            accepted = Offer.objects.filter(
                job=obj.booking_reference,
                status='ACCEPTED'
            ).select_related('transporter').first()
            if accepted:
                t = accepted.transporter
                name = f"{t.first_name} {t.last_name}".strip()
                return name or t.email
            return '-'
        except Exception:
            return '-'


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
