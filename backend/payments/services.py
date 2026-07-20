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
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta

from .models import EscrowTransaction, CommissionLedger
from logistics.models import TransportJob, Offer
from support.models import AuditLog

# Logger for payment operations
logger = logging.getLogger('payments')


def get_commission_rate(job_type: str, is_return_trip: bool = False) -> Decimal:
    """
    Get commission rate from settings (single source of truth).

    D13 (pivot): missions born from a return trip use the incentive
    RETURN_TRIP rate, whatever their job_type.
    Falls back to DEFAULT rate if job type not found.
    """
    rates = getattr(settings, 'COMMISSION_RATES', {'DEFAULT': 0.12})
    if is_return_trip and 'RETURN_TRIP' in rates:
        return Decimal(str(rates['RETURN_TRIP']))
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


TWO_PLACES = Decimal('0.01')


def calculate_from_net(job_type: str, price_net: Decimal, is_return_trip: bool = False) -> tuple[Decimal, Decimal]:
    """
    Net-guaranteed model (decision D1): the transporter's input IS the net
    they receive. Commission is added on top; the client pays net + commission.

    Args:
        job_type: Type of job (TRANSPORT, MOVING, etc.)
        price_net: Amount the transporter receives (as entered by them)
        is_return_trip: D13 — applies the incentive RETURN_TRIP rate

    Returns:
        Tuple of (commission_amount, total_price)
    """
    rate = get_commission_rate(job_type, is_return_trip)
    net = Decimal(str(price_net)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    commission = (net * rate).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    total = net + commission

    logger.debug(f"Commission from net: job_type={job_type}, rate={rate}, net={net}, commission={commission}, total={total}")

    return commission, total


@transaction.atomic
def refund_escrow(job: TransportJob, reason: str = "") -> 'EscrowTransaction | None':
    """
    Refund the active escrow of a job (cancellation flows).

    HELD/INITIATED → REFUNDED. RELEASED is immutable — never refundable here.
    Returns the refunded escrow, or None if the job has no refundable escrow.
    """
    escrow = EscrowTransaction.objects.select_for_update().filter(
        booking_reference=job,
        status__in=[EscrowTransaction.Status.HELD, EscrowTransaction.Status.INITIATED],
    ).first()
    if not escrow:
        return None

    escrow.status = EscrowTransaction.Status.REFUNDED
    escrow.save()

    AuditLog.objects.create(
        actor=None,
        action='ESCROW_REFUNDED',
        target_entity=f'EscrowTransaction:{escrow.id}',
        changes={'old': 'HELD', 'new': 'REFUNDED'},
        reason=reason or f'Escrow refunded for job {job.id}',
    )
    logger.info(f"ESCROW_REFUNDED: escrow_id={escrow.id}, job_id={job.id}, reason={reason}")

    # Notify the client (best effort)
    try:
        from notifications.services import notify_escrow_refunded
        notify_escrow_refunded(escrow)
    except Exception:
        pass

    return escrow


@transaction.atomic
def activate_job_on_payment(escrow: EscrowTransaction) -> bool:
    """
    D3 (escrow strict): once the escrow is HELD, move the job MATCHED → IN_PROGRESS.

    Returns True if the transition happened.
    """
    job = TransportJob.objects.select_for_update().get(id=escrow.booking_reference_id)
    if job.status != TransportJob.Status.MATCHED:
        return False

    job.status = TransportJob.Status.IN_PROGRESS
    job.save()
    logger.info(f"JOB_ACTIVATED_ON_PAYMENT: job_id={job.id}, escrow_id={escrow.id}")

    # System message + notifications (best effort)
    try:
        from messaging.services import get_or_create_conversation, send_system_message
        get_or_create_conversation(job)
        send_system_message(
            job,
            "💳 Paiement sécurisé reçu — la mission peut démarrer.\n"
            "Le montant est séquestré et sera libéré après confirmation de la livraison.",
            actor=None,
        )
    except Exception:
        pass

    try:
        from notifications.services import notify
        accepted = job.offers.filter(status='ACCEPTED').select_related('transporter').first()
        if accepted:
            notify(
                user=accepted.transporter,
                notification_type='ESCROW_HELD',
                title='Paiement sécurisé — mission démarrée',
                message=f'Le client a payé. La mission #{job.id} est maintenant en cours.',
                metadata={'job_id': job.id},
            )
    except Exception:
        pass

    return True


def get_wallet_summary(transporter) -> dict:
    """
    Transporter wallet figures (DICTIONNAIRE_KPI K10/K11) — single source of truth.

    - released_net: Σ price_net of the transporter's ACCEPTED offers whose job
      has a RELEASED escrow (money actually earned through the platform)
    - pending_net: same but escrow still HELD (delivered/being delivered,
      awaiting confirmation or auto-release)
    - cod_debt: Σ unsettled CommissionLedger (commission owed on cash jobs)
    - withdrawals_total: Σ non-rejected withdrawal requests
    - available: released_net − withdrawals_total − cod_debt (compensation)
    """
    from django.db.models import Sum, F
    from .models import WithdrawalRequest

    accepted = Offer.objects.filter(transporter=transporter, status='ACCEPTED')

    released_net = accepted.filter(
        job__escrow_transactions__status=EscrowTransaction.Status.RELEASED
    ).aggregate(total=Sum('price_net'))['total'] or Decimal('0')

    pending_net = accepted.filter(
        job__escrow_transactions__status=EscrowTransaction.Status.HELD
    ).aggregate(total=Sum('price_net'))['total'] or Decimal('0')

    cod_debt = CommissionLedger.objects.filter(
        transporter=transporter, is_settled=False
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

    withdrawals_total = WithdrawalRequest.objects.filter(
        transporter=transporter
    ).exclude(status=WithdrawalRequest.Status.REJECTED).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')

    available = released_net - withdrawals_total - cod_debt

    return {
        'released_net': released_net,
        'pending_net': pending_net,
        'cod_debt': cod_debt,
        'withdrawals_total': withdrawals_total,
        'available': available,
    }


def derive_net_from_total(job_type: str, total_price: Decimal, is_return_trip: bool = False) -> tuple[Decimal, Decimal]:
    """
    Inverse of the net-guaranteed model, for flows where the CLIENT-facing
    total is the input (counter-offer acceptance, return-trip booking).
    Preserves the invariant commission == net × rate (within rounding).

    Args:
        job_type: Type of job (TRANSPORT, MOVING, etc.)
        total_price: Price the client pays
        is_return_trip: D13 — applies the incentive RETURN_TRIP rate

    Returns:
        Tuple of (commission_amount, price_net)
    """
    rate = get_commission_rate(job_type, is_return_trip)
    total = Decimal(str(total_price)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    net = (total / (Decimal('1') + rate)).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    commission = total - net

    logger.debug(f"Net derived from total: job_type={job_type}, rate={rate}, total={total}, net={net}, commission={commission}")

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
