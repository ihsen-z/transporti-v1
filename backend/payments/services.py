"""
Payment Services - Transporti V1
Domain logic for escrow, commission tracking, and financial operations.

CRITICAL RULES:
- All functions are SYSTEM-ONLY (no direct user calls)
- All financial operations are atomic
- All admin actions require audit trail
- No negative amounts allowed
- Escrow is immutable after RELEASED
- Commission rates from settings.COMMISSION_RATES (single source of truth)
"""
import logging
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from .models import EscrowTransaction, CommissionLedger
from logistics.models import TransportJob, Offer
from support.models import AuditLog

# Logger for payment operations
logger = logging.getLogger('payments')


def get_commission_rate(job_type: str) -> Decimal:
    """
    Get commission rate from settings (single source of truth).
    Falls back to DEFAULT rate if job type not found.
    """
    rates = getattr(settings, 'COMMISSION_RATES', {'DEFAULT': 0.12})
    rate = rates.get(job_type, rates.get('DEFAULT', 0.12))
    return Decimal(str(rate))


def calculate_commission(job_type: str, total_price: Decimal) -> tuple[Decimal, Decimal]:
    """
    Calculate commission and net amount for a job.
    Uses settings.COMMISSION_RATES as single source of truth.
    
    Args:
        job_type: Type of job (TRANSPORT, MOVING, etc.)
        total_price: Total price of the job
    
    Returns:
        Tuple of (commission_amount, net_amount)
    """
    rate = get_commission_rate(job_type)
    commission = total_price * rate
    net = total_price - commission
    
    logger.debug(f"Commission calculated: job_type={job_type}, rate={rate}, total={total_price}, commission={commission}, net={net}")
    
    return commission, net


@transaction.atomic
def create_escrow_on_booking(job: TransportJob, offer: Offer, gateway_ref: str = None) -> EscrowTransaction:
    """
    Creates HELD escrow when client accepts an offer (digital payment).
    
    TRUST GUARD: Transporter must be VERIFIED.
    
    Args:
        job: The transport job
        offer: The accepted offer
        gateway_ref: External payment gateway reference
    
    Returns:
        EscrowTransaction in HELD status
    
    Raises:
        ValueError: If job already has escrow, invalid state, or trust check fails
    """
    from trust.models import TrustProfile, VerificationStatus
    from trust.services_admin import has_active_override
    
    # === TRUST GUARD: Escrow requires VERIFIED transporter (override supported) ===
    transporter = offer.transporter
    try:
        trust_profile = TrustProfile.objects.get(user=transporter)
        if trust_profile.verification_status != VerificationStatus.VERIFIED:
            # Check for ESCROW override
            if has_active_override(transporter, 'ESCROW'):
                logger.info(
                    f"TRUST_ESCROW_OVERRIDE: job_id={job.id}, transporter_id={transporter.id}, "
                    f"status={trust_profile.verification_status}"
                )
            else:
                logger.error(
                    f"TRUST_ESCROW_BLOCKED: job_id={job.id}, transporter_id={transporter.id}, "
                    f"status={trust_profile.verification_status}"
                )
                raise ValueError(
                    f"Escrow blocked: Transporter not verified (status: {trust_profile.verification_status})"
                )
        else:
            logger.info(
                f"TRUST_PAYMENT_ALLOWED: type=escrow, job_id={job.id}, "
                f"transporter_id={transporter.id}, trust_score={trust_profile.trust_score}"
            )
    except TrustProfile.DoesNotExist:
        # Check for override even without profile
        if has_active_override(transporter, 'ESCROW'):
            logger.info(
                f"TRUST_ESCROW_OVERRIDE: job_id={job.id}, transporter_id={transporter.id}, "
                f"reason=no_profile_but_override"
            )
        else:
            logger.error(
                f"TRUST_ESCROW_BLOCKED: job_id={job.id}, transporter_id={transporter.id}, "
                f"reason=no_trust_profile"
            )
            raise ValueError("Escrow blocked: Transporter has no trust profile")
    
    # State validation
    if job.status != TransportJob.Status.IN_PROGRESS:
        logger.warning(f"Escrow creation rejected: job {job.id} in invalid status {job.status}")
        raise ValueError(f"Cannot create escrow for job in status: {job.status}")
    
    if EscrowTransaction.objects.filter(booking_reference=job).exists():
        logger.warning(f"Escrow creation rejected: duplicate for job {job.id}")
        raise ValueError(f"Escrow already exists for job {job.id}")
    
    # Create escrow
    escrow = EscrowTransaction.objects.create(
        booking_reference=job,
        status=EscrowTransaction.Status.HELD,
        amount=offer.total_price,
        gateway_reference=gateway_ref or f"MOCK-{job.id}-{timezone.now().timestamp()}"
    )
    
    logger.info(f"ESCROW_CREATED: escrow_id={escrow.id}, job_id={job.id}, amount={offer.total_price}")
    
    return escrow


@transaction.atomic
def release_escrow_on_completion(
    job: TransportJob, 
    admin_user=None, 
    reason: str = "Job completed successfully"
) -> EscrowTransaction:
    """
    Releases escrow to transporter.
    Can be triggered by:
    - Client confirmation
    - Auto-release after 48h
    - Admin override
    
    Args:
        job: The completed job
        admin_user: Admin user if manual release (optional)
        reason: Audit reason
    
    Returns:
        Updated EscrowTransaction in RELEASED status
    
    Raises:
        ValueError: If escrow not found, already released, or blocked by dispute
    """
    # Get escrow
    try:
        escrow = EscrowTransaction.objects.select_for_update().get(booking_reference=job)
    except EscrowTransaction.DoesNotExist:
        logger.error(f"Escrow release failed: no escrow for job {job.id}")
        raise ValueError(f"No escrow found for job {job.id}")
    
    # Validate state
    if escrow.status == EscrowTransaction.Status.RELEASED:
        logger.warning(f"Escrow release rejected: escrow {escrow.id} already released")
        raise ValueError(f"Escrow {escrow.id} already released")
    
    if escrow.status != EscrowTransaction.Status.HELD:
        logger.warning(f"Escrow release rejected: escrow {escrow.id} in invalid status {escrow.status}")
        raise ValueError(f"Cannot release escrow in status: {escrow.status}")
    
    # Check for active disputes - HARD BLOCK on escrow release
    active_dispute = job.disputes.filter(status__in=['OPEN', 'INVESTIGATING']).first()
    if active_dispute:
        logger.error(
            f"ESCROW_BLOCKED_DUE_TO_DISPUTE: escrow_id={escrow.id}, job_id={job.id}, "
            f"dispute_id={active_dispute.id}, dispute_status={active_dispute.status}"
        )
        raise ValueError(
            f"Escrow release BLOCKED: Job {job.id} has active dispute #{active_dispute.id} "
            f"(status: {active_dispute.status}). Resolve dispute before releasing escrow."
        )
    
    # Release escrow
    escrow.status = EscrowTransaction.Status.RELEASED
    escrow.save()
    
    # Create audit log
    AuditLog.objects.create(
        actor=admin_user,
        action='ESCROW_RELEASED',
        target_entity=f'EscrowTransaction:{escrow.id}',
        changes={'old': 'HELD', 'new': 'RELEASED'},
        reason=reason
    )
    
    logger.info(f"ESCROW_RELEASED: escrow_id={escrow.id}, job_id={job.id}, by={'admin:'+str(admin_user.id) if admin_user else 'system'}")
    
    return escrow


@transaction.atomic
def create_commission_debt_on_cod(job: TransportJob, offer: Offer) -> CommissionLedger:
    """
    Creates commission debt entry when COD job is completed.
    Transporter owes platform the commission amount.
    
    TRUST GUARD: Transporter must meet minimum trust score for COD.
    
    Args:
        job: The completed COD job
        offer: The accepted offer
    
    Returns:
        CommissionLedger entry (unsettled)
    
    Raises:
        ValueError: If ledger entry already exists or trust check fails
    """
    from trust.models import TrustProfile, VerificationStatus
    from trust.services_admin import has_active_override
    from django.conf import settings
    
    # === TRUST GUARD: COD requires minimum trust score (override supported) ===
    COD_MIN_TRUST_SCORE = getattr(settings, 'COD_MIN_TRUST_SCORE', 50)
    transporter = offer.transporter
    
    try:
        trust_profile = TrustProfile.objects.get(user=transporter)
        
        # Must be verified (or have override)
        if trust_profile.verification_status != VerificationStatus.VERIFIED:
            if has_active_override(transporter, 'COD'):
                logger.info(
                    f"TRUST_COD_OVERRIDE: job_id={job.id}, transporter_id={transporter.id}, "
                    f"reason=not_verified, status={trust_profile.verification_status}"
                )
            else:
                logger.error(
                    f"TRUST_COD_BLOCKED: job_id={job.id}, transporter_id={transporter.id}, "
                    f"reason=not_verified, status={trust_profile.verification_status}"
                )
                raise ValueError(
                    f"COD blocked: Transporter not verified"
                )
        
        # Must meet minimum score (or have override)
        elif trust_profile.trust_score < COD_MIN_TRUST_SCORE:
            if has_active_override(transporter, 'COD'):
                logger.info(
                    f"TRUST_COD_OVERRIDE: job_id={job.id}, transporter_id={transporter.id}, "
                    f"reason=low_score, score={trust_profile.trust_score}, required={COD_MIN_TRUST_SCORE}"
                )
            else:
                logger.error(
                    f"TRUST_COD_BLOCKED: job_id={job.id}, transporter_id={transporter.id}, "
                    f"reason=low_score, score={trust_profile.trust_score}, required={COD_MIN_TRUST_SCORE}"
                )
                raise ValueError(
                    f"COD blocked: Trust score {trust_profile.trust_score} below required {COD_MIN_TRUST_SCORE}"
                )
        else:
            logger.info(
                f"TRUST_PAYMENT_ALLOWED: type=cod, job_id={job.id}, "
                f"transporter_id={transporter.id}, trust_score={trust_profile.trust_score}"
            )
    except TrustProfile.DoesNotExist:
        if has_active_override(transporter, 'COD'):
            logger.info(
                f"TRUST_COD_OVERRIDE: job_id={job.id}, transporter_id={transporter.id}, "
                f"reason=no_profile_but_override"
            )
        else:
            logger.error(
                f"TRUST_COD_BLOCKED: job_id={job.id}, transporter_id={transporter.id}, "
                f"reason=no_trust_profile"
            )
            raise ValueError("COD blocked: Transporter has no trust profile")
    
    # Validation
    if CommissionLedger.objects.filter(job_reference=job).exists():
        logger.warning(f"Commission debt creation rejected: duplicate for job {job.id}")
        raise ValueError(f"Commission ledger already exists for job {job.id}")
    
    # Validate commission amount matches expected
    expected_commission, _ = calculate_commission(job.job_type, offer.total_price)
    if offer.commission_amount != expected_commission:
        logger.error(f"Commission mismatch detected: job={job.id}, expected={expected_commission}, actual={offer.commission_amount}")
    
    # Get transporter from offer
    transporter = offer.transporter
    
    # Create debt entry
    ledger = CommissionLedger.objects.create(
        transporter=transporter,
        job_reference=job,
        amount=offer.commission_amount,
        is_settled=False
    )
    
    # Create audit log
    AuditLog.objects.create(
        actor=None,  # System action
        action='COMMISSION_DEBT_CREATED',
        target_entity=f'CommissionLedger:{ledger.id}',
        changes={'amount': str(offer.commission_amount), 'transporter': transporter.id},
        reason=f'COD job {job.id} completed'
    )
    
    logger.info(f"COMMISSION_DEBT_CREATED: ledger_id={ledger.id}, job_id={job.id}, transporter_id={transporter.id}, amount={offer.commission_amount}")
    
    return ledger


@transaction.atomic
def settle_commission_debt(ledger_id: int, admin_user, reason: str) -> CommissionLedger:
    """
    Admin-only: Marks commission debt as settled.
    
    Args:
        ledger_id: CommissionLedger ID
        admin_user: Admin performing the action
        reason: Audit reason (required)
    
    Returns:
        Updated CommissionLedger (settled)
    
    Raises:
        ValueError: If already settled or not found
    """
    # Get ledger entry
    try:
        ledger = CommissionLedger.objects.select_for_update().get(id=ledger_id)
    except CommissionLedger.DoesNotExist:
        logger.error(f"Commission settlement failed: ledger {ledger_id} not found")
        raise ValueError(f"Commission ledger {ledger_id} not found")
    
    # Validate
    if ledger.is_settled:
        logger.warning(f"Commission settlement rejected: ledger {ledger_id} already settled")
        raise ValueError(f"Commission ledger {ledger_id} already settled")
    
    if not reason or len(reason.strip()) < 10:
        logger.warning(f"Commission settlement rejected: insufficient reason")
        raise ValueError("Audit reason required (min 10 characters)")
    
    # Settle
    ledger.is_settled = True
    ledger.settled_at = timezone.now()
    ledger.save()
    
    # Create audit log
    AuditLog.objects.create(
        actor=admin_user,
        action='COMMISSION_DEBT_SETTLED',
        target_entity=f'CommissionLedger:{ledger.id}',
        changes={'old': 'unsettled', 'new': 'settled'},
        reason=reason
    )
    
    logger.info(f"COMMISSION_DEBT_SETTLED: ledger_id={ledger.id}, admin_id={admin_user.id}, amount={ledger.amount}")
    
    return ledger


def get_escrow_eligible_for_auto_release() -> list[EscrowTransaction]:
    """
    Finds escrow transactions eligible for auto-release:
    - Status = HELD
    - Job status = COMPLETED
    - Created > 48h ago
    - No active disputes
    
    Returns:
        List of EscrowTransaction objects
    """
    cutoff_time = timezone.now() - timedelta(hours=48)
    
    eligible = EscrowTransaction.objects.filter(
        status=EscrowTransaction.Status.HELD,
        created_at__lt=cutoff_time,
        booking_reference__status=TransportJob.Status.COMPLETED
    ).exclude(
        booking_reference__disputes__status__in=['OPEN', 'INVESTIGATING']
    )
    
    logger.debug(f"Found {eligible.count()} escrow entries eligible for auto-release")
    
    return list(eligible)
