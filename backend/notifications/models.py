"""
Notifications Models - Transporti V1
DB-backed notification system for MVP.

NO: real-time, email, push
YES: DB storage, API access, event integration

ARCHITECTURE:
- NotificationCategory: High-level stable categories (PAYMENT, TRUST, JOB, etc.)
- NotificationType: Event-level granularity (backward compatible)
- Normalization layer maps types to categories
"""
import logging
from django.db import models
from django.conf import settings

logger = logging.getLogger('transporti')


# =============================================================================
# HIGH-LEVEL CATEGORIES (Stable API)
# =============================================================================

class NotificationCategory(models.TextChoices):
    """
    High-level notification categories.
    Use these for filtering and grouping in the UI.
    """
    PAYMENT = 'PAYMENT', 'Payment & Escrow'
    TRUST = 'TRUST', 'Trust & Verification'
    JOB = 'JOB', 'Jobs & Offers'
    DISPUTE = 'DISPUTE', 'Disputes'
    REVIEW = 'REVIEW', 'Reviews'
    SYSTEM = 'SYSTEM', 'System'


# =============================================================================
# EVENT-LEVEL TYPES (Backward Compatible)
# =============================================================================

class NotificationType(models.TextChoices):
    """
    Event-level notification types.
    Maintained for backward compatibility.
    New code should use category + metadata.event.
    """
    # Offer events → JOB category
    OFFER_RECEIVED = 'OFFER_RECEIVED', 'New offer received'
    OFFER_ACCEPTED = 'OFFER_ACCEPTED', 'Offer accepted'
    OFFER_REJECTED = 'OFFER_REJECTED', 'Offer rejected'
    OFFER_EXPIRED = 'OFFER_EXPIRED', 'Offer expired'
    
    # Job events → JOB category
    JOB_STARTED = 'JOB_STARTED', 'Job started'
    JOB_COMPLETED = 'JOB_COMPLETED', 'Job completed'
    JOB_CANCELLED = 'JOB_CANCELLED', 'Job cancelled'
    
    # Payment events → PAYMENT category
    ESCROW_HELD = 'ESCROW_HELD', 'Payment held in escrow'
    ESCROW_RELEASED = 'ESCROW_RELEASED', 'Payment released'
    ESCROW_REFUNDED = 'ESCROW_REFUNDED', 'Payment refunded'
    ESCROW_BLOCKED = 'ESCROW_BLOCKED', 'Payment blocked'
    
    # Dispute events → DISPUTE category
    DISPUTE_OPENED = 'DISPUTE_OPENED', 'Dispute opened'
    DISPUTE_RESOLVED = 'DISPUTE_RESOLVED', 'Dispute resolved'
    DISPUTE_ESCALATED = 'DISPUTE_ESCALATED', 'Dispute escalated'
    
    # Review events → REVIEW category
    REVIEW_RECEIVED = 'REVIEW_RECEIVED', 'Review received'
    
    # Trust events → TRUST category
    TRUST_BLOCKED = 'TRUST_BLOCKED', 'Action blocked by trust'
    TRUST_OVERRIDE_GRANTED = 'TRUST_OVERRIDE_GRANTED', 'Trust override granted'
    TRUST_SCORE_CHANGED = 'TRUST_SCORE_CHANGED', 'Trust score changed'
    VERIFICATION_APPROVED = 'VERIFICATION_APPROVED', 'Verification approved'
    VERIFICATION_REJECTED = 'VERIFICATION_REJECTED', 'Verification rejected'
    
    # System events → SYSTEM category
    SYSTEM_ALERT = 'SYSTEM_ALERT', 'System alert'


# =============================================================================
# TYPE → CATEGORY MAPPING
# =============================================================================

TYPE_TO_CATEGORY_MAP = {
    # JOB category
    NotificationType.OFFER_RECEIVED: NotificationCategory.JOB,
    NotificationType.OFFER_ACCEPTED: NotificationCategory.JOB,
    NotificationType.OFFER_REJECTED: NotificationCategory.JOB,
    NotificationType.OFFER_EXPIRED: NotificationCategory.JOB,
    NotificationType.JOB_STARTED: NotificationCategory.JOB,
    NotificationType.JOB_COMPLETED: NotificationCategory.JOB,
    NotificationType.JOB_CANCELLED: NotificationCategory.JOB,
    
    # PAYMENT category
    NotificationType.ESCROW_HELD: NotificationCategory.PAYMENT,
    NotificationType.ESCROW_RELEASED: NotificationCategory.PAYMENT,
    NotificationType.ESCROW_REFUNDED: NotificationCategory.PAYMENT,
    NotificationType.ESCROW_BLOCKED: NotificationCategory.PAYMENT,
    
    # DISPUTE category
    NotificationType.DISPUTE_OPENED: NotificationCategory.DISPUTE,
    NotificationType.DISPUTE_RESOLVED: NotificationCategory.DISPUTE,
    NotificationType.DISPUTE_ESCALATED: NotificationCategory.DISPUTE,
    
    # REVIEW category
    NotificationType.REVIEW_RECEIVED: NotificationCategory.REVIEW,
    
    # TRUST category
    NotificationType.TRUST_BLOCKED: NotificationCategory.TRUST,
    NotificationType.TRUST_OVERRIDE_GRANTED: NotificationCategory.TRUST,
    NotificationType.TRUST_SCORE_CHANGED: NotificationCategory.TRUST,
    NotificationType.VERIFICATION_APPROVED: NotificationCategory.TRUST,
    NotificationType.VERIFICATION_REJECTED: NotificationCategory.TRUST,
    
    # SYSTEM category
    NotificationType.SYSTEM_ALERT: NotificationCategory.SYSTEM,
}


def normalize_notification_type(notification_type: str) -> dict:
    """
    Normalize a notification type to category + event.
    
    Args:
        notification_type: NotificationType value (e.g., 'OFFER_ACCEPTED')
    
    Returns:
        Dict with 'category' and 'event' keys
    
    Example:
        >>> normalize_notification_type('OFFER_ACCEPTED')
        {'category': 'JOB', 'event': 'OFFER_ACCEPTED'}
    """
    category = TYPE_TO_CATEGORY_MAP.get(notification_type, NotificationCategory.SYSTEM)
    
    return {
        'category': category.value if hasattr(category, 'value') else category,
        'event': notification_type
    }


def get_category_for_type(notification_type: str) -> str:
    """
    Get the category for a notification type.
    
    Args:
        notification_type: NotificationType value
    
    Returns:
        NotificationCategory value string
    """
    category = TYPE_TO_CATEGORY_MAP.get(notification_type, NotificationCategory.SYSTEM)
    return category.value if hasattr(category, 'value') else category


# =============================================================================
# NOTIFICATION MODEL
# =============================================================================

class Notification(models.Model):
    """
    User notification stored in database.
    
    RULES:
    - All notifications logged on creation
    - Metadata is optional JSON for context
    - is_read defaults to False
    - category is auto-derived from type
    
    SCHEMA:
    - type: Event-level granularity (backward compat)
    - category: High-level grouping (auto-computed)
    - metadata.event: Mirrors type for new API consumers
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    
    type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        db_index=True,
        help_text="Event-level type (backward compatible)"
    )
    
    category = models.CharField(
        max_length=20,
        choices=NotificationCategory.choices,
        db_index=True,
        default=NotificationCategory.SYSTEM,
        help_text="High-level category (auto-derived from type)"
    )
    
    title = models.CharField(max_length=200)
    message = models.TextField(max_length=1000)
    
    is_read = models.BooleanField(default=False, db_index=True)
    
    # Optional context data (now includes 'event' key)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context (job_id, amount, event, etc.)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', 'type']),
            models.Index(fields=['user', 'category']),
        ]
    
    def __str__(self):
        status = "📖" if self.is_read else "🔔"
        return f"{status} [{self.category}] {self.type}: {self.title[:50]}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        # Auto-derive category from type
        if self.type:
            self.category = get_category_for_type(self.type)
            
            # Ensure metadata.event is set for new API
            if 'event' not in self.metadata:
                self.metadata = {**self.metadata, 'event': self.type}
        
        super().save(*args, **kwargs)
        
        if is_new:
            logger.info(
                f"NOTIFICATION_CREATED: id={self.id}, user_id={self.user_id}, "
                f"category={self.category}, type={self.type}, title={self.title[:50]}"
            )


# =============================================================================
# DEVICE TOKEN MODEL (Mobile Push Notifications)
# =============================================================================

class DeviceToken(models.Model):
    """
    Stores FCM/APNS device tokens for mobile push notification delivery.
    
    RULES:
    - One active token per (user, platform) — registering a new token
      deactivates the previous one for that platform.
    - Tokens are deactivated (not deleted) to preserve audit trail.
    - Mobile clients call POST /api/v1/notifications/devices/register/
      on each app launch to keep tokens fresh.
    """
    class Platform(models.TextChoices):
        ANDROID = 'ANDROID', 'Android (FCM)'
        IOS = 'IOS', 'iOS (APNS)'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='device_tokens',
        db_index=True,
    )
    platform = models.CharField(
        max_length=10,
        choices=Platform.choices,
        help_text="Mobile platform (ANDROID or IOS)",
    )
    token = models.CharField(
        max_length=500,
        help_text="FCM registration token or APNS device token",
    )
    device_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Human-readable device name (e.g., 'Samsung S24')",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Inactive tokens are skipped during push delivery",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'token'],
                name='unique_user_device_token',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'platform', 'is_active']),
        ]

    def __str__(self):
        status = "✅" if self.is_active else "❌"
        return f"{status} {self.platform}: {self.user} ({self.device_name or 'unnamed'})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        
        if is_new and self.is_active:
            # Deactivate previous tokens for same user+platform
            DeviceToken.objects.filter(
                user=self.user,
                platform=self.platform,
                is_active=True,
            ).exclude(token=self.token).update(is_active=False)
        
        super().save(*args, **kwargs)
        
        if is_new:
            logger.info(
                f"DEVICE_TOKEN_REGISTERED: user_id={self.user_id}, "
                f"platform={self.platform}, device={self.device_name}"
            )

