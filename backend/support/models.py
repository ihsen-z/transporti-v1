"""
Support Models - Transporti V1
Audit logging and dispute management with strict lifecycle enforcement.
"""
import logging
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

logger = logging.getLogger('transporti')


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
    """
    Dispute model with strict lifecycle enforcement.
    
    ALLOWED STATE TRANSITIONS:
        OPEN → INVESTIGATING
        INVESTIGATING → RESOLVED
        INVESTIGATING → REJECTED
    
    CONSTRAINTS:
        - Only ONE active dispute per job (status in OPEN, INVESTIGATING)
        - Invalid transitions raise ValidationError and are logged
    """
    
    class Reason(models.TextChoices):
        DAMAGED_ITEMS = 'DAMAGED_ITEMS', 'Damaged Items'
        NO_SHOW = 'NO_SHOW', 'No Show'
        PAYMENT_ISSUE = 'PAYMENT_ISSUE', 'Payment Issue'
        LATE_DELIVERY = 'LATE_DELIVERY', 'Late Delivery'
        HARASSMENT = 'HARASSMENT', 'Harassment'
        FRAUD = 'FRAUD', 'Suspected Fraud'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        INVESTIGATING = 'INVESTIGATING', 'Investigating'
        RESOLVED = 'RESOLVED', 'Resolved'
        REJECTED = 'REJECTED', 'Rejected'

    class ResolutionOutcome(models.TextChoices):
        """
        L1 (chantier financier) — issue financière structurée d'une résolution.

        Contrairement à une note libre, l'issue déclenche le mouvement d'escrow
        correspondant DANS la même transaction que la résolution :
        - NONE                : note seule, aucun mouvement (compat historique)
        - REFUND_CLIENT       : remboursement intégral du client (escrow REFUNDED)
        - RELEASE_TRANSPORTER : versement au transporteur (escrow RELEASED)
        - SPLIT               : partage (part client remboursée, reste au transporteur)
        """
        NONE = 'NONE', 'Notes only (no escrow movement)'
        REFUND_CLIENT = 'REFUND_CLIENT', 'Refund client (full)'
        RELEASE_TRANSPORTER = 'RELEASE_TRANSPORTER', 'Release to transporter'
        SPLIT = 'SPLIT', 'Split (partial refund)'

    # Outcomes that rule in favour of the client — used by L2 to keep the 48h
    # auto-release from paying the transporter after such a resolution.
    PRO_CLIENT_OUTCOMES = ['REFUND_CLIENT', 'SPLIT']

    # Valid state transitions (from -> [allowed to states])
    ALLOWED_TRANSITIONS = {
        'OPEN': ['INVESTIGATING'],
        'INVESTIGATING': ['RESOLVED', 'REJECTED'],
        'RESOLVED': [],  # Terminal state
        'REJECTED': [],  # Terminal state
    }

    # Active statuses (block new disputes)
    ACTIVE_STATUSES = ['OPEN', 'INVESTIGATING']

    # Relationships
    job = models.ForeignKey(
        'logistics.TransportJob', 
        on_delete=models.PROTECT, 
        related_name='disputes'
    )
    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.PROTECT, 
        related_name='filed_disputes'
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True,
        related_name='resolved_disputes'
    )
    
    # Content
    reason = models.CharField(max_length=50, choices=Reason.choices)
    description = models.TextField()
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.OPEN, 
        db_index=True
    )
    resolution_notes = models.TextField(blank=True)
    # L1 — structured financial outcome tied to the escrow movement (see above)
    resolution_outcome = models.CharField(
        max_length=20,
        choices=ResolutionOutcome.choices,
        default=ResolutionOutcome.NONE,
        db_index=True,
        help_text="Financial outcome that drove the escrow movement at resolution",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['job', 'status']),
            models.Index(fields=['opened_by', 'created_at']),
        ]
        constraints = [
            # DB-level: prevent duplicate active disputes per job
            models.UniqueConstraint(
                fields=['job'],
                condition=models.Q(status__in=['OPEN', 'INVESTIGATING']),
                name='unique_active_dispute_per_job'
            ),
        ]

    def __str__(self):
        return f"Dispute #{self.id} on Job #{self.job_id} [{self.status}]"
    
    def clean(self):
        """Validate state transitions and constraints."""
        super().clean()
        
        # Check for existing active dispute on this job (for new disputes)
        if not self.pk:
            existing_active = Dispute.objects.filter(
                job=self.job,
                status__in=self.ACTIVE_STATUSES
            ).exists()
            
            if existing_active:
                logger.warning(
                    f"DISPUTE_BLOCKED: job={self.job_id} already has active dispute"
                )
                raise ValidationError(
                    f"Job {self.job_id} already has an active dispute."
                )
    
    def transition_to(self, new_status: str, resolved_by=None, resolution_notes: str = '') -> None:
        """
        Safely transition dispute to a new status.
        
        Args:
            new_status: Target status (must be valid transition)
            resolved_by: User resolving (required for RESOLVED/REJECTED)
            resolution_notes: Notes explaining resolution
        
        Raises:
            ValidationError: If transition is invalid
        """
        current_status = self.status
        allowed = self.ALLOWED_TRANSITIONS.get(current_status, [])
        
        if new_status not in allowed:
            logger.error(
                f"DISPUTE_INVALID_TRANSITION: dispute_id={self.id}, "
                f"from={current_status}, to={new_status}, "
                f"allowed={allowed}"
            )
            raise ValidationError(
                f"Invalid transition: {current_status} → {new_status}. "
                f"Allowed transitions from {current_status}: {allowed or 'None (terminal state)'}"
            )
        
        # Require resolved_by for terminal states
        if new_status in ['RESOLVED', 'REJECTED'] and not resolved_by:
            logger.warning(
                f"DISPUTE_MISSING_RESOLVER: dispute_id={self.id}, status={new_status}"
            )
            raise ValidationError(
                f"resolved_by is required when transitioning to {new_status}"
            )
        
        # Apply transition
        old_status = self.status
        self.status = new_status
        
        if new_status in ['RESOLVED', 'REJECTED']:
            self.resolved_by = resolved_by
            self.resolved_at = timezone.now()
            self.resolution_notes = resolution_notes
        
        self.save()
        
        logger.info(
            f"DISPUTE_TRANSITION: dispute_id={self.id}, job_id={self.job_id}, "
            f"from={old_status}, to={new_status}, by={resolved_by.id if resolved_by else 'system'}"
        )
    
    def start_investigation(self) -> None:
        """Move dispute from OPEN to INVESTIGATING."""
        self.transition_to('INVESTIGATING')
    
    def resolve(self, resolved_by, resolution_notes: str) -> None:
        """Resolve the dispute (INVESTIGATING → RESOLVED)."""
        self.transition_to('RESOLVED', resolved_by=resolved_by, resolution_notes=resolution_notes)
    
    def reject(self, resolved_by, resolution_notes: str) -> None:
        """Reject the dispute (INVESTIGATING → REJECTED)."""
        self.transition_to('REJECTED', resolved_by=resolved_by, resolution_notes=resolution_notes)
    
    @property
    def is_active(self) -> bool:
        """Check if dispute is still active (not resolved/rejected)."""
        return self.status in self.ACTIVE_STATUSES
    
    @property
    def is_terminal(self) -> bool:
        """Check if dispute is in a terminal state."""
        return self.status in ['RESOLVED', 'REJECTED']
