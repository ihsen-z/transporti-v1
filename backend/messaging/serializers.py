"""
Messaging Serializers - Transporti V1
"""
from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    """Read-only message serializer."""
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_name', 'content',
            'is_system', 'is_read', 'created_at'
        ]
        read_only_fields = fields

    def get_sender_name(self, obj) -> str:
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name[0]}."
        return "System"


class MessageCreateSerializer(serializers.Serializer):
    """Create a new message."""
    content = serializers.CharField(min_length=1, max_length=2000, required=True)
    is_system = serializers.BooleanField(default=False, required=False)


class ConversationSerializer(serializers.ModelSerializer):
    """Conversation with latest messages."""
    last_message = MessageSerializer(read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'job', 'is_locked', 'created_at', 'updated_at',
            'last_message', 'message_count', 'participant_count'
        ]
        read_only_fields = fields

    def get_participant_count(self, obj) -> int:
        return obj.participants.count()


class ConversationListSerializer(serializers.ModelSerializer):
    """
    Conversation serializer for the inbox listing.
    Includes job details and the other party's name.
    """
    last_message = MessageSerializer(read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    unread_count = serializers.SerializerMethodField()
    job_title = serializers.SerializerMethodField()
    job_status = serializers.SerializerMethodField()
    other_party_name = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'job', 'is_locked', 'created_at', 'updated_at',
            'last_message', 'message_count', 'unread_count',
            'job_title', 'job_status', 'other_party_name',
        ]
        read_only_fields = fields

    def get_unread_count(self, obj) -> int:
        request = self.context.get('request')
        if not request or not request.user:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_job_title(self, obj) -> str:
        job = obj.job
        return f"{job.pickup_address} → {job.dropoff_address}"

    def get_job_status(self, obj) -> str:
        return obj.job.status

    def get_other_party_name(self, obj) -> str:
        request = self.context.get('request')
        if not request or not request.user:
            return "En attente..."
        for p in obj.participants.all():
            if p.id != request.user.id:
                return f"{p.first_name} {p.last_name[0]}." if p.last_name else p.first_name or p.email
        return "En attente de transporteur"
