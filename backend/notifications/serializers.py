"""
Notifications Serializers - Transporti V1
"""
from rest_framework import serializers
from .models import Notification, NotificationType, NotificationCategory


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for user notifications."""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'category',
            'category_display',
            'type',
            'type_display',
            'title',
            'message',
            'is_read',
            'metadata',
            'created_at',
            'read_at',
        ]
        read_only_fields = fields


class NotificationListSerializer(serializers.ModelSerializer):
    """Compact serializer for notification lists."""
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'category',
            'type',
            'title',
            'is_read',
            'created_at',
        ]
        read_only_fields = fields


class UnreadCountSerializer(serializers.Serializer):
    """Serializer for unread count response."""
    unread_count = serializers.IntegerField()


class CategoryCountSerializer(serializers.Serializer):
    """Serializer for category-based counts."""
    category = serializers.CharField()
    count = serializers.IntegerField()
