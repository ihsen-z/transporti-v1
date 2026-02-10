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
