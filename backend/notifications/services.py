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
    Also triggers push notification delivery to registered mobile devices.
    
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
    
    # Trigger push notification (fail-safe — never blocks DB notification)
    try:
        from .push_service import send_push_notification
        send_push_notification(
            user=user,
            title=title[:200],
            body=message[:500],
            data={
                'notification_id': str(notification.id),
                'type': notification_type,
                **(metadata or {}),
            },
        )
    except Exception as e:
        logger.error(
            f"PUSH_TRIGGER_FAILED: notification_id={notification.id}, "
            f"user_id={user.id}, error={str(e)}"
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
        user=job.owner,
        notification_type=NotificationType.OFFER_RECEIVED,
        title="📦 Nouvelle offre reçue",
        message=f"Vous avez reçu une offre de {offer.total_price} TND pour votre demande de transport.",
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
        title="✅ Offre acceptée !",
        message=f"Votre offre de {offer.total_price} TND a été acceptée. Préparez-vous pour la mission.",
        metadata={
            'job_id': offer.job_id,
            'offer_id': offer.id,
            'amount': str(offer.total_price)
        }
    )


def notify_offer_rejected(offer, reason: str = ""):
    """Notify transporter their offer was rejected."""
    msg = f"Votre offre de {offer.total_price} TND n'a pas été retenue."
    if reason:
        msg += f" Raison : {reason}"
    
    return _safe_notify(
        user=offer.transporter,
        notification_type=NotificationType.OFFER_REJECTED,
        title="❌ Offre non retenue",
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
        title="💸 Paiement libéré",
        message=f"Le paiement de {escrow.amount} TND a été libéré sur votre compte.",
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
        user=job.owner,
        notification_type=NotificationType.ESCROW_REFUNDED,
        title="💰 Remboursement effectué",
        message=f"Votre paiement de {escrow.amount} TND a été remboursé.",
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
        title="⏸️ Paiement en attente",
        message=f"Le paiement est bloqué : {reason}",
        metadata={'job_id': job.id, 'reason': reason}
    ))
    
    # Notify transporter
    try:
        transporter = job.accepted_offer.transporter
        notifications.append(_safe_notify(
            user=transporter,
            notification_type=NotificationType.ESCROW_BLOCKED,
            title="⏸️ Paiement en attente",
            message=f"La libération du paiement est bloquée : {reason}",
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
    if dispute.opened_by == job.owner:
        other_party = job.accepted_offer.transporter if hasattr(job, 'accepted_offer') else None
    else:
        other_party = job.owner
    
    if other_party:
        notifications.append(_safe_notify(
            user=other_party,
            notification_type=NotificationType.DISPUTE_OPENED,
            title="⚠️ Litige ouvert",
            message="Un litige a été ouvert concernant votre mission de transport.",
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
    
    for user in [job.owner, getattr(getattr(job, 'accepted_offer', None), 'transporter', None)]:
        if user:
            notifications.append(_safe_notify(
                user=user,
                notification_type=NotificationType.DISPUTE_RESOLVED,
                title="✅ Litige résolu",
                message=f"Le litige a été résolu. Résolution : {resolution}",
                metadata={
                    'job_id': job.id,
                    'dispute_id': dispute.id,
                    'resolution': resolution
                }
            ))
    
    return notifications


# =============================================================================
# TRUST EVENT NOTIFICATIONS
# =============================================================================

def notify_trust_blocked(user, action: str, reason: str):
    """Notify user when action is blocked by trust."""
    return _safe_notify(
        user=user,
        notification_type=NotificationType.TRUST_BLOCKED,
        title="🚫 Action bloquée",
        message=f"Votre action ({action}) a été bloquée : {reason}",
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
        title="🔓 Accès accordé",
        message=f"Un accès spécial a été accordé pour : {scope}",
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
            title="🛡️ Compte vérifié",
            message="Votre compte a été vérifié. Vous pouvez maintenant accéder à toutes les fonctionnalités.",
            metadata={}
        )
    else:
        return _safe_notify(
            user=user,
            notification_type=NotificationType.VERIFICATION_REJECTED,
            title="⚠️ Vérification rejetée",
            message=f"Votre vérification n'a pas été approuvée. {reason}",
            metadata={'reason': reason}
        )


# =============================================================================
# JOB EVENT NOTIFICATIONS
# =============================================================================

def notify_job_completed(job):
    """Notify both parties about job completion."""
    notifications = []
    
    notifications.append(_safe_notify(
        user=job.owner,
        notification_type=NotificationType.JOB_COMPLETED,
        title="🎉 Mission terminée",
        message="Votre transport a été livré avec succès. N'oubliez pas de laisser un avis !",
        metadata={'job_id': job.id}
    ))
    
    try:
        transporter = job.accepted_offer.transporter
        notifications.append(_safe_notify(
            user=transporter,
            notification_type=NotificationType.JOB_COMPLETED,
            title="🎉 Mission terminée",
            message="Vous avez complété la mission de transport avec succès.",
            metadata={'job_id': job.id}
        ))
    except AttributeError:
        pass
    
    return notifications


def notify_job_cancelled(job):
    """Notify transporter about job cancellation."""
    try:
        accepted_offer = job.offers.filter(status='ACCEPTED').first()
        if accepted_offer:
            return _safe_notify(
                user=accepted_offer.transporter,
                notification_type=NotificationType.JOB_CANCELLED,
                title="🚫 Mission annulée",
                message="La mission de transport a été annulée par le client.",
                metadata={'job_id': job.id}
            )
    except Exception:
        pass
    return None


def notify_transporter_cancelled(job, transporter, reason: str = ""):
    """Notify the client that the assigned transporter cancelled the mission.

    (Was imported by TransporterCancelView but never implemented — audit
    Sprint 0, bug latent n°3.)
    """
    name = f"{transporter.first_name} {transporter.last_name}".strip() or transporter.email
    message = f"Le transporteur {name} a annulé la mission. Elle est de nouveau ouverte aux offres."
    if reason:
        message += f" Raison : {reason}"
    return _safe_notify(
        user=job.owner,
        notification_type=NotificationType.JOB_CANCELLED,
        title="⚠️ Le transporteur a annulé",
        message=message,
        metadata={'job_id': job.id}
    )

