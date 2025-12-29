from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    Immutable log of critical system actions.
    Required for V1 Compliance.
    """
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='audit_actions'
    )
    action = models.CharField(max_length=50, db_index=True)
    target_entity = models.CharField(max_length=100, db_index=True)
    changes = models.JSONField(default=dict)
    reason = models.TextField(blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['actor', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp}] {self.actor} -> {self.action}"


class Dispute(models.Model):
    class Reason(models.TextChoices):
        DAMAGED_ITEMS = 'DAMAGED_ITEMS', 'Damaged Items'
        NO_SHOW = 'NO_SHOW', 'No Show'
        PAYMENT_ISSUE = 'PAYMENT_ISSUE', 'Payment Issue'
        HARASSMENT = 'HARASSMENT', 'Harassment'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        INVESTIGATING = 'INVESTIGATING', 'Investigating'
        RESOLVED = 'RESOLVED', 'Resolved'
        DISMISSED = 'DISMISSED', 'Dismissed'

    initiator = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        related_name='filed_disputes'
    )
    job = models.ForeignKey(
        'logistics.TransportJob', 
        on_delete=models.PROTECT, 
        related_name='disputes'
    )
    
    reason = models.CharField(max_length=50, choices=Reason.choices)
    description = models.TextField()
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.OPEN, 
        db_index=True
    )
    
    resolution_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['job', 'status']),
        ]

    def __str__(self):
        return f"Dispute #{self.id} on Job #{self.job_id}"
