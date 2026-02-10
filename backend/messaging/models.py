"""
Messaging Models - Transporti V1
Job-bound secure messaging between participants.

RULES:
- One conversation per job (enforced by unique constraint)
- No direct user-to-user chat
- Participants limited to job owner and accepted transporter
- Conversations can be locked (dispute, completion)
"""
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """
    Conversation linked to a specific job.
    Participants are auto-set to job owner + accepted transporter.
    """
    job = models.OneToOneField(
        'logistics.TransportJob',
        on_delete=models.CASCADE,
        related_name='conversation'
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations'
    )
    is_locked = models.BooleanField(
        default=False,
        help_text="Locked conversations prevent new messages"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['job']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Conversation for Job #{self.job_id}"
    
    @property
    def last_message(self):
        """Get the most recent message."""
        return self.messages.order_by('-created_at').first()
    
    @property
    def message_count(self) -> int:
        """Count total messages."""
        return self.messages.count()
    
    def lock(self) -> None:
        """Lock the conversation (prevents new messages)."""
        self.is_locked = True
        self.save(update_fields=['is_locked', 'updated_at'])
    
    def unlock(self) -> None:
        """Unlock the conversation."""
        self.is_locked = False
        self.save(update_fields=['is_locked', 'updated_at'])


class Message(models.Model):
    """
    Individual message in a conversation.
    Can be from a user or system-generated.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_messages'
    )
    content = models.TextField(max_length=2000)
    is_system = models.BooleanField(
        default=False,
        help_text="True for system-generated messages (status updates, etc.)"
    )
    is_read = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['conversation', 'is_read']),
        ]
        ordering = ['created_at']
    
    def __str__(self):
        sender_name = self.sender.email if self.sender else "System"
        return f"Message from {sender_name} at {self.created_at}"
    
    def mark_as_read(self) -> None:
        """Mark message as read."""
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])
