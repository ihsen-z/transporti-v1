"""
Dispute Services - Transporti V1
Business logic for dispute lifecycle management.

RULES:
- All operations are atomic
- RBAC enforced at service layer
- All state transitions logged
- No direct model.save() from views
"""
import logging
from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied

from .models import Dispute, AuditLog
from logistics.models import TransportJob, Offer

logger = logging.getLogger('transporti')


def _is_job_participant(user, job: TransportJob) -> bool:
    """Check if user is either job owner or assigned transporter."""
    # Job owner (client)
    if job.owner_id == user.id:
        return True
    
    # Assigned transporter (accepted offer)
    accepted_offer = Offer.objects.filter(
        job=job,
        status='ACCEPTED',
        transporter=user
    ).exists()
    
    return accepted_offer


def _require_moderator(user) -> None:
    """Raise PermissionDenied if user is not moderator/admin."""
    if user.role not in ['MODERATOR', 'ADMIN']:
        logger.warning(
            f"DISPUTE_ACCESS_DENIED: user_id={user.id}, role={user.role}, required=MODERATOR/ADMIN"
        )
        raise PermissionDenied("Only moderators and admins can perform this action.")


@transaction.atomic
def create_dispute(user, job: TransportJob, reason: str, description: str) -> Dispute:
    """
    Create a new dispute on a job.
    
    Args:
        user: User filing the dispute
        job: The job being disputed
        reason: Dispute reason (from Dispute.Reason choices)
        description: Detailed description
    
    Returns:
        Created Dispute instance
    
    Raises:
        ValidationError: If user not participant or active dispute exists
    """
    # Verify user is a job participant
    if not _is_job_participant(user, job):
        logger.warning(
            f"DISPUTE_BLOCKED: user_id={user.id} not participant in job_id={job.id}"
        )
        raise ValidationError(
            "You can only file disputes on jobs you are a participant in."
        )
    
    # Check for existing active dispute
    existing = Dispute.objects.filter(
        job=job,
        status__in=Dispute.ACTIVE_STATUSES
    ).exists()
    
    if existing:
        logger.warning(
            f"DISPUTE_BLOCKED: job_id={job.id} already has active dispute"
        )
        raise ValidationError(
            f"Job {job.id} already has an active dispute."
        )
    
    # Validate reason
    valid_reasons = [choice[0] for choice in Dispute.Reason.choices]
    if reason not in valid_reasons:
        raise ValidationError(f"Invalid reason: {reason}. Must be one of: {valid_reasons}")
    
    # Create dispute
    dispute = Dispute.objects.create(
        job=job,
        opened_by=user,
        reason=reason,
        description=description,
        status=Dispute.Status.OPEN
    )
    
    # Create audit log
    AuditLog.objects.create(
        actor=user,
        action='DISPUTE_OPENED',
        target_entity=f'Dispute:{dispute.id}',
        changes={'job_id': job.id, 'reason': reason},
        reason=description[:200]  # Truncate for audit
    )
    
    logger.info(
        f"DISPUTE_OPENED: dispute_id={dispute.id}, job_id={job.id}, "
        f"opened_by={user.id}, reason={reason}"
    )
    
    return dispute


@transaction.atomic
def start_investigation(dispute: Dispute, moderator) -> Dispute:
    """
    Move dispute from OPEN to INVESTIGATING.
    
    Args:
        dispute: The dispute to investigate
        moderator: Moderator/Admin user
    
    Returns:
        Updated Dispute instance
    
    Raises:
        PermissionDenied: If user is not moderator/admin
        ValidationError: If transition is invalid
    """
    _require_moderator(moderator)
    
    try:
        dispute.start_investigation()
    except ValidationError as e:
        logger.error(
            f"DISPUTE_INVESTIGATION_FAILED: dispute_id={dispute.id}, "
            f"moderator_id={moderator.id}, error={str(e)}"
        )
        raise
    
    # Create audit log
    AuditLog.objects.create(
        actor=moderator,
        action='DISPUTE_INVESTIGATING',
        target_entity=f'Dispute:{dispute.id}',
        changes={'old_status': 'OPEN', 'new_status': 'INVESTIGATING'},
        reason=f'Investigation started by moderator {moderator.id}'
    )
    
    logger.info(
        f"DISPUTE_INVESTIGATING: dispute_id={dispute.id}, "
        f"moderator_id={moderator.id}"
    )
    
    return dispute


@transaction.atomic
def resolve_dispute(
    dispute: Dispute,
    moderator,
    resolution_notes: str,
    resolution_outcome: str = None,
    refund_amount=None,
) -> Dispute:
    """
    Resolve a dispute (INVESTIGATING → RESOLVED).

    L1 (chantier financier): the resolution can now carry a STRUCTURED financial
    outcome that triggers the matching escrow movement in THIS same transaction,
    instead of a free-text note alone:
      - NONE (default)      : note only, no escrow movement (historical behaviour)
      - REFUND_CLIENT       : full refund to the client   → refund_escrow()
      - RELEASE_TRANSPORTER : pay the transporter          → release_escrow_on_completion()
      - SPLIT               : partial refund + payout      → split_escrow(refund_amount)

    Args:
        dispute: The dispute to resolve
        moderator: Moderator/Admin user
        resolution_notes: Explanation of resolution
        resolution_outcome: One of Dispute.ResolutionOutcome (defaults to NONE)
        refund_amount: Client share, REQUIRED for SPLIT (0 < x < escrow amount)

    Returns:
        Updated Dispute instance

    Raises:
        PermissionDenied: If user is not moderator/admin
        ValidationError: If transition is invalid, notes missing, or outcome invalid
    """
    # Local imports: the escrow movements live in the payments app. Importing
    # them at module load would create a support ↔ payments import cycle.
    from payments.services import (
        refund_escrow, release_escrow_on_completion, split_escrow,
    )

    _require_moderator(moderator)

    if not resolution_notes or len(resolution_notes.strip()) < 10:
        raise ValidationError("Resolution notes required (minimum 10 characters).")

    # Normalise + validate the structured outcome.
    outcome = resolution_outcome or Dispute.ResolutionOutcome.NONE
    valid_outcomes = [c[0] for c in Dispute.ResolutionOutcome.choices]
    if outcome not in valid_outcomes:
        raise ValidationError(
            f"Invalid resolution_outcome: {outcome}. Must be one of {valid_outcomes}"
        )
    if outcome == Dispute.ResolutionOutcome.SPLIT and refund_amount is None:
        raise ValidationError("refund_amount is required for a SPLIT resolution.")

    try:
        dispute.resolve(resolved_by=moderator, resolution_notes=resolution_notes)
    except ValidationError as e:
        logger.error(
            f"DISPUTE_RESOLUTION_FAILED: dispute_id={dispute.id}, "
            f"moderator_id={moderator.id}, error={str(e)}"
        )
        raise

    # Persist the outcome so L2 (auto-release) and audits can read it later.
    dispute.resolution_outcome = outcome
    dispute.save(update_fields=['resolution_outcome'])

    # === L1 — trigger the escrow movement in the same transaction ===
    escrow_action = 'none'
    try:
        if outcome == Dispute.ResolutionOutcome.REFUND_CLIENT:
            refund_escrow(dispute.job, reason=f'Dispute #{dispute.id} resolved: refund client')
            escrow_action = 'refund_client'
        elif outcome == Dispute.ResolutionOutcome.RELEASE_TRANSPORTER:
            release_escrow_on_completion(
                dispute.job,
                admin_user=moderator,
                reason=f'Dispute #{dispute.id} resolved: release to transporter',
            )
            escrow_action = 'release_transporter'
        elif outcome == Dispute.ResolutionOutcome.SPLIT:
            split_escrow(
                dispute.job,
                refund_amount=refund_amount,
                reason=f'Dispute #{dispute.id} resolved: split',
                admin_user=moderator,
            )
            escrow_action = 'split'
    except ValueError as e:
        # An escrow guard (already released, no escrow, bad split amount…) must
        # abort the whole resolution — never leave a dispute RESOLVED without the
        # money movement it promised.
        logger.error(
            f"DISPUTE_ESCROW_ACTION_FAILED: dispute_id={dispute.id}, "
            f"outcome={outcome}, error={str(e)}"
        )
        raise ValidationError(f"Escrow action failed: {str(e)}")

    # Create audit log
    AuditLog.objects.create(
        actor=moderator,
        action='DISPUTE_RESOLVED',
        target_entity=f'Dispute:{dispute.id}',
        changes={
            'old_status': 'INVESTIGATING',
            'new_status': 'RESOLVED',
            'resolution_outcome': outcome,
            'escrow_action': escrow_action,
            'resolution_notes': resolution_notes[:500]
        },
        reason=resolution_notes
    )

    logger.info(
        f"DISPUTE_RESOLVED: dispute_id={dispute.id}, job_id={dispute.job_id}, "
        f"moderator_id={moderator.id}, outcome={outcome}, escrow_action={escrow_action}"
    )

    return dispute


@transaction.atomic
def reject_dispute(dispute: Dispute, moderator, resolution_notes: str) -> Dispute:
    """
    Reject a dispute (INVESTIGATING → REJECTED).
    
    Args:
        dispute: The dispute to reject
        moderator: Moderator/Admin user
        resolution_notes: Explanation for rejection
    
    Returns:
        Updated Dispute instance
    
    Raises:
        PermissionDenied: If user is not moderator/admin
        ValidationError: If transition is invalid or notes missing
    """
    _require_moderator(moderator)
    
    if not resolution_notes or len(resolution_notes.strip()) < 10:
        raise ValidationError("Rejection notes required (minimum 10 characters).")
    
    try:
        dispute.reject(resolved_by=moderator, resolution_notes=resolution_notes)
    except ValidationError as e:
        logger.error(
            f"DISPUTE_REJECTION_FAILED: dispute_id={dispute.id}, "
            f"moderator_id={moderator.id}, error={str(e)}"
        )
        raise
    
    # Create audit log
    AuditLog.objects.create(
        actor=moderator,
        action='DISPUTE_REJECTED',
        target_entity=f'Dispute:{dispute.id}',
        changes={
            'old_status': 'INVESTIGATING',
            'new_status': 'REJECTED',
            'resolution_notes': resolution_notes[:500]
        },
        reason=resolution_notes
    )
    
    logger.info(
        f"DISPUTE_REJECTED: dispute_id={dispute.id}, job_id={dispute.job_id}, "
        f"moderator_id={moderator.id}"
    )
    
    return dispute


def get_dispute_by_id(dispute_id: int) -> Dispute:
    """
    Get dispute by ID. Raises DoesNotExist if not found.
    """
    return Dispute.objects.select_related('job', 'opened_by', 'resolved_by').get(id=dispute_id)


def get_active_disputes() -> list[Dispute]:
    """
    Get all active disputes (OPEN or INVESTIGATING).
    For moderator dashboard.
    """
    return list(
        Dispute.objects.filter(
            status__in=Dispute.ACTIVE_STATUSES
        ).select_related('job', 'opened_by').order_by('-created_at')
    )


def get_user_disputes(user) -> list[Dispute]:
    """
    Get all disputes filed by a user.
    """
    return list(
        Dispute.objects.filter(
            opened_by=user
        ).select_related('job').order_by('-created_at')
    )
