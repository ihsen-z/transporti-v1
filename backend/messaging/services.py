"""
Messaging Services - Transporti V1
Secure job-bound messaging with anti-bypass protection.

RULES:
- Users can only message on jobs they participate in
- Locked conversations block new messages
- Phone, email, and URL patterns are blocked (anti-bypass)
- All violations logged
"""
import re
import logging
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied

from .models import Conversation, Message
from logistics.models import TransportJob, Offer

logger = logging.getLogger('transporti')


# =============================================================================
# ANTI-BYPASS PATTERNS
# =============================================================================

# Regex patterns for detecting contact info bypass attempts
PHONE_PATTERNS = [
    r'\b\d{2}[\s.-]\d{3}[\s.-]\d{3}\b',  # TN format: 12 345 678 (with separators)
    r'(?<![.,\d])\b\d{8}\b(?!\s*(?:tnd|dt|dinars?|€|\$))',  # 8 digits (exclude amounts like 10000000 TND)
    r'\b\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b',  # International
    r'\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b',  # US format
    r'(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine)){6,}',  # Spelled numbers
]


EMAIL_PATTERNS = [
    r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # Standard email
    r'[a-zA-Z0-9._%+-]+\s*[@\(\[]\s*[a-zA-Z0-9.-]+\s*[\.\(\[]\s*[a-zA-Z]{2,}',  # Obfuscated email
    r'[a-zA-Z0-9._%+-]+\s+at\s+[a-zA-Z0-9.-]+\s+dot\s+[a-zA-Z]{2,}',  # "at" and "dot"
]

URL_PATTERNS = [
    r'https?://[^\s]+',  # Standard URL
    r'www\.[^\s]+',  # www. prefix
    r'[a-zA-Z0-9-]+\.(com|org|net|io|co|tn|fr|me|app|dev|link)[^\s]*',  # Domain patterns
    r'(?:facebook|instagram|whatsapp|telegram|viber|signal)\.(?:com|me|org)',  # Social media
]

# Combine all patterns
BYPASS_PATTERNS = PHONE_PATTERNS + EMAIL_PATTERNS + URL_PATTERNS


def _contains_bypass_attempt(content: str) -> tuple[bool, str]:
    """
    Check if content contains phone, email, or URL patterns.
    Returns (is_blocked, pattern_matched).
    """
    content_lower = content.lower()
    
    for pattern in BYPASS_PATTERNS:
        if re.search(pattern, content_lower, re.IGNORECASE):
            return True, pattern
    
    return False, ''


# =============================================================================
# PARTICIPANT VALIDATION
# =============================================================================

def _is_job_participant(user, job: TransportJob) -> bool:
    """Check if user is job owner or assigned transporter."""
    # Job owner (client)
    if job.owner_id == user.id:
        return True
    
    # Assigned transporter (accepted offer)
    return Offer.objects.filter(
        job=job,
        status='ACCEPTED',
        transporter=user
    ).exists()


def _is_moderator(user) -> bool:
    """Check if user is moderator or admin."""
    return user.role in ['MODERATOR', 'ADMIN']


# =============================================================================
# CORE SERVICES
# =============================================================================

@transaction.atomic
def get_or_create_conversation(job: TransportJob) -> Conversation:
    """
    Get existing conversation or create new one for a job.
    Auto-populates participants from job owner and accepted transporter.
    """
    conversation, created = Conversation.objects.get_or_create(job=job)
    
    if created:
        # Add job owner
        conversation.participants.add(job.owner)
        
        # Add accepted transporter if exists
        accepted_offer = Offer.objects.filter(job=job, status='ACCEPTED').first()
        if accepted_offer:
            conversation.participants.add(accepted_offer.transporter)
        
        logger.info(f"CONVERSATION_CREATED: job_id={job.id}")
    
    return conversation


@transaction.atomic
def send_message(user, job: TransportJob, content: str, is_system: bool = False) -> Message:
    """
    Send a message in a job conversation.
    
    Args:
        user: The sender
        job: The job context
        content: Message content
        is_system: If True, bypasses anti-bypass check (moderator only)
    
    Returns:
        Created Message instance
    
    Raises:
        PermissionDenied: If user is not a participant
        ValidationError: If conversation locked or bypass detected
    """
    # Validate participant (unless moderator sending system message)
    if not is_system and not _is_job_participant(user, job):
        logger.warning(
            f"MESSAGE_BLOCKED: user_id={user.id} not participant in job_id={job.id}"
        )
        raise PermissionDenied("You can only send messages on jobs you participate in.")
    
    # System messages require moderator role
    if is_system and not _is_moderator(user):
        logger.warning(
            f"SYSTEM_MESSAGE_DENIED: user_id={user.id} is not moderator"
        )
        raise PermissionDenied("Only moderators can send system messages.")
    
    # Get or create conversation
    conversation = get_or_create_conversation(job)
    
    # Check if locked
    if conversation.is_locked and not _is_moderator(user):
        logger.warning(
            f"MESSAGE_BLOCKED: conversation for job_id={job.id} is locked"
        )
        raise ValidationError("This conversation is locked and no longer accepting messages.")
    
    # Anti-bypass check (skip for system messages)
    # BLOCKED: During negotiation (PUBLISHED)
    # ALLOWED: Once booking is confirmed (IN_PROGRESS, COMPLETED)
    if not is_system and job.status == TransportJob.Status.PUBLISHED:
        is_blocked, pattern = _contains_bypass_attempt(content)
        if is_blocked:
            logger.warning(
                f"ANTI_BYPASS_TRIGGERED: user_id={user.id}, job_id={job.id}, pattern={pattern}"
            )
            raise ValidationError(
                "Message contains contact information (phone, email, or URL) which is not allowed during negotiation. "
                "Contact details will be shared automatically once a booking is confirmed."
            )
    
    # Create message
    message = Message.objects.create(
        conversation=conversation,
        sender=user,
        content=content,
        is_system=is_system
    )
    
    # Update conversation timestamp
    conversation.save(update_fields=['updated_at'])
    
    logger.info(
        f"MESSAGE_SENT: message_id={message.id}, job_id={job.id}, "
        f"sender_id={user.id}, is_system={is_system}"
    )
    
    return message


@transaction.atomic
def send_system_message(job: TransportJob, content: str, actor=None) -> Message:
    """
    Send a system-generated message (no sender, no bypass check).
    Used for status updates, dispute notifications, etc.
    
    Args:
        job: The job context
        content: Message content
        actor: Optional user triggering this (for logging)
    
    Returns:
        Created Message instance
    """
    conversation = get_or_create_conversation(job)
    
    message = Message.objects.create(
        conversation=conversation,
        sender=None,
        content=content,
        is_system=True
    )
    
    conversation.save(update_fields=['updated_at'])
    
    logger.info(
        f"SYSTEM_MESSAGE_SENT: message_id={message.id}, job_id={job.id}, "
        f"actor_id={actor.id if actor else 'system'}"
    )
    
    return message


def get_conversation_messages(user, job: TransportJob, limit: int = 50) -> list[Message]:
    """
    Get messages from a job conversation.
    Validates user is participant or moderator.
    """
    if not _is_job_participant(user, job) and not _is_moderator(user):
        raise PermissionDenied("You cannot view messages for this job.")
    
    try:
        conversation = Conversation.objects.get(job=job)
    except Conversation.DoesNotExist:
        return []
    
    return list(
        conversation.messages
        .select_related('sender')
        .order_by('-created_at')[:limit]
    )


@transaction.atomic
def mark_messages_as_read(user, job: TransportJob) -> int:
    """
    Mark all messages in a conversation as read for a user.
    Returns count of messages marked as read.
    """
    if not _is_job_participant(user, job):
        raise PermissionDenied("You cannot mark messages for this job.")
    
    try:
        conversation = Conversation.objects.get(job=job)
    except Conversation.DoesNotExist:
        return 0
    
    # Mark messages not sent by this user as read
    count = Message.objects.filter(
        conversation=conversation,
        is_read=False
    ).exclude(
        sender=user
    ).update(is_read=True)
    
    return count


def lock_conversation(job: TransportJob, reason: str = '') -> Conversation:
    """Lock a conversation (used when job completes or dispute opens)."""
    conversation = get_or_create_conversation(job)
    conversation.lock()
    
    # Send system message
    send_system_message(job, f"This conversation has been locked. {reason}".strip())
    
    logger.info(f"CONVERSATION_LOCKED: job_id={job.id}, reason={reason}")
    
    return conversation


def unlock_conversation(job: TransportJob) -> Conversation:
    """Unlock a conversation."""
    conversation = get_or_create_conversation(job)
    conversation.unlock()
    
    logger.info(f"CONVERSATION_UNLOCKED: job_id={job.id}")
    
    return conversation
