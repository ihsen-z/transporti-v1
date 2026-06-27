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
    """Compact serializer for notification lists — includes message + metadata for frontend."""
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'category',
            'type',
            'title',
            'message',
            'is_read',
            'metadata',
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


# =============================================================================
# Device Token Serializers (Mobile Push Notifications)
# =============================================================================

class DeviceTokenRegisterSerializer(serializers.Serializer):
    """
    Validates device token registration from mobile clients.
    POST /api/v1/notifications/devices/register/
    """
    platform = serializers.ChoiceField(
        choices=[('ANDROID', 'Android'), ('IOS', 'iOS')],
        required=True,
    )
    token = serializers.CharField(
        max_length=500,
        required=True,
        help_text="FCM or APNS device token",
    )
    device_name = serializers.CharField(
        max_length=100,
        required=False,
        default='',
        help_text="Human-readable device name",
    )


class DeviceTokenListSerializer(serializers.ModelSerializer):
    """Read-only serializer for listing user's registered devices."""
    
    class Meta:
        from .models import DeviceToken
        model = DeviceToken
        fields = ['id', 'platform', 'device_name', 'is_active', 'created_at', 'updated_at']
        read_only_fields = fields
