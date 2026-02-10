"""
Notifications Services - Transporti V1
Core notification service and event-driven auto-creation.

RULES:
- All notifications logged
- No exceptions propagated from auto-notify (fail-safe)
- Metadata always serializable
"""
import logging
from django.utils import timezone
from django.db import transaction

from .models import Notification, NotificationType

logger = logging.getLogger('transporti')


# =============================================================================
# CORE SERVICE
# =============================================================================

def notify(
    user,
    notification_type: str,
    title: str,
    message: str,
    metadata: dict = None
) -> Notification:
    """
    Create a notification for a user.
    
    Args:
        user: User to notify
        notification_type: NotificationType value
        title: Short title
        message: Full message
        metadata: Optional context dict
    
    Returns:
        Created Notification
    """
    notification = Notification.objects.create(
        user=user,
        type=notification_type,
        title=title[:200],
        message=message[:1000],
        metadata=metadata or {}
    )
    
    return notification


def mark_as_read(notification: Notification) -> Notification:
    """
    Mark a notification as read.
    
    Args:
        notification: Notification instance
    
    Returns:
        Updated Notification
    """
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=['is_read', 'read_at'])
        
        logger.debug(
            f"NOTIFICATION_READ: id={notification.id}, user_id={notification.user_id}"
        )
    
    return notification


def mark_all_read(user) -> int:
    """
    Mark all unread notifications as read for a user.
    
    Returns:
        Number of notifications marked as read
    """
    count = Notification.objects.filter(
        user=user,
        is_read=False
    ).update(
        is_read=True,
        read_at=timezone.now()
    )
    
    if count > 0:
        logger.info(f"NOTIFICATIONS_BULK_READ: user_id={user.id}, count={count}")
    
    return count


def get_unread_count(user) -> int:
    """Get count of unread notifications."""
    return Notification.objects.filter(user=user, is_read=False).count()


# =============================================================================
# AUTO-NOTIFY HELPERS (Fail-safe)
# =============================================================================

def _safe_notify(user, notification_type, title, message, metadata=None):
    """Wrapper that catches all exceptions to prevent cascading failures."""
    try:
        return notify(user, notification_type, title, message, metadata)
    except Exception as e:
        logger.error(
            f"NOTIFICATION_FAILED: type={notification_type}, user_id={user.id if user else None}, "
            f"error={str(e)}"
        )
        return None


# =============================================================================
# OFFER EVENT NOTIFICATIONS
# =============================================================================

def notify_offer_received(job, offer):
    """Notify client about new offer."""
    return _safe_notify(
        user=job.client,
        notification_type=NotificationType.OFFER_RECEIVED,
        title="New offer received",
        message=f"You received a new offer of {offer.total_price} TND for your transport request.",
        metadata={
            'job_id': job.id,
            'offer_id': offer.id,
            'amount': str(offer.total_price),
            'transporter_id': offer.transporter_id
        }
    )


def notify_offer_accepted(offer):
    """Notify transporter their offer was accepted."""
    return _safe_notify(
        user=offer.transporter,
        notification_type=NotificationType.OFFER_ACCEPTED,
        title="Offer accepted!",
        message=f"Your offer of {offer.total_price} TND has been accepted.",
        metadata={
            'job_id': offer.job_id,
            'offer_id': offer.id,
            'amount': str(offer.total_price)
        }
    )


def notify_offer_rejected(offer, reason: str = ""):
    """Notify transporter their offer was rejected."""
    msg = f"Your offer of {offer.total_price} TND was not accepted."
    if reason:
        msg += f" Reason: {reason}"
    
    return _safe_notify(
        user=offer.transporter,
        notification_type=NotificationType.OFFER_REJECTED,
        title="Offer not accepted",
        message=msg,
        metadata={
            'job_id': offer.job_id,
            'offer_id': offer.id
        }
    )


# =============================================================================
# ESCROW EVENT NOTIFICATIONS
# =============================================================================

def notify_escrow_released(escrow):
    """Notify transporter that escrow was released."""
    job = escrow.booking_reference
    try:
        transporter = job.accepted_offer.transporter
    except AttributeError:
        return None
    
    return _safe_notify(
        user=transporter,
        notification_type=NotificationType.ESCROW_RELEASED,
        title="Payment released",
        message=f"Payment of {escrow.amount} TND has been released to you.",
        metadata={
            'job_id': job.id,
            'escrow_id': escrow.id,
            'amount': str(escrow.amount)
        }
    )


def notify_escrow_refunded(escrow):
    """Notify client that escrow was refunded."""
    job = escrow.booking_reference
    
    return _safe_notify(
        user=job.client,
        notification_type=NotificationType.ESCROW_REFUNDED,
        title="Payment refunded",
        message=f"Your payment of {escrow.amount} TND has been refunded.",
        metadata={
            'job_id': job.id,
            'escrow_id': escrow.id,
            'amount': str(escrow.amount)
        }
    )


def notify_escrow_blocked(job, reason: str):
    """Notify involved parties that escrow is blocked."""
    notifications = []
    
    # Notify client
    notifications.append(_safe_notify(
        user=job.client,
        notification_type=NotificationType.ESCROW_BLOCKED,
        title="Payment on hold",
        message=f"Payment is blocked due to: {reason}",
        metadata={'job_id': job.id, 'reason': reason}
    ))
    
    # Notify transporter
    try:
        transporter = job.accepted_offer.transporter
        notifications.append(_safe_notify(
            user=transporter,
            notification_type=NotificationType.ESCROW_BLOCKED,
            title="Payment on hold",
            message=f"Payment release is blocked due to: {reason}",
            metadata={'job_id': job.id, 'reason': reason}
        ))
    except AttributeError:
        pass
    
    return notifications


# =============================================================================
# DISPUTE EVENT NOTIFICATIONS
# =============================================================================

def notify_dispute_opened(dispute):
    """Notify both parties about new dispute."""
    notifications = []
    job = dispute.job
    
    # Notify the other party
    if dispute.opened_by == job.client:
        other_party = job.accepted_offer.transporter if hasattr(job, 'accepted_offer') else None
    else:
        other_party = job.client
    
    if other_party:
        notifications.append(_safe_notify(
            user=other_party,
            notification_type=NotificationType.DISPUTE_OPENED,
            title="Dispute opened",
            message="A dispute has been opened for your transport job.",
            metadata={
                'job_id': job.id,
                'dispute_id': dispute.id,
                'category': dispute.category
            }
        ))
    
    return notifications


def notify_dispute_resolved(dispute, resolution: str):
    """Notify both parties about dispute resolution."""
    notifications = []
    job = dispute.job
    
    for user in [job.client, getattr(getattr(job, 'accepted_offer', None), 'transporter', None)]:
        if user:
            notifications.append(_safe_notify(
                user=user,
                notification_type=NotificationType.DISPUTE_RESOLVED,
                title="Dispute resolved",
                message=f"The dispute has been resolved. Resolution: {resolution}",
                metadata={
                    'job_id': job.id,
                    'dispute_id': dispute.id,
                    'resolution': resolution
                }
            ))
    
    return notifications


# =============================================================================
# REVIEW EVENT NOTIFICATIONS
# =============================================================================

def notify_review_received(review):
    """Notify user they received a review."""
    rating_stars = "⭐" * review.rating
    
    return _safe_notify(
        user=review.target,
        notification_type=NotificationType.REVIEW_RECEIVED,
        title="New review received",
        message=f"You received a {rating_stars} review.",
        metadata={
            'review_id': review.id,
            'job_id': review.job_id,
            'rating': review.rating,
            'has_comment': bool(review.comment)
        }
    )


# =============================================================================
# TRUST EVENT NOTIFICATIONS
# =============================================================================

def notify_trust_blocked(user, action: str, reason: str):
    """Notify user when action is blocked by trust."""
    return _safe_notify(
        user=user,
        notification_type=NotificationType.TRUST_BLOCKED,
        title="Action blocked",
        message=f"Your action ({action}) was blocked: {reason}",
        metadata={
            'action': action,
            'reason': reason
        }
    )


def notify_trust_override_granted(user, scope: str, admin_note: str = ""):
    """Notify user about trust override."""
    return _safe_notify(
        user=user,
        notification_type=NotificationType.TRUST_OVERRIDE_GRANTED,
        title="Trust override granted",
        message=f"An override has been granted for: {scope}",
        metadata={
            'scope': scope,
            'admin_note': admin_note
        }
    )


def notify_verification_result(user, approved: bool, reason: str = ""):
    """Notify user about verification result."""
    if approved:
        return _safe_notify(
            user=user,
            notification_type=NotificationType.VERIFICATION_APPROVED,
            title="Verification approved",
            message="Your account has been verified. You can now access all features.",
            metadata={}
        )
    else:
        return _safe_notify(
            user=user,
            notification_type=NotificationType.VERIFICATION_REJECTED,
            title="Verification not approved",
            message=f"Your verification was not approved. {reason}",
            metadata={'reason': reason}
        )


# =============================================================================
# JOB EVENT NOTIFICATIONS
# =============================================================================

def notify_job_completed(job):
    """Notify both parties about job completion."""
    notifications = []
    
    notifications.append(_safe_notify(
        user=job.client,
        notification_type=NotificationType.JOB_COMPLETED,
        title="Job completed",
        message="Your transport job has been completed.",
        metadata={'job_id': job.id}
    ))
    
    try:
        transporter = job.accepted_offer.transporter
        notifications.append(_safe_notify(
            user=transporter,
            notification_type=NotificationType.JOB_COMPLETED,
            title="Job completed",
            message="You have completed the transport job.",
            metadata={'job_id': job.id}
        ))
    except AttributeError:
        pass
    
    return notifications
